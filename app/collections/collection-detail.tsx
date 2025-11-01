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
import { useSubscriptionStore } from '../../store/subscriptionStore';

export default function CollectionDetailScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    const { collectionId } = params as {
        collectionId: string;
    };

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

    const itemRefs = useRef<{ [key: string]: any }>({});
    const {
        currentCollection,
        setCurrentCollection,
        updateCurrentCollection,
        updateCollection,
        resetCurrentCollection
    } = useCollectionStore();

    // Get collection items limit from subscription
    const activeSubscription = useSubscriptionStore(state => state.activeSubscription);
    const maxItems = activeSubscription?.plan?.maxFolderItem;


    useEffect(() => {
        const { currentCollection: currentStoreCollection } = useCollectionStore.getState();

        if (!currentStoreCollection || currentStoreCollection.id !== collectionId) {
            setCollectionLoading(true);

            const fetchFromAPI = async () => {
                try {
                    const response = await locationFolderService.getFolderById(collectionId);
                    if (response.status === 'success') {
                        setCurrentCollection(response.data);
                    } else {
                        showError('Không thể tải thông tin collection');
                    }
                } catch (error: any) {
                    console.error('Error loading collection info:', error);
                    showError('Lỗi khi tải thông tin collection');
                } finally {
                    setCollectionLoading(false);
                }
            };

            fetchFromAPI();
        }
    }, [collectionId, setCurrentCollection, showError]);

    // Cleanup store on unmount
    useEffect(() => {
        return () => {
            resetCurrentCollection();
        };
    }, [resetCurrentCollection]);

    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    const loadLocations = useCallback(async () => {
        if (!collectionId) {
            showError('Không tìm thấy ID collection');
            return;
        }

        try {
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

        try {
            await loadLocations();

            const collectionResponse = await locationFolderService.getFolderById(collectionId);
            if (collectionResponse.status === 'success') {
                setCurrentCollection(collectionResponse.data);
                updateCollection(collectionId, collectionResponse.data);
            }
        } catch (error) {
            console.error('Failed to refresh data:', error);
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

    const convertToLocationDetails = (locationInFolder: LocationInFolder): LocationDetails => {
        return {
            id: locationInFolder.locationId,
            name: locationInFolder.locationName,
            description: locationInFolder.note || '',
            address: locationInFolder.address,
            latitude: 0,
            longitude: 0,
            totalRating: 0,
            categories: [],
            purposes: [],
            tags: [],
            imageUrls: locationInFolder.imageUrl ? [locationInFolder.imageUrl] : [],
            contacts: [],
        };
    };

    const handleLocationPress = async (location: LocationDetails) => {
        try {
            const response = await locationService.getLocationDetails(location.id);

            if (response.status === 'success') {
                const locationDetails = response.data;
                router.push({
                    pathname: '/(tabs)/discover',
                    params: {
                        locationId: location.id,
                        latitude: locationDetails.latitude.toString(),
                        longitude: locationDetails.longitude.toString(),
                        autoOpenCard: 'true',
                        locationData: JSON.stringify(locationDetails)
                    }
                });
            } else {
                showError('Không thể tải thông tin địa điểm');
            }
        } catch (error) {
            console.error('Error fetching location details:', error);
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

    const RightAction = (prog: SharedValue<number>, drag: SharedValue<number>, onDelete: () => void) => {
        const styleAnimation = useAnimatedStyle(() => {
            return {
                transform: [{ translateX: drag.value + 80 }],
            };
        });

        return (
            <Reanimated.View style={[styleAnimation, styles.rightActionContainer]}>
                <TouchableOpacity style={styles.rightAction} onPress={onDelete}>
                    <Trash2 size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </Reanimated.View>
        );
    };

    const removeLocation = async (locationId: string) => {
        try {
            setDeletingIds(prev => new Set(prev).add(locationId));
            await locationFolderService.removeLocationFromFolder(collectionId, locationId);

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

            if (error.response?.status === 404) {
                showSuccess('Địa điểm đã được xóa');
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
        NavigationService.goToDiscover();
    };



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

        if (updatedData && currentCollection) {
            const updatedCollection = {
                ...currentCollection,
                ...updatedData,
                updatedAt: new Date().toISOString()
            };

            setCurrentCollection(updatedCollection);
            updateCollection(collectionId, updatedCollection);
        }

        loadLocations();
    }, [collectionId, currentCollection, setCurrentCollection, updateCollection, loadLocations]);

    const handleDeleteSuccess = async () => {
        try {
            const response = await locationFolderService.deleteFolder(collectionId);
            if (response.status === 'success') {
                showSuccess('Đã xóa collection thành công');
                setShowDeleteModal(false);

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
                    <View style={styles.cardContainer}>
                        <LocationCard
                            location={locationDetails}
                            variant="list"
                            onOpenDetail={handleLocationPress}
                            addedAt={item.addedAt}
                            updatedAt={item.updatedAt}
                            note={item.note}
                        />
                    </View>
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
                        title={(() => {
                            const collectionName = currentCollection?.name || 'Collection';
                            if (maxItems !== undefined && maxItems >= 0) {
                                return `${collectionName} (${locations.length}/${maxItems})`;
                            } else if (maxItems !== undefined && maxItems < 0) {
                                return `${collectionName} (${locations.length})`;
                            }
                            return `${collectionName} (${locations.length} địa điểm)`;
                        })()}
                        showBackButton
                        onBackPress={handleBackPress}
                        rightIcon={{
                            icon: MoreHorizontal,
                            size: 28,
                            onPress: () => setShowActionsModal(true)
                        }}
                    />


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

                    {showActionsModal && (
                        <CollectionActionsModal
                            isVisible={showActionsModal}
                            onClose={() => setShowActionsModal(false)}
                            onEdit={handleEditCollection}
                            onDelete={handleDeleteCollection}
                            isDefault={currentCollection?.isDefault === true}
                        />
                    )}

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

                    {showDeleteModal && (
                        <ConfirmDeleteModal
                            isVisible={showDeleteModal}
                            onClose={() => setShowDeleteModal(false)}
                            onConfirm={handleDeleteSuccess}
                            collectionName={currentCollection?.name || ''}
                        />
                    )}

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
    rightActionContainer: {
        height: '100%',
        paddingVertical: 8,
        justifyContent: 'center',
    },
    rightAction: {
        width: 80,
        height: '100%',
        backgroundColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    swipeableWrapper: {},
    cardContainer: {
        paddingVertical: 8,
        marginHorizontal: 12,
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
