import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { Lock } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { locationFolderService } from '../services/locationFolderService';
import GradientButton from './GradientButton';

interface CreateCollectionModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
    const [isCreating, setIsCreating] = useState(false);

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['60%', '85%'], []);

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
            // Small delay to ensure proper mounting
            setTimeout(() => {
                bottomSheetRef.current?.expand();
            }, 50);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isVisible) {
            setName('');
            setDescription('');
            setVisibility('PRIVATE');
        }
    }, [isVisible]);

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

    const handleCreate = async () => {
        if (!name.trim()) {
            showError('Vui lòng nhập tên collection');
            return;
        }

        setIsCreating(true);
        try {
            const response = await locationFolderService.createFolder({
                name: name.trim(),
                description: description.trim(),
                visibility,
            });

            if (response.status === 'success') {
                showSuccess('Đã tạo collection mới');
                onSuccess();
                handleClose();
            } else {
                showError('Không thể tạo collection');
            }
        } catch (error: any) {
            console.error('Failed to create collection:', error);
            showError(`Lỗi: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        // Force close the sheet first
        bottomSheetRef.current?.close();
        // Then reset state and call onClose
        setTimeout(() => {
            setName('');
            setDescription('');
            setVisibility('PRIVATE');
            onClose();
        }, 100);
    };

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={true}
            backgroundStyle={{
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#6B7280' : '#D1D5DB',
                width: 40,
                height: 4,
            }}
        >
            <BottomSheetView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <TouchableOpacity
                        onPress={handleClose}
                        disabled={isCreating}
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
                            Tạo Collection
                        </Text>
                        <Text style={[
                            styles.subtitle,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            Tạo bộ sưu tập địa điểm mới
                        </Text>
                    </View>

                    <GradientButton
                        title={isCreating ? "Đang tạo..." : "Tạo"}
                        onPress={handleCreate}
                        disabled={isCreating || !name.trim()}
                        size="medium"
                        fullWidth={false}
                        minWidth={70}
                    />
                </View>

                {/* Content */}
                <BottomSheetScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Name Input */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                            <Text style={[
                                styles.inputLabel,
                                { color: isDark ? '#FFFFFF' : '#000000' }
                            ]}>
                                Tên collection
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
                                editable={!isCreating}
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
                                editable={!isCreating}
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
                            disabled={isCreating}
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
                                    <View style={[
                                        styles.radioButtonInner,
                                        { backgroundColor: isDark ? '#FFFFFF' : '#000000' }
                                    ]} />
                                )}
                            </View>
                            <Lock
                                size={20}
                                color={isDark ? '#FFFFFF' : '#000000'}
                                style={styles.radioIcon}
                            />
                            <View style={styles.radioTextContainer}>
                                <Text style={[
                                    styles.radioText,
                                    { color: isDark ? '#FFFFFF' : '#000000' }
                                ]}>
                                    Riêng tư
                                </Text>
                                <Text style={[
                                    styles.radioSubtext,
                                    { color: isDark ? '#9CA3AF' : '#6B7280' }
                                ]}>
                                    {visibility === 'PRIVATE' ? 'Chỉ bạn mới thấy' : 'Mọi người đều thấy'}
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
        backgroundColor: '#000000',
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
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
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
        paddingVertical: 12,
        minHeight: 48,
    },
    textArea: {
        fontSize: 16,
        paddingVertical: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    radioButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    radioIcon: {
        marginRight: 12,
    },
    radioTextContainer: {
        flex: 1,
    },
    radioText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    radioSubtext: {
        fontSize: 14,
        fontWeight: '400',
    },
});

export default CreateCollectionModal;
