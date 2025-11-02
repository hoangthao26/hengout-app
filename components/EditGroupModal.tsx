import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { chatService } from '../services/chatService';
import { CloudinaryService } from '../services/cloudinaryService';
import { useChatStore } from '../store/chatStore';
import GradientButton from './GradientButton';

interface EditGroupModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conversationId: string;
    currentName: string;
    currentAvatar?: string;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
    conversationId,
    currentName,
    currentAvatar,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    const { updateConversation } = useChatStore();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [groupName, setGroupName] = useState(currentName);
    const [groupAvatar, setGroupAvatar] = useState(currentAvatar || '');
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['90%', '90%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setTimeout(() => {
                onClose();
            }, 100);
        }
    }, [onClose]);

    // Open/close effect
    React.useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
            setGroupName(currentName);
            setGroupAvatar(currentAvatar || '');
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible, currentName, currentAvatar]);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isVisible) {
            setGroupName(currentName);
            setGroupAvatar(currentAvatar || '');
        }
    }, [isVisible, currentName, currentAvatar]);

    // Custom backdrop
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    // Ensure square image
    const ensureSquareImage = useCallback(async (imageUri: string): Promise<string> => {
        try {
            const imageInfo = await ImageManipulator.manipulateAsync(
                imageUri,
                [],
                { format: ImageManipulator.SaveFormat.JPEG }
            );

            const TARGET_SIZE = 1024;
            let manipulations = [];

            // If not square, crop to square first
            if (imageInfo.width !== imageInfo.height) {
                const size = Math.min(imageInfo.width, imageInfo.height);
                const x = (imageInfo.width - size) / 2;
                const y = (imageInfo.height - size) / 2;

                manipulations.push({
                    crop: {
                        originX: x,
                        originY: y,
                        width: size,
                        height: size,
                    },
                });
            }

            // Always resize to target size for consistency
            manipulations.push({
                resize: {
                    width: TARGET_SIZE,
                    height: TARGET_SIZE,
                },
            });

            // Apply all manipulations
            const processedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                manipulations,
                {
                    format: ImageManipulator.SaveFormat.JPEG,
                    compress: 0.8,
                }
            );

            return processedImage.uri;
        } catch (error) {
            console.error('[EditGroupModal] Error ensuring square image:', error);
            // Return original if manipulation fails
            return imageUri;
        }
    }, []);

    // Pick image from gallery
    const pickImageFromGallery = useCallback(async () => {
        try {
            const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
            let finalStatus = currentStatus;

            // Request permission if not already granted
            if (currentStatus !== 'granted') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                showError('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền truy cập thư viện ảnh trong Cài đặt.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1.0,
                allowsEditing: true,
                aspect: [1, 1],
                base64: false,
                exif: false,
                selectionLimit: 1,
                allowsMultipleSelection: false,
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                await uploadImage(asset.uri);
            }
        } catch (error: any) {
            console.error('[EditGroupModal] Error picking image:', error);
            showError('Lỗi chọn ảnh', `Không thể chọn ảnh: ${error.message}`);
        }
    }, [showError]);

    // Take photo with camera
    const takePhoto = useCallback(async () => {
        try {
            // Check current permission status first
            const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();

            let finalStatus = currentStatus;

            // Request permission if not already granted
            if (currentStatus !== 'granted') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                showError('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền truy cập camera trong Cài đặt.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 1.0, // Maximum quality for better crop results
                allowsEditing: true, // Use built-in crop
                aspect: [1, 1], // Square crop
                base64: false, // Not needed for our use case
                exif: false, // Remove EXIF data for privacy
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                // Process and set image
                await uploadImage(asset.uri);
            }
        } catch (error: any) {
            console.error('[EditGroupModal] Error taking photo:', error);
            showError('Lỗi chụp ảnh', `Không thể chụp ảnh: ${error.message}`);
        }
    }, [showError, uploadImage]);

    // Upload image to cloudinary
    const uploadImage = useCallback(async (imageUri: string) => {
        try {
            setUploadingAvatar(true);

            // Ensure image is square before upload
            const squareImageUri = await ensureSquareImage(imageUri);

            // Upload to cloudinary
            const avatarUrl = await CloudinaryService.uploadImage(squareImageUri);

            // Set the new avatar URL
            setGroupAvatar(avatarUrl);
        } catch (error: any) {
            console.error('[EditGroupModal] Failed to upload avatar:', error);
            showError('Lỗi cập nhật ảnh đại diện', `Không thể cập nhật ảnh đại diện: ${error.message}`);
        } finally {
            setUploadingAvatar(false);
        }
    }, [ensureSquareImage, showError, showSuccess]);

    // Handle avatar selection
    const handleAvatarSelect = useCallback(async () => {
        Alert.alert(
            'Chọn ảnh đại diện',
            'Bạn muốn chọn ảnh từ đâu?',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Thư viện ảnh',
                    onPress: pickImageFromGallery,
                },
                {
                    text: 'Chụp ảnh',
                    onPress: takePhoto,
                },
            ]
        );
    }, [pickImageFromGallery, takePhoto]);

    // Handle remove avatar
    const handleRemoveAvatar = useCallback(() => {
        setGroupAvatar('');
    }, []);

    // Handle update group
    const handleUpdateGroup = useCallback(async () => {
        if (!groupName.trim()) {
            showError('Vui lòng nhập tên nhóm');
            return;
        }

        setUpdating(true);
        try {
            // Update group name if changed
            if (groupName.trim() !== currentName) {
                await chatService.updateConversationName(conversationId, { name: groupName.trim() });
                // Update store immediately
                updateConversation(conversationId, { name: groupName.trim() });
            }

            // Update group avatar if changed
            if (groupAvatar !== currentAvatar) {
                await chatService.updateConversationAvatar(conversationId, { avatarUrl: groupAvatar });
                // Update store immediately
                updateConversation(conversationId, { avatarUrl: groupAvatar });
            }

            showSuccess('Đã cập nhật thông tin nhóm');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('[EditGroupModal] Failed to update group:', err);
            showError('Lỗi khi cập nhật thông tin nhóm');
        } finally {
            setUpdating(false);
        }
    }, [groupName, groupAvatar, currentName, currentAvatar, conversationId, showError, showSuccess, onSuccess, onClose]);

    if (!isVisible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
        >
            <BottomSheetView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={updating}
                        style={styles.headerButton}
                    >
                        <Text style={[
                            styles.cancelText,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            Hủy
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <Text style={[
                            styles.title,
                            { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}>
                            Đổi tên hoặc ảnh
                        </Text>
                    </View>

                    <GradientButton
                        title={updating ? "Đang lưu..." : "Lưu"}
                        onPress={handleUpdateGroup}
                        disabled={updating || !groupName.trim()}
                        size="medium"
                        fullWidth={false}
                        minWidth={70}
                    />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={handleAvatarSelect}
                            activeOpacity={0.7}
                            disabled={uploadingAvatar}
                        >
                            {uploadingAvatar ? (
                                <View style={[styles.defaultAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                    <ActivityIndicator size="large" color="#F48C06" />
                                </View>
                            ) : groupAvatar ? (
                                <View style={styles.avatarWrapper}>
                                    <Image
                                        source={{ uri: groupAvatar }}
                                        style={styles.avatar}
                                        resizeMode="contain"
                                    />
                                    <TouchableOpacity
                                        style={styles.removeAvatarButton}
                                        onPress={handleRemoveAvatar}
                                    >
                                        <X size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={[styles.defaultAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                    <ImageIcon size={50} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.changeAvatarButton}
                            onPress={handleAvatarSelect}
                            disabled={uploadingAvatar}
                        >
                            <Camera size={16} color="#F48C06" />
                            <Text style={styles.changeAvatarText}>
                                {uploadingAvatar ? 'Đang tải lên...' : 'Thay đổi ảnh'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Name Input Section */}
                    <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Tên nhóm
                        </Text>
                        <TextInput
                            style={[
                                styles.nameInput,
                                {
                                    backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                    color: isDark ? '#FFFFFF' : '#000000',
                                    borderColor: isDark ? '#4B5563' : '#D1D5DB',
                                }
                            ]}
                            placeholder="Nhập tên nhóm..."
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            value={groupName}
                            onChangeText={setGroupName}
                            maxLength={50}
                            editable={!updating}
                        />
                        <Text style={[styles.characterCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {groupName.length}/50
                        </Text>
                    </View>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 8,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '500',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        paddingVertical: 32,
        justifyContent: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    removeAvatarButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    changeAvatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(244, 140, 6, 0.1)',
    },
    changeAvatarText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#F48C06',
        marginLeft: 6,
    },
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    nameInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 4,
    },
    characterCount: {
        fontSize: 12,
        textAlign: 'right',
    },
});

export default EditGroupModal;
