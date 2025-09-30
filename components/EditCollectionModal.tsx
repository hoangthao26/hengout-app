import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { locationFolderService } from '../services/locationFolderService';

interface EditCollectionModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: (updatedData?: {
        name?: string;
        description?: string;
        visibility?: 'PUBLIC' | 'PRIVATE';
    }) => void;
    collectionId: string;
    collectionName: string;
    collectionDescription: string;
    visibility: 'PUBLIC' | 'PRIVATE';
}

const EditCollectionModal: React.FC<EditCollectionModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
    collectionId,
    collectionName: initialName,
    collectionDescription: initialDescription,
    visibility: initialVisibility,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(initialVisibility);
    const [isUpdating, setIsUpdating] = useState(false);

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['90%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            // Add small delay to ensure proper cleanup
            setTimeout(() => {
                onClose();
            }, 100);
        }
    }, [onClose]);

    // Open/close effect
    React.useEffect(() => {
        if (isVisible) {
            // Reset form with current values
            setName(initialName);
            setDescription(initialDescription);
            setVisibility(initialVisibility);

            setTimeout(() => {
                bottomSheetRef.current?.snapToIndex(1);
            }, 100);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible, initialName, initialDescription, initialVisibility]);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isVisible) {
            setTimeout(() => {
                setName(initialName);
                setDescription(initialDescription);
                setVisibility(initialVisibility);
                setIsUpdating(false);
            }, 200);
        }
    }, [isVisible, initialName, initialDescription, initialVisibility]);

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(-1);
        setTimeout(() => {
            onClose();
        }, 100);
    }, [onClose]);

    const handleUpdateCollection = useCallback(async () => {
        if (!name.trim()) {
            showError('Vui lòng nhập tên collection');
            return;
        }

        if (!description.trim()) {
            showError('Vui lòng nhập mô tả collection');
            return;
        }

        try {
            setIsUpdating(true);

            const response = await locationFolderService.updateFolder(collectionId, {
                name: name.trim(),
                description: description.trim(),
                visibility: visibility,
            });

            if (response.status === 'success') {
                showSuccess('Cập nhật collection thành công');

                // Pass updated data to onSuccess for Store-Update-First approach
                const updatedData = {
                    name: name.trim(),
                    description: description.trim(),
                    visibility: visibility,
                };

                onSuccess(updatedData);
                handleClose();
            } else {
                showError(response.message || 'Có lỗi xảy ra khi cập nhật collection');
            }
        } catch (error: any) {
            console.error('Update collection error:', error);
            showError('Có lỗi xảy ra khi cập nhật collection');
        } finally {
            setIsUpdating(false);
        }
    }, [name, description, visibility, collectionId, showSuccess, showError, onSuccess, handleClose]);

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

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={true}
            backgroundStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#6B7280' : '#D1D5DB',
                width: 40,
                height: 4,
            }}
        >
            <BottomSheetView style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <TouchableOpacity
                        onPress={handleClose}
                        disabled={isUpdating}
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
                            Chỉnh sửa Collection
                        </Text>
                        <Text style={[
                            styles.subtitle,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            Cập nhật thông tin collection
                        </Text>
                    </View>

                    {isUpdating || !name.trim() || !description.trim() ? (
                        <TouchableOpacity
                            style={[
                                styles.updateButton,
                                {
                                    backgroundColor: isDark ? '#374151' : '#D1D5DB',
                                }
                            ]}
                            onPress={handleUpdateCollection}
                            disabled={true}
                            activeOpacity={1}
                        >
                            {isUpdating ? (
                                <ActivityIndicator
                                    size="small"
                                    color={isDark ? '#FFFFFF' : '#000000'}
                                />
                            ) : (
                                <Text style={[styles.updateButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Lưu
                                </Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateCollection}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#FAA307', '#F48C06', '#DC2F02', '#9D0208']}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Text style={[styles.updateButtonText, { color: '#FFFFFF' }]}>
                                    Lưu
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>

                <BottomSheetScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Collection Name Input */}
                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={[styles.inputLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Tên Collection
                            </Text>
                            <Text style={[
                                styles.requiredLabel,
                                { color: isDark ? '#EF4444' : '#DC2626' }
                            ]}>
                                *
                            </Text>
                        </View>
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                borderColor: isDark ? '#4B5563' : '#E5E7EB',
                            }
                        ]}>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    { color: isDark ? '#FFFFFF' : '#000000' }
                                ]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nhập tên collection"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                maxLength={50}
                                editable={!isUpdating}
                            />
                            <Text style={[
                                styles.characterCount,
                                { color: isDark ? '#9CA3AF' : '#6B7280' }
                            ]}>
                                {name.length}/50
                            </Text>
                        </View>
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[
                            styles.inputLabel,
                            { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}>
                            Mô tả
                        </Text>
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                borderColor: isDark ? '#4B5563' : '#E5E7EB',
                            }
                        ]}>
                            <TextInput
                                style={[
                                    styles.textArea,
                                    { color: isDark ? '#FFFFFF' : '#000000' }
                                ]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Nhập mô tả (tùy chọn)"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                multiline
                                numberOfLines={3}
                                maxLength={200}
                                editable={!isUpdating}
                            />
                            <Text style={[
                                styles.characterCount,
                                { color: isDark ? '#9CA3AF' : '#6B7280' }
                            ]}>
                                {description.length}/200
                            </Text>
                        </View>
                    </View>

                    {/* Visibility Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={[
                            styles.inputLabel,
                            { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}>
                            Quyền riêng tư
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.radioContainer,
                                {
                                    backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                    borderColor: isDark ? '#4B5563' : '#E5E7EB',
                                }
                            ]}
                            onPress={() => setVisibility(visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE')}
                            disabled={isUpdating}
                            activeOpacity={1}
                        >
                            <View style={[
                                styles.radioButton,
                                {
                                    borderColor: visibility === 'PRIVATE'
                                        ? (isDark ? '#FFFFFF' : '#000000')
                                        : (isDark ? '#6B7280' : '#D1D5DB'),
                                }
                            ]}>
                                {visibility === 'PRIVATE' && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                            <View style={styles.radioContent}>
                                <Text style={[styles.radioLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {visibility === 'PRIVATE' ? 'Riêng tư' : 'Công khai'}
                                </Text>
                                <Text style={[styles.radioDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    {visibility === 'PRIVATE'
                                        ? 'Chỉ bạn mới có thể xem collection này'
                                        : 'Mọi người đều có thể xem collection này'
                                    }
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 8,
        marginLeft: -8,
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
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '400',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    requiredLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 2,
    },
    inputContainer: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        position: 'relative',
    },
    textInput: {
        fontSize: 16,
        minHeight: 24,
        paddingVertical: 12,
        paddingRight: 50,
    },
    textArea: {
        fontSize: 16,
        minHeight: 60,
        textAlignVertical: 'top',
        paddingVertical: 12,
        paddingRight: 50,
    },
    characterCount: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        fontSize: 12,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    radioContent: {
        flex: 1,
    },
    radioLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    radioDescription: {
        fontSize: 14,
    },
    updateButton: {
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientButton: {
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EditCollectionModal;
