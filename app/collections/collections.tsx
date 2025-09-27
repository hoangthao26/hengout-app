import { useRouter } from 'expo-router';
import { FolderOpen, Plus } from 'lucide-react-native';
import NavigationService from '../../services/navigationService';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import CollectionCard from '../../components/CollectionCard';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import { locationFolderService } from '../../services/locationFolderService';
import { LocationFolder } from '../../types/locationFolder';

export default function CollectionsScreen() {
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    const [collections, setCollections] = useState<LocationFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCollections = useCallback(async () => {
        try {
            const response = await locationFolderService.getAllFolders();
            if (response.status === 'success') {
                setCollections(response.data);
            } else {
                showError('Không thể tải danh sách collections');
            }
        } catch (error: any) {
            console.error('Failed to load collections:', error);
            showError(`Lỗi: ${error.message}`);
        }
    }, [showError]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCollections();
        setRefreshing(false);
    }, [loadCollections]);

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            await loadCollections();
            setLoading(false);
        };

        initializeData();
    }, [loadCollections]);

    const handleCollectionPress = (collection: LocationFolder) => {
        NavigationService.goToCollectionDetail(collection.id);
    };

    const handleCreateCollection = () => {
        // TODO: Navigate to create collection screen
        console.log('Create collection');
    };

    const renderCollection = ({ item }: { item: LocationFolder }) => (
        <CollectionCard
            collection={item}
            onPress={handleCollectionPress}
            locationCount={0} // TODO: Get actual location count from API
        />
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <FolderOpen
                size={64}
                color={isDark ? '#4B5563' : '#9CA3AF'}
            />
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Chưa có collections nào
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Tạo collection đầu tiên để lưu trữ các địa điểm yêu thích
            </Text>
            <TouchableOpacity
                style={[styles.createButton, { backgroundColor: '#F48C06' }]}
                onPress={handleCreateCollection}
            >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Tạo Collection</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <ActivityIndicator size="large" color="#F48C06" />
                <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Đang tải collections...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title="Collections"
                showBackButton
                rightIcon={{
                    icon: Plus,
                    size: 28,
                    onPress: handleCreateCollection
                }}
            />

            {collections.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={collections}
                    renderItem={renderCollection}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListHeaderComponent={
                        <View style={styles.headerContainer}>
                            <Text style={[styles.headerSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {collections.length} collections
                            </Text>
                        </View>
                    }
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
    listContent: {
        paddingBottom: 20,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    // headerTitle removed - now using Header component title
    headerSubtitle: {
        fontSize: 16,
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
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
