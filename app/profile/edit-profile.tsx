import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, ChevronRight, Eye, Images, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';
import { useProfileStore, useUIStore } from '../../store';

export default function EditProfileScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { error: showError, success: showSuccess } = useToast();
    const router = useRouter();

    // Zustand stores
    const { profile, isLoading, isUpdating, fetchProfile, refreshProfile, uploadAvatar } = useProfileStore();
    const { showModal, hideModal, modal } = useUIStore();

    const [loading, setLoading] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    useFocusEffect(
        useCallback(() => {
            // Only load profile if we don't have data yet
            const currentProfile = useProfileStore.getState().profile;
            if (!currentProfile) {
                loadProfile();
            }
            // Close modal when returning from crop screen
            setShowAvatarModal(false);
        }, [])
    );


    const pickImageFromGallery = async () => {
        try {
            console.log('📸 Starting gallery picker...');

            // Check current permission status first
            const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
            console.log('📸 Current permission status:', currentStatus);

            let finalStatus = currentStatus;

            // Request permission if not already granted
            if (currentStatus !== 'granted') {
                console.log('📸 Requesting gallery permissions...');
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                finalStatus = status;
                console.log('📸 Permission request result:', status);
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Permission denied');
                showError('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền truy cập thư viện ảnh trong Cài đặt.');
                return;
            }

            console.log('📸 Opening image library...');
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1.0, // Maximum quality for better crop results
                allowsEditing: true, // Use built-in crop
                aspect: [1, 1], // Square crop
                base64: false, // Not needed for our use case
                exif: false, // Remove EXIF data for privacy
                selectionLimit: 1, // Single image selection
                allowsMultipleSelection: false, // Single selection only
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
            });

            console.log('📸 Full result:', JSON.stringify(result, null, 2));

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                console.log('📸 Image selected:', asset.uri);
                console.log('📸 Image dimensions:', `${asset.width}x${asset.height}`);
                console.log('📸 Image type:', asset.type);
                // Close modal and upload directly
                setShowAvatarModal(false);
                await uploadImage(asset.uri);
            } else {
                console.log('📸 Image picker canceled or no assets');
            }
        } catch (error: any) {
            console.error('❌ Error picking image:', error);
            console.error('❌ Error stack:', error.stack);
            showError('Lỗi chọn ảnh', `Không thể chọn ảnh: ${error.message}`);
        }
    };

    const takePhoto = async () => {
        try {
            console.log('📷 Starting camera...');

            // Check current permission status first
            const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
            console.log('📷 Current permission status:', currentStatus);

            let finalStatus = currentStatus;

            // Request permission if not already granted
            if (currentStatus !== 'granted') {
                console.log('📷 Requesting camera permissions...');
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                finalStatus = status;
                console.log('📷 Permission request result:', status);
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Permission denied');
                showError('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền truy cập camera trong Cài đặt.');
                return;
            }

            console.log('📷 Opening camera...');
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 1.0, // Maximum quality for better crop results
                allowsEditing: true, // Use built-in crop
                aspect: [1, 1], // Square crop
                base64: false, // Not needed for our use case
                exif: false, // Remove EXIF data for privacy
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
            });

            console.log('📷 Full result:', JSON.stringify(result, null, 2));

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                console.log('📷 Photo taken:', asset.uri);
                console.log('📷 Photo dimensions:', `${asset.width}x${asset.height}`);
                console.log('📷 Photo type:', asset.type);
                // Close modal and upload directly
                setShowAvatarModal(false);
                await uploadImage(asset.uri);
            } else {
                console.log('📷 Camera canceled or no assets');
            }
        } catch (error: any) {
            console.error('❌ Error taking photo:', error);
            console.error('❌ Error stack:', error.stack);
            showError('Lỗi chụp ảnh', `Không thể chụp ảnh: ${error.message}`);
        }
    };

    const ensureSquareImage = async (imageUri: string): Promise<string> => {
        try {
            console.log('Ensuring square image for:', imageUri);

            // Get image info first
            const imageInfo = await ImageManipulator.manipulateAsync(
                imageUri,
                [],
                { format: ImageManipulator.SaveFormat.JPEG }
            );

            console.log('Original dimensions:', `${imageInfo.width}x${imageInfo.height}`);

            // Target size for all avatars
            const TARGET_SIZE = 1024;

            let manipulations = [];

            // If not square, crop to square first
            if (imageInfo.width !== imageInfo.height) {
                const size = Math.min(imageInfo.width, imageInfo.height);
                const x = (imageInfo.width - size) / 2;
                const y = (imageInfo.height - size) / 2;

                console.log('Cropping to square:', `${size}x${size} from (${x}, ${y})`);

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
            console.log('Resizing to standard size:', `${TARGET_SIZE}x${TARGET_SIZE}`);
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

            console.log('Final dimensions:', `${processedImage.width}x${processedImage.height}`);
            return processedImage.uri;
        } catch (error) {
            console.error('❌ Error ensuring square image:', error);
            // Return original if manipulation fails
            return imageUri;
        }
    };

    const uploadImage = async (imageUri: string) => {
        try {
            console.log('☁️ Starting image upload for:', imageUri);
            setUploadingAvatar(true);

            // Ensure image is square before upload
            const squareImageUri = await ensureSquareImage(imageUri);
            console.log('☁️ Using square image for upload:', squareImageUri);

            // Use Zustand store instead of direct API calls
            await uploadAvatar(squareImageUri);

            console.log('✅ Profile update successful');
            showSuccess('Thành công', 'Đã cập nhật ảnh đại diện!');
        } catch (error: any) {
            console.error('❌ Failed to upload avatar:', error);
            console.error('❌ Error details:', error.message);
            showError('Lỗi cập nhật ảnh đại diện', `Không thể cập nhật ảnh đại diện: ${error.message}`);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarActionPress = async (action: string) => {
        console.log('Action pressed:', action);

        try {
            console.log('Starting action:', action);
            switch (action) {
                case 'camera':
                    console.log('Taking photo...');
                    // Don't close modal yet, let crop screen handle it
                    await takePhoto();
                    break;
                case 'gallery':
                    console.log('Picking from gallery...');
                    // Don't close modal yet, let crop screen handle it
                    await pickImageFromGallery();
                    break;
                case 'view':
                    console.log('Viewing avatar...');
                    setShowAvatarModal(false);
                    if (profile?.avatarUrl) {
                        setShowImageViewer(true);
                    } else {
                        showSuccess('Thông báo', 'Chưa có ảnh đại diện');
                    }
                    break;
            }
            console.log('✅ Action completed:', action);
        } catch (error) {
            console.error('❌ Error in action handler:', error);
            showError('Lỗi', 'Đã xảy ra lỗi. Vui lòng thử lại.');
            // Close modal on error
            setShowAvatarModal(false);
        }
    };

    const loadProfile = async () => {
        try {
            setLoading(true);

            // Get profile from store first
            const currentProfile = useProfileStore.getState().profile;

            if (!currentProfile) {
                // Only fetch if profile doesn't exist
                await fetchProfile();
            }
        } catch (error: any) {
            console.error('Failed to load profile:', error);
            showError('Lỗi tải hồ sơ', 'Không thể tải thông tin hồ sơ');
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <View style={styles.loadingContainer}>
                    <User
                        size={80}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title="Chỉnh sửa hồ sơ"
                onBackPress={() => router.back()}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => setShowAvatarModal(true)}
                            onLongPress={() => {
                                if (profile?.avatarUrl) {
                                    setShowImageViewer(true);
                                } else {
                                    showSuccess('Thông báo', 'Chưa có ảnh đại diện');
                                }
                            }}
                            disabled={uploadingAvatar}
                        >
                            {profile?.avatarUrl ? (
                                <Image
                                    source={{ uri: profile.avatarUrl }}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                    <Camera
                                        size={40}
                                        color={isDark ? '#9CA3AF' : '#6B7280'}
                                    />
                                </View>
                            )}
                            {uploadingAvatar && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator
                                        size="large"
                                        color="#FFFFFF"
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.changePhotoButton}
                            onPress={() => {
                                console.log('Change photo button pressed');
                                console.log('Current showAvatarModal:', showAvatarModal);
                                setShowAvatarModal(true);
                                console.log('Set showAvatarModal to true');
                            }}
                            disabled={uploadingAvatar}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.changePhotoText,
                                {
                                    color: uploadingAvatar
                                        ? (isDark ? '#6B7280' : '#9CA3AF')
                                        : (isDark ? '#FFFFFF' : '#000000')
                                }
                            ]}>
                                Thay đổi ảnh
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Profile Information Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Thông tin cá nhân
                        </Text>

                        {/* Display Name */}
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => NavigationService.goToEditName()}
                        >
                            <Text style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Tên
                            </Text>
                            <View style={styles.fieldValue}>
                                <Text style={[styles.fieldText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {profile?.displayName || 'Nhập tên của bạn'}
                                </Text>
                                <ChevronRight
                                    size={20}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Gender */}
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => NavigationService.goToEditGender()}
                        >
                            <Text style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Giới tính
                            </Text>
                            <View style={styles.fieldValue}>
                                <Text style={[styles.fieldText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {profile?.gender === 'MALE' ? 'Nam' : profile?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                </Text>
                                <ChevronRight
                                    size={20}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Date of Birth */}
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => NavigationService.goToEditDateOfBirth()}
                        >
                            <Text style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Ngày sinh
                            </Text>
                            <View style={styles.fieldValue}>
                                <Text style={[styles.fieldText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {profile?.dateOfBirth || 'Chọn ngày sinh'}
                                </Text>
                                <ChevronRight
                                    size={20}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Bio */}
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => NavigationService.goToEditBio()}
                        >
                            <Text style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Tiểu sử
                            </Text>
                            <View style={styles.fieldValue}>
                                <Text style={[styles.fieldText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {profile?.bio || 'Giới thiệu về bạn'}
                                </Text>
                                <ChevronRight
                                    size={20}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>

            {/* Avatar Action Sheet Modal */}
            <Modal
                visible={showAvatarModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    console.log('Modal close requested');
                    setShowAvatarModal(false);
                }}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => {
                        console.log('Modal backdrop pressed');
                        setShowAvatarModal(false);
                    }}
                >
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Chọn ảnh đại diện
                        </Text>

                        <TouchableOpacity
                            style={[styles.modalButton, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}
                            onPress={() => handleAvatarActionPress('camera')}
                        >
                            <Camera size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                            <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Chụp ảnh
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}
                            onPress={() => handleAvatarActionPress('gallery')}
                        >
                            <Images size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                            <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Tải ảnh lên
                            </Text>
                        </TouchableOpacity>

                        {profile?.avatarUrl && (
                            <TouchableOpacity
                                style={[styles.modalButton, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}
                                onPress={() => handleAvatarActionPress('view')}
                            >
                                <Eye size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                                <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Xem ảnh
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setShowAvatarModal(false)}
                        >
                            <Text style={[styles.cancelButtonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Hủy
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Image Viewer Modal */}
            {showImageViewer && (
                <View style={styles.imageViewerOverlay}>
                    <TouchableOpacity
                        style={styles.imageViewerBackdrop}
                        onPress={() => setShowImageViewer(false)}
                        activeOpacity={1}
                    >
                        <View style={styles.imageViewerContainer}>
                            {/* Close button */}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowImageViewer(false)}
                            >
                                <X
                                    size={30}
                                    color="#FFFFFF"
                                />
                            </TouchableOpacity>

                            {/* Image */}
                            {profile?.avatarUrl && (
                                <Image
                                    source={{ uri: profile.avatarUrl }}
                                    style={styles.fullScreenImage}
                                    resizeMode="contain"
                                />
                            )}

                            {/* Image info */}
                            <View style={styles.imageInfo}>
                                <Text style={styles.imageInfoText}>
                                    Ảnh đại diện
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 20,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 30,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        marginBottom: 12,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changePhotoButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    changePhotoText: {
        fontSize: 16,
        fontWeight: '500',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34, // Safe area for home indicator
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    modalButtonText: {
        fontSize: 16,
        marginLeft: 16,
        fontWeight: '500',
    },
    cancelButton: {
        borderBottomWidth: 0,
        marginTop: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        width: '100%',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    fieldValue: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 2,
        justifyContent: 'flex-end',
    },
    fieldInput: {
        fontSize: 16,
        flex: 1,
        textAlign: 'right',
        marginRight: 8,
    },
    fieldText: {
        fontSize: 16,
        marginRight: 8,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    imageViewerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    fullScreenImage: {
        width: '90%',
        height: '80%',
        maxWidth: 400,
        maxHeight: 400,
    },
    imageInfo: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    imageInfoText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
});
