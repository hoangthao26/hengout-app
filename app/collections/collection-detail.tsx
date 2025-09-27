import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Globe, Lock, MapPin, MoreHorizontal, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import CollectionActionsModal from '../../components/CollectionActionsModal';
import CollectionDetailCard from '../../components/CollectionDetailCard';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import EditCollectionModal from '../../components/EditCollectionModal';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import { locationFolderService } from '../../services/locationFolderService';
import { useCollectionStore } from '../../store/collectionStore';
import { LocationInFolder } from '../../types/locationFolder';

export default function CollectionDetailScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    const {
        collectionId,
        collectionName,
        collectionDescription,
        visibility,
        isDefault
    } = params as {
        collectionId: string;
        collectionName: string;
        collectionDescription: string;
        visibility: string;
        isDefault: string;
    };

    const [locations, setLocations] = useState<LocationInFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Debug modal state
    useEffect(() => {
        console.log('🔍 showActionsModal changed to:', showActionsModal);
    }, [showActionsModal]);

    // Zustand store
    const {
        currentCollection,
        setCurrentCollection,
        updateCurrentCollection,
        updateCollection,
        resetCurrentCollection
    } = useCollectionStore();

    // Load collection info into store on mount
    useEffect(() => {
        const collectionData = {
            id: collectionId,
            name: collectionName,
            description: collectionDescription,
            visibility: visibility as 'PUBLIC' | 'PRIVATE',
            isDefault: isDefault === 'true',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setCurrentCollection(collectionData);
    }, [collectionId, collectionName, collectionDescription, visibility, isDefault, setCurrentCollection]);

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
        try {
            const response = await locationFolderService.getLocationsInFolder(collectionId);
            if (response.status === 'success') {
                setLocations(response.data);
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
        await loadLocations();
        setRefreshing(false);
    }, [loadLocations]);

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            await loadLocations();
            setLoading(false);
        };

        initializeData();
    }, [loadLocations]);

    const handleLocationPress = (location: LocationInFolder) => {
        // TODO: Navigate to location detail screen
        console.log('Navigate to location:', location.locationId);
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

    const removeLocation = async (locationId: string) => {
        try {
            await locationFolderService.removeLocationFromFolder(collectionId, locationId);
            setLocations(prev => prev.filter(loc => loc.id !== locationId));
            showSuccess('Đã xóa địa điểm khỏi collection');
        } catch (error: any) {
            console.error('Failed to remove location:', error);
            showError('Không thể xóa địa điểm');
        }
    };

    const handleAddLocation = () => {
        // TODO: Navigate to location picker/search screen
        console.log('Add location to collection:', collectionId);
    };


    const handleEditLocation = (location: LocationInFolder) => {
        // TODO: Navigate to edit location screen
        console.log('Edit location:', location.id);
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

    const handleEditSuccess = () => {
        setShowEditModal(false);
        // Refresh collection info and locations after edit
        loadLocations();
        // Refresh collection info
        const refreshCollectionInfo = async () => {
            try {
                const response = await locationFolderService.getAllFolders();
                if (response.status === 'success') {
                    const updatedCollection = response.data.find(folder => folder.id === collectionId);
                    if (updatedCollection) {
                        updateCurrentCollection(updatedCollection);
                        updateCollection(collectionId, updatedCollection);
                    }
                }
            } catch (error) {
                console.error('Failed to refresh collection info:', error);
            }
        };
        refreshCollectionInfo();
    };

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
        const isProtected = isDefault === 'true'; // Protected if collection is default
        return (
            <CollectionDetailCard
                location={item}
                onPress={handleLocationPress}
                onRemove={handleRemoveLocation}
                onEdit={handleEditLocation}
                showActions={true} // Always show actions
                isProtected={isProtected} // Disable actions if collection is default
            />
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
            {isDefault !== 'true' && (
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
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title={currentCollection?.name || collectionName}
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
            <TouchableOpacity style={[styles.collectionItem, { backgroundColor: isDark ? '#232024' : '#F3F4F6' }]}>
                <View style={styles.collectionIcon}>
                    <MapPin
                        size={46}
                        color={isDark ? '#FFFFFF' : '#000000'}
                    />
                </View>
                <View style={styles.collectionInfo}>
                    <Text
                        style={[styles.collectionName, { color: isDark ? '#FFFFFF' : '#000000' }]}
                        numberOfLines={1}
                    >
                        {currentCollection?.name || collectionName}
                    </Text>
                    <Text
                        style={[styles.collectionDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                        numberOfLines={2}
                    >
                        {currentCollection?.description || collectionDescription || 'Không có mô tả'}
                    </Text>
                </View>
                <View style={styles.collectionStatus}>
                    {(() => {
                        const IconComponent = getVisibilityIcon();
                        return <IconComponent size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />;
                    })()}
                </View>
            </TouchableOpacity>

            {locations.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={locations}
                    renderItem={renderLocation}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
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
                        isDefault={isDefault === 'true'}
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
                    collectionName={currentCollection?.name || collectionName}
                    collectionDescription={currentCollection?.description || collectionDescription}
                    visibility={(currentCollection?.visibility || visibility) as 'PUBLIC' | 'PRIVATE'}
                />
            )}

            {/* Confirm Delete Modal */}
            {showDeleteModal && (
                <ConfirmDeleteModal
                    isVisible={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteSuccess}
                    collectionName={currentCollection?.name || collectionName}
                />
            )}

        </View>
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
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
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
