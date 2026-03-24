import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { FolderOpen, Check, MapPin, Globe, Lock } from 'lucide-react-native';
import { useToast } from '../contexts/ToastContext';
import { locationFolderService } from '../services/locationFolderService';
import { LocationFolder } from '../types/locationFolder';
import GradientButton from './GradientButton';

interface DeleteCollectionsModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    collections: LocationFolder[];
}

const DeleteCollectionsModal: React.FC<DeleteCollectionsModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
    collections,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

    // Animation values for each item
    const animationValues = useRef<Map<string, Animated.Value>>(new Map()).current;

    // Bottom sheet snap points - fixed height
    const snapPoints = useMemo(() => ['70%'], []);

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
            setSelectedCollections([]);
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

    const handleToggleSelection = (collectionId: string) => {
        // Get or create animation value for this item
        if (!animationValues.has(collectionId)) {
            animationValues.set(collectionId, new Animated.Value(1));
        }

        const animatedValue = animationValues.get(collectionId)!;
        const isCurrentlySelected = selectedCollections.includes(collectionId);

        // Create smooth animation sequence
        Animated.sequence([
            // Scale down slightly
            Animated.timing(animatedValue, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            // Scale back up
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Update selection state
        setSelectedCollections(prev =>
            prev.includes(collectionId)
                ? prev.filter(id => id !== collectionId)
                : [...prev, collectionId]
        );
    };

    const handleSelectAll = () => {
        // Get only non-default collections (not protected)
        const selectableCollections = collections.filter(collection => !collection.isDefault);
        const selectableIds = selectableCollections.map(collection => collection.id);

        // Check if all selectable collections are selected
        const allSelectableSelected = selectableIds.length > 0 && selectableIds.every(id => selectedCollections.includes(id));

        if (allSelectableSelected) {
            // Deselect all selectable collections
            setSelectedCollections(prev => prev.filter(id => !selectableIds.includes(id)));
        } else {
            // Select all selectable collections
            setSelectedCollections(prev => [...new Set([...prev, ...selectableIds])]);
        }
    };

    const handleDelete = async () => {
        if (selectedCollections.length === 0) {
            showError('Vui lòng chọn ít nhất một collection để xóa');
            return;
        }

        setIsDeleting(true);
        try {
            // Delete collections in parallel
            const deletePromises = selectedCollections.map(id =>
                locationFolderService.deleteFolder(id)
            );

            const results = await Promise.all(deletePromises);
            const successCount = results.filter(result => result.status === 'success').length;

            if (successCount === selectedCollections.length) {
                showSuccess(`Đã xóa ${successCount} collection(s)`);
                onSuccess();
                handleClose();
            } else {
                showError(`Chỉ xóa được ${successCount}/${selectedCollections.length} collection(s)`);
            }
        } catch (error: any) {
            console.error('[DeleteCollectionsModal] Failed to delete collections:', error);
            showError(`Lỗi: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        // Force close the sheet first
        bottomSheetRef.current?.close();
        // Then reset state and call onClose
        setTimeout(() => {
            setSelectedCollections([]);
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
                        disabled={isDeleting}
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
                            Xóa Collections
                        </Text>
                        <Text style={[
                            styles.subtitle,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            Chọn collections để xóa
                        </Text>
                    </View>

                    <GradientButton
                        title={isDeleting ? "Đang xóa..." : `Xóa (${selectedCollections.length})`}
                        onPress={handleDelete}
                        disabled={isDeleting || selectedCollections.length === 0}
                        size="medium"
                        fullWidth={false}
                        minWidth={80}
                    />
                </View>

                {/* Content - Fixed height with scroll */}
                <View style={styles.content}>
                    {collections.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FolderOpen
                                size={48}
                                color={isDark ? '#6B7280' : '#9CA3AF'}
                            />
                            <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Không có collections nào để xóa
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={collections}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            style={styles.foldersScrollView}
                            ListHeaderComponent={() => (
                                <TouchableOpacity
                                    style={[
                                        styles.selectAllButton,
                                        {
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                        }
                                    ]}
                                    onPress={handleSelectAll}
                                    activeOpacity={1}
                                >
                                    <View style={[
                                        styles.selectAllCheckbox,
                                        {
                                            borderColor: isDark ? '#6B7280' : '#D1D5DB',
                                        },
                                        (() => {
                                            const selectableCollections = collections.filter(collection => !collection.isDefault);
                                            const selectableIds = selectableCollections.map(collection => collection.id);
                                            const allSelectableSelected = selectableIds.length > 0 && selectableIds.every(id => selectedCollections.includes(id));
                                            return allSelectableSelected;
                                        })() && {
                                            backgroundColor: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? '#FFFFFF' : '#000000',
                                        }
                                    ]}>
                                        {(() => {
                                            const selectableCollections = collections.filter(collection => !collection.isDefault);
                                            const selectableIds = selectableCollections.map(collection => collection.id);
                                            const allSelectableSelected = selectableIds.length > 0 && selectableIds.every(id => selectedCollections.includes(id));
                                            return allSelectableSelected;
                                        })() && (
                                                <Check
                                                    size={16}
                                                    color={isDark ? '#000000' : '#FFFFFF'}
                                                />
                                            )}
                                    </View>
                                    <Text style={[styles.selectAllText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                        Chọn tất cả ({selectedCollections.length}/{collections.filter(c => !c.isDefault).length})
                                    </Text>
                                </TouchableOpacity>
                            )}
                            renderItem={({ item: collection }) => {
                                const isProtected = collection.isDefault; // Protected if collection is default
                                const isSelected = selectedCollections.includes(collection.id);

                                // Get animation value for this item
                                if (!animationValues.has(collection.id)) {
                                    animationValues.set(collection.id, new Animated.Value(1));
                                }
                                const animatedValue = animationValues.get(collection.id)!;

                                return (
                                    <Animated.View
                                        style={[
                                            {
                                                transform: [{ scale: animatedValue }],
                                            }
                                        ]}
                                    >
                                        <Animated.View
                                            style={[
                                                styles.collectionItem,
                                                {
                                                    backgroundColor: isSelected
                                                        ? (isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)')
                                                        : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'),
                                                    shadowColor: isSelected ? '#EF4444' : 'transparent',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isSelected ? 0.2 : 0,
                                                    shadowRadius: 4,
                                                    elevation: isSelected ? 3 : 0,
                                                },
                                                isProtected && {
                                                    opacity: 0.5,
                                                }
                                            ]}
                                        >
                                            <TouchableOpacity
                                                style={styles.touchableArea}
                                                onPress={() => !isProtected && handleToggleSelection(collection.id)}
                                                activeOpacity={1}
                                                disabled={isProtected}
                                            >
                                                {/* Collection Icon */}
                                                <View style={[
                                                    styles.collectionIcon,
                                                    isSelected && {
                                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.25)',

                                                    }
                                                ]}>
                                                    <MapPin
                                                        size={40}
                                                        color={isDark ? '#FFFFFF' : '#000000'}
                                                    />
                                                </View>

                                                {/* Collection Info */}
                                                <View style={styles.collectionInfo}>
                                                    <Text
                                                        style={[
                                                            styles.collectionName,
                                                            { color: isDark ? '#FFFFFF' : '#000000' },
                                                            isSelected && { fontWeight: '600' }
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {collection.name}
                                                    </Text>
                                                    <Text
                                                        style={[styles.collectionDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                                                        numberOfLines={1}
                                                    >
                                                        {collection.description || 'Không có mô tả'}
                                                    </Text>
                                                </View>

                                                {/* Status Icon */}
                                                <View style={styles.collectionStatus}>
                                                    {collection.visibility === 'PUBLIC' ? (
                                                        <Globe
                                                            size={24}
                                                            color={isDark ? '#9CA3AF' : '#6B7280'}
                                                        />
                                                    ) : (
                                                        <Lock
                                                            size={24}
                                                            color={isDark ? '#9CA3AF' : '#6B7280'}
                                                        />
                                                    )}
                                                </View>

                                            </TouchableOpacity>

                                            {/* Protected Badge */}
                                            {isProtected && (
                                                <View style={styles.protectedBadge}>
                                                    <Text style={[styles.protectedText, { color: isDark ? '#EF4444' : '#DC2626' }]}>
                                                        Không thể xóa
                                                    </Text>
                                                </View>
                                            )}
                                        </Animated.View>
                                    </Animated.View>
                                );
                            }}
                        />
                    )}
                </View>
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
    foldersScrollView: {
        maxHeight: 600, // Giới hạn chiều cao để chỉ hiển thị ~4-5 items
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        minHeight: 200,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
    collectionsList: {
        gap: 12,
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    selectAllText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
    selectAllCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginBottom: 8,
        minHeight: 60,
    },
    touchableArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    collectionIcon: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    collectionInfo: {
        flex: 1,
        marginRight: 12,
    },
    collectionName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    collectionDescription: {
        fontSize: 13,
        opacity: 0.7,
    },
    collectionStatus: {
        paddingRight: 8,
    },
    protectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    protectedText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default DeleteCollectionsModal;
