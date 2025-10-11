import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NavigationService from '../../services/navigationService';
import { Globe, Lock, MapPin, MoreHorizontal, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
    SharedValue,
    useAnimatedStyle,
    LinearTransition,
    SlideOutLeft,
} from 'react-native-reanimated';
import CollectionActionsModal from '../../components/CollectionActionsModal';
import LocationCard from '../../components/LocationCard';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import EditCollectionModal from '../../components/EditCollectionModal';
import Header from '../../components/Header';
import ContextMenu, { MenuAction } from '../../components/ContextMenu';
import { FeatureErrorBoundary } from '../../components/FeatureErrorBoundary';
import { useToast } from '../../contexts/ToastContext';
import { locationFolderService } from '../../services/locationFolderService';
import { locationService } from '../../services/locationService';
import { useCollectionStore } from '../../store/collectionStore';
import { LocationInFolder } from '../../types/locationFolder';
import { LocationDetails } from '../../types/location';

export default function CollectionDetailScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    const { collectionId } = params as {
        collectionId: string;
    };

    // All hooks must be called before any early returns
    const [locations, setLocations] = useState<LocationInFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [collectionLoading, setCollectionLoading] = useState(false);
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationInFolder | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    // Swipeable refs for managing multiple swipeable items
    const itemRefs = useRef<{ [key: string]: any }>({});

    // Zustand store
    const {
        currentCollection,
        setCurrentCollection,
        updateCurrentCollection,
        updateCollection,
        resetCurrentCollection
    } = useCollectionStore();

    // All useEffect and useCallback hooks must be called before any early returns
    // Debug modal state
    useEffect(() => {
        console.log('🔍 showActionsModal changed to:', showActionsModal);
    }, [showActionsModal]);

    // Load collection info from store (Store-First approach)
    useEffect(() => {
        // Get current collection from store at the time of effect execution
        const { currentCollection: currentStoreCollection } = useCollectionStore.getState();

        // If we don't have currentCollection or it's a different collection, 
        // try to find it in the collections list or fetch from API as fallback
        if (!currentStoreCollection || currentStoreCollection.id !== collectionId) {
            console.log('Collection not found in store, fetching from API as fallback');
            setCollectionLoading(true);

            // Fallback: Fetch from API only if store doesn't have the data
            const fetchFromAPI = async () => {
                try {
                    const response = await locationFolderService.getFolderById(collectionId);
                    if (response.status === 'success') {
                        console.log('Collection info loaded from API fallback:', response.data);
                        setCurrentCollection(response.data);
                    } else {
                        showError('Không thể tải thông tin collection');
                    }
                } catch (error: any) {
                    console.error('Error loading collection info from API fallback:', error);
                    showError('Lỗi khi tải thông tin collection');
                } finally {
                    setCollectionLoading(false);
                }
            };

            fetchFromAPI();
        } else {
            console.log('Using collection data from store:', currentStoreCollection);
        }
    }, [collectionId, setCurrentCollection, showError]); // ✅ Only depend on collectionId and stable functions

    // Debug log for currentCollection
    useEffect(() => {
        console.log('Current collection from store:', currentCollection);
    }, [currentCollection]);

    // Cleanup store on unmount
    useEffect(() => {
        return () => {
            resetCurrentCollection();
        };
    }, [resetCurrentCollection]);

    // Handle back navigation
    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    const loadLocations = useCallback(async () => {
        if (!collectionId) {
            console.error('CollectionDetail: collectionId is undefined');
            showError('Không tìm thấy ID collection');
            return;
        }

        try {
            console.log('Loading locations for collectionId:', collectionId);
            const response = await locationFolderService.getLocationsInFolder(collectionId);
            if (response.status === 'success') {
                setLocations(response.data.content);
            } else {
                showError('Không thể tải danh sách địa điểm');
            }
        } catch (error: any) {
            console.error('Failed to load locations:', error);
            showError(`Lỗi: ${error.message}`);
        }
    }, [collectionId, showError]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        // Store-Update-First: Only refresh locations, collection info already in store
        try {
            // Only refresh locations (collection info is already up-to-date in store)
            await loadLocations();

            // Optional: Background refresh collection info for data consistency
            // (This can be done silently without affecting UI)
            const collectionResponse = await locationFolderService.getFolderById(collectionId);
            if (collectionResponse.status === 'success') {
                console.log('Background refresh collection info:', collectionResponse.data);
                setCurrentCollection(collectionResponse.data);
                updateCollection(collectionId, collectionResponse.data);
            }
        } catch (error) {
            console.error('Failed to refresh data on pull-to-refresh:', error);
            showError('Lỗi khi làm mới dữ liệu');
        } finally {
            setRefreshing(false);
        }
    }, [collectionId, setCurrentCollection, updateCollection, loadLocations, showError]);

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            await loadLocations();
            setLoading(false);
        };

        initializeData();
    }, [loadLocations]);

    // Convert LocationInFolder to LocationDetails for LocationCard
    const convertToLocationDetails = (locationInFolder: LocationInFolder): LocationDetails => {
        return {
            id: locationInFolder.locationId,
            name: locationInFolder.locationName,
            description: locationInFolder.note || '',
            address: locationInFolder.address,
            latitude: 0, // Not available in LocationInFolder
            longitude: 0, // Not available in LocationInFolder
            totalRating: 0, // Not available in LocationInFolder
            categories: [], // Not available in LocationInFolder
            purposes: [], // Not available in LocationInFolder
            tags: [], // Not available in LocationInFolder
            imageUrls: locationInFolder.imageUrl ? [locationInFolder.imageUrl] : [],
            contacts: [], // Not available in LocationInFolder
        };
    };

    const handleLocationPress = async (location: LocationDetails) => {
        // Navigate to discover screen with location data
        console.log('Navigate to discover with location:', location.id);

        try {
            // Fetch full location details to get coordinates and full data
            console.log('🔄 [CollectionDetail] Fetching location details for navigation:', location.id);
            const response = await locationService.getLocationDetails(location.id);

            if (response.status === 'success') {
                const locationDetails = response.data;
                console.log('✅ [CollectionDetail] Location details fetched:', {
                    id: locationDetails.id,
                    latitude: locationDetails.latitude,
                    longitude: locationDetails.longitude
                });

                // Navigate with real coordinates and pass full data via global state
                // Store location data in a global state or pass via params
                router.push({
                    pathname: '/(tabs)/discover',
                    params: {
                        locationId: location.id,
                        latitude: locationDetails.latitude.toString(),
                        longitude: locationDetails.longitude.toString(),
                        autoOpenCard: 'true',
                        // Pass full location data as JSON string
                        locationData: JSON.stringify(locationDetails)
                    }
                });
            } else {
                console.error('❌ [CollectionDetail] Failed to fetch location details:', response.message);
                showError('Không thể tải thông tin địa điểm');
            }
        } catch (error) {
            console.error('❌ [CollectionDetail] Error fetching location details:', error);
            showError('Lỗi khi tải thông tin địa điểm');
        }
    };

    const handleRemoveLocation = (locationId: string) => {
        Alert.alert(
            'Xóa địa điểm',
            'Bạn có chắc chắn muốn xóa địa điểm này khỏi collection?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => removeLocation(locationId),
                },
            ]
        );
    };

    // RightAction component for swipe to delete
    const RightAction = (prog: SharedValue<number>, drag: SharedValue<number>, onDelete: () => void) => {
        const styleAnimation = useAnimatedStyle(() => {
            return {
                transform: [{ translateX: drag.value + 80 }], // Adjusted for icon width
            };
        });

        return (
            <Reanimated.View style={styleAnimation}>
                <TouchableOpacity style={styles.rightAction} onPress={onDelete}>
                    <Trash2 size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </Reanimated.View>
        );
    };

    const removeLocation = async (locationId: string) => {
        try {
            // Mark item as deleting
            setDeletingIds(prev => new Set(prev).add(locationId));

            // Call API to remove location
            await locationFolderService.removeLocationFromFolder(collectionId, locationId);

            // Delay to allow SlideOutLeft animation to complete
            setTimeout(() => {
                setLocations(prev => prev.filter(loc => loc.locationId !== locationId));
                setDeletingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(locationId);
                    return newSet;
                });
            }, 350);

            showSuccess('Đã xóa địa điểm khỏi collection');
        } catch (error: any) {
            console.error('Failed to remove location:', error);

            // Handle 404 error gracefully - location might already be removed
            if (error.response?.status === 404) {
                console.log('📍 [CollectionDetail] Location already removed (404), removing from UI');
                showSuccess('Địa điểm đã được xóa');

                // Still remove from UI since it's already gone from server
                setTimeout(() => {
                    setLocations(prev => prev.filter(loc => loc.locationId !== locationId));
                    setDeletingIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(locationId);
                        return newSet;
                    });
                }, 350);
            } else {
                showError('Không thể xóa địa điểm');

                // Remove from deleting set on error
                setDeletingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(locationId);
                    return newSet;
                });
            }
        }
    };

    const handleLongPress = (item: LocationInFolder) => {
        setSelectedLocation(item);
        setContextMenuVisible(true);
    };

    const handleContextMenuAction = (actionId: string) => {
        if (actionId === 'delete' && selectedLocation) {
            Alert.alert(
                'Xóa địa điểm',
                `Bạn có chắc chắn muốn xóa "${selectedLocation.locationName}" khỏi collection này?`,
                [
                    {
                        text: 'Hủy',
                        style: 'cancel',
                    },
                    {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => removeLocation(selectedLocation.locationId),
                    },
                ]
            );
        }
        setContextMenuVisible(false);
        setSelectedLocation(null);
    };

    const handleAddLocation = () => {
        // 🚀 ENTERPRISE: NavigationService now handles GPS automatically
        console.log('📍 [CollectionDetail] Navigating to discover - GPS handled by NavigationService');
        NavigationService.goToDiscover();
    };



    // Modal handlers
    const handleEditCollection = () => {
        setShowActionsModal(false);
        setTimeout(() => {
            setShowEditModal(true);
        }, 200);
    };

    const handleDeleteCollection = () => {
        setShowActionsModal(false);
        setTimeout(() => {
            setShowDeleteModal(true);
        }, 200);
    };

    const handleEditSuccess = useCallback((updatedData?: {
        name?: string;
        description?: string;
        visibility?: 'PUBLIC' | 'PRIVATE';
    }) => {
        setShowEditModal(false);

        // Store-Update-First: Update store immediately with new data (Optimistic Update)
        if (updatedData && currentCollection) {
            // Save previous state for potential rollback
            const previousState = currentCollection;

            const updatedCollection = {
                ...currentCollection,
                ...updatedData,
                updatedAt: new Date().toISOString()
            };

            console.log('Optimistic update: Updating collection in store immediately:', updatedCollection);
            setCurrentCollection(updatedCollection);
            updateCollection(collectionId, updatedCollection);

            // Note: API call is already handled in EditCollectionModal
            // If API fails, the modal will show error and not call onSuccess
            // So we don't need rollback mechanism here since onSuccess is only called on API success
        }

        // Only refresh locations (collection info already updated in store)
        loadLocations();
    }, [collectionId, currentCollection, setCurrentCollection, updateCollection, loadLocations]);

    const handleDeleteSuccess = async () => {
        try {
            const response = await locationFolderService.deleteFolder(collectionId);
            if (response.status === 'success') {
                showSuccess('Đã xóa collection thành công');
                setShowDeleteModal(false);

                // Cập nhật collection store để refresh danh sách
                const { removeCollection } = useCollectionStore.getState();
                removeCollection(collectionId);

                router.back();
            } else {
                showError(response.message || 'Có lỗi xảy ra khi xóa collection');
            }
        } catch (error) {
            showError('Có lỗi xảy ra khi xóa collection');
        }
    };

    const renderLocation = ({ item, index }: { item: LocationInFolder; index: number }) => {
        const locationDetails = convertToLocationDetails(item);

        return (
            <Reanimated.View
                style={styles.swipeableWrapper}
                exiting={SlideOutLeft.duration(300)}
                layout={LinearTransition.springify().stiffness(200)}>
                <ReanimatedSwipeable
                    key={item.id}
                    friction={2}
                    enableTrackpadTwoFingerGesture
                    rightThreshold={40}
                    renderRightActions={(prog, drag) =>
                        RightAction(prog, drag, () => removeLocation(item.locationId))
                    }
                    {...({ ref: (ref: any) => (itemRefs.current[item.id] = ref) } as any)}
                    onSwipeableOpenStartDrag={async () => {
                        const keys = Object.keys(itemRefs.current);
                        keys.map(async key => {
                            if (key !== item.id) {
                                await itemRefs.current[key]?.close();
                            }
                        });
                    }}
                >
                    <LocationCard
                        location={locationDetails}
                        variant="list"
                        onOpenDetail={handleLocationPress}
                        addedAt={item.addedAt}
                        updatedAt={item.updatedAt}
                        note={item.note}
                    />
                </ReanimatedSwipeable>
            </Reanimated.View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <MapPin
                size={64}
                color={isDark ? '#4B5563' : '#9CA3AF'}
            />
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Chưa có địa điểm nào
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Thêm địa điểm đầu tiên vào collection này
            </Text>
            {currentCollection?.isDefault !== true && (
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: '#F48C06' }]}
                    onPress={handleAddLocation}
                >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Thêm địa điểm</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const getVisibilityIcon = () => {
        return currentCollection?.visibility === 'PUBLIC' ? Globe : Lock;
    };

    const getVisibilityColor = () => {
        return currentCollection?.visibility === 'PUBLIC' ? '#9CA3AF' : '#6B7280';
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <ActivityIndicator size="large" color="#F48C06" />
                <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Đang tải địa điểm...
                </Text>
            </View>
        );
    }

    return (
        <FeatureErrorBoundary feature="Collections">
            <TouchableWithoutFeedback onPress={() => {
                setContextMenuVisible(false);
                setSelectedLocation(null);
            }}>
                <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <Header
                        title={currentCollection?.name || 'Collection'}
                        showBackButton
                        onBackPress={handleBackPress}
                        rightIcon={{
                            icon: MoreHorizontal,
                            size: 28,
                            onPress: () => {
                                console.log('🔍 Icon pressed, setting showActionsModal to true');
                                setShowActionsModal(true);
                            }
                        }}
                    />

                    {/* Collection Info - Similar to Profile */}
                    {/* <TouchableOpacity style={[styles.collectionItem, { backgroundColor: isDark ? '#232024' : '#F3F4F6' }]}>
                <View style={styles.collectionIcon}>
                    <MapPin
                        size={46}
                        color={isDark ? '#FFFFFF' : '#000000'}
                    />
                </View>
                <View style={styles.collectionInfo}>
                    {collectionLoading ? (
                        <View style={styles.collectionLoadingContainer}>
                            <ActivityIndicator size="small" color="#F48C06" />
                            <Text style={[styles.collectionLoadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Đang tải...
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text
                                style={[styles.collectionName, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                numberOfLines={1}
                            >
                                {currentCollection?.name || 'Collection'}
                            </Text>
                            <Text
                                style={[styles.collectionDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                                numberOfLines={2}
                            >
                                {currentCollection?.description || 'Không có mô tả'}
                            </Text>
                        </>
                    )}
                </View>
                <View style={styles.collectionStatus}>
                    {(() => {
                        const IconComponent = getVisibilityIcon();
                        return <IconComponent size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />;
                    })()}
                </View>
            </TouchableOpacity> */}

                    {locations.length === 0 ? (
                        renderEmptyState()
                    ) : (
                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <FlatList
                                data={locations}
                                renderItem={renderLocation}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                style={{ overflow: 'visible' }}
                                removeClippedSubviews={false}
                                scrollEventThrottle={16}
                            />
                        </GestureHandlerRootView>
                    )}

                    {/* Collection Actions Modal */}
                    {showActionsModal && (
                        <>
                            {console.log('🔍 Rendering CollectionActionsModal with isVisible:', showActionsModal)}
                            <CollectionActionsModal
                                isVisible={showActionsModal}
                                onClose={() => {
                                    console.log('🔍 Closing CollectionActionsModal');
                                    setShowActionsModal(false);
                                }}
                                onEdit={handleEditCollection}
                                onDelete={handleDeleteCollection}
                                isDefault={currentCollection?.isDefault === true}
                            />
                        </>
                    )}

                    {/* Edit Collection Modal */}
                    {showEditModal && (
                        <EditCollectionModal
                            isVisible={showEditModal}
                            onClose={() => setShowEditModal(false)}
                            onSuccess={handleEditSuccess}
                            collectionId={collectionId}
                            collectionName={currentCollection?.name || ''}
                            collectionDescription={currentCollection?.description || ''}
                            visibility={currentCollection?.visibility || 'PRIVATE'}
                        />
                    )}

                    {/* Confirm Delete Modal */}
                    {showDeleteModal && (
                        <ConfirmDeleteModal
                            isVisible={showDeleteModal}
                            onClose={() => setShowDeleteModal(false)}
                            onConfirm={handleDeleteSuccess}
                            collectionName={currentCollection?.name || ''}
                        />
                    )}

                    {/* Context Menu for Location Actions */}
                    {contextMenuVisible && selectedLocation && (
                        <ContextMenu
                            actions={[
                                {
                                    id: 'delete',
                                    title: 'Xóa khỏi collection',
                                    icon: Trash2,
                                    onPress: () => handleContextMenuAction('delete'),
                                    destructive: true,
                                },
                            ]}
                            disabled={false}
                        />
                    )}

                </View>
            </TouchableWithoutFeedback>
        </FeatureErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    // Collection Item Styles (similar to profile)
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        minHeight: 80,
    },
    collectionIcon: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionStatus: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
    },
    collectionName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    collectionDescription: {
        fontSize: 14,
        opacity: 0.7,
        lineHeight: 20,
    },
    listContent: {
        padding: 8,
    },
    rightAction: {
        width: 80,
        height: '100%',
        backgroundColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    swipeableWrapper: {
        marginVertical: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    },
    collectionLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    collectionLoadingText: {
        fontSize: 14,
        marginLeft: 8,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
