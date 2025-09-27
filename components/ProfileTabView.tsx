import { Bookmark, Globe, Grid3X3, List, Lock, MapPin, PlusCircle, TestTube } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { LocationFolder } from '../types/locationFolder';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileTabViewProps {
    collections: LocationFolder[];
    collectionsLoading: boolean;
    onCollectionPress: (collection: LocationFolder) => void;
    onCreateCollection: () => void;
    onOpenDeleteModal: () => void;
    onRefreshTokenTest: () => void;
    onCollectionsRefresh: () => void;
    collectionsRefreshing: boolean;
    profileInfo: React.ReactNode;
    isDark: boolean;
}

// Collections Tab Component
const CollectionsTab = React.memo(({
    collections,
    collectionsLoading,
    onCollectionPress,
    onCreateCollection,
    onOpenDeleteModal,
    onRefreshTokenTest,
    isDark
}: {
    collections: LocationFolder[];
    collectionsLoading: boolean;
    onCollectionPress: (collection: LocationFolder) => void;
    onCreateCollection: () => void;
    onOpenDeleteModal: () => void;
    onRefreshTokenTest: () => void;
    isDark: boolean;
}) => {
    return (
        <View style={{ flex: 1 }}>
            {/* Collections Section */}
            <View style={[
                styles.collectionsSection,
                {
                    backgroundColor: isDark ? '#232024' : '#F3F4F6'
                }
            ]}>
                <View style={styles.collectionsHeader}>
                    <Text style={[styles.collectionsTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Collections ({collections.length})
                    </Text>
                    <View style={styles.collectionsHeaderActions}>
                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={onRefreshTokenTest}
                        >
                            <TestTube
                                size={28}
                                color={isDark ? '#FFFFFF' : '#000000'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={onCreateCollection}
                        >
                            <PlusCircle
                                size={28}
                                color={isDark ? '#FFFFFF' : '#000000'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={onOpenDeleteModal}
                        >
                            <List
                                size={28}
                                color={isDark ? '#FFFFFF' : '#000000'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {collectionsLoading ? (
                    <View style={styles.collectionsLoading}>
                        <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Đang tải collections...
                        </Text>
                    </View>
                ) : collections.length === 0 ? (
                    <View style={styles.emptyCollections}>
                        <MapPin
                            size={32}
                            color={isDark ? '#4B5563' : '#9CA3AF'}
                        />
                        <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Chưa có collections nào
                        </Text>
                    </View>
                ) : (
                    <View style={styles.collectionsList}>
                        {collections.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.collectionItem,
                                    {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                    }
                                ]}
                                onPress={() => onCollectionPress(item)}
                            >
                                <View style={styles.collectionIcon}>
                                    <MapPin
                                        size={36}
                                        color={isDark ? '#FFFFFF' : '#000000'}
                                    />
                                </View>
                                <View style={styles.collectionInfo}>
                                    <Text
                                        style={[styles.collectionName, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        style={[styles.collectionDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                                        numberOfLines={1}
                                    >
                                        {item.description || 'Không có mô tả'}
                                    </Text>
                                </View>
                                <View style={styles.collectionStatus}>
                                    {item.visibility === 'PUBLIC' ? (
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
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
});

// Saved Tab Component
const SavedTab = React.memo(({
    isDark
}: {
    isDark: boolean;
}) => {
    return (
        <View style={{ flex: 1 }}>
            {/* Saved Section */}
            <View style={[
                styles.collectionsSection,
                {
                    backgroundColor: isDark ? '#232024' : '#F3F4F6'
                }
            ]}>
                <View style={styles.collectionsHeader}>
                    <Text style={[styles.collectionsTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Saved (0)
                    </Text>
                </View>

                <View style={styles.emptyCollections}>
                    <Bookmark
                        size={32}
                        color={isDark ? '#4B5563' : '#9CA3AF'}
                    />
                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Chưa có saved items nào
                    </Text>
                </View>
            </View>
        </View>
    );
});

const ProfileTabView: React.FC<ProfileTabViewProps> = ({
    collections,
    collectionsLoading,
    onCollectionPress,
    onCreateCollection,
    onOpenDeleteModal,
    onRefreshTokenTest,
    onCollectionsRefresh,
    collectionsRefreshing,
    profileInfo,
    isDark,
}) => {
    const renderTabBar = useCallback((props: any) => {
        // Use default tab bar with custom styling
        return (
            <View style={{
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                borderBottomWidth: 1,
                flexDirection: 'row',
            }}>
                {props.navigationState?.routes?.map((route: any, index: number) => (
                    <TouchableOpacity
                        key={route.key}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 16,
                            borderBottomWidth: 2,
                            borderBottomColor: props.navigationState.index === index ? '#F48C06' : 'transparent',
                            flexDirection: 'row',
                            gap: 8,
                        }}
                        onPress={() => props.jumpTo(route.key)}
                    >
                        {route.key === 'collections' ? (
                            <Grid3X3
                                size={20}
                                color={props.navigationState.index === index
                                    ? (isDark ? '#FFFFFF' : '#000000')
                                    : (isDark ? '#9CA3AF' : '#6B7280')
                                }
                            />
                        ) : (
                            <Bookmark
                                size={20}
                                color={props.navigationState.index === index
                                    ? (isDark ? '#FFFFFF' : '#000000')
                                    : (isDark ? '#9CA3AF' : '#6B7280')
                                }
                            />
                        )}
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: props.navigationState.index === index
                                ? (isDark ? '#FFFFFF' : '#000000')
                                : (isDark ? '#9CA3AF' : '#6B7280')
                        }}>
                            {route.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }, [isDark]);

    return (
        <Tabs.Container
            renderHeader={() => <>{profileInfo}</>}
            headerHeight={200}
            renderTabBar={renderTabBar}
            lazy={true}
        >
            <Tabs.Tab name="collections" label="Collections">
                <CollectionsTab
                    collections={collections}
                    collectionsLoading={collectionsLoading}
                    onCollectionPress={onCollectionPress}
                    onCreateCollection={onCreateCollection}
                    onOpenDeleteModal={onOpenDeleteModal}
                    onRefreshTokenTest={onRefreshTokenTest}
                    isDark={isDark}
                />
            </Tabs.Tab>
            <Tabs.Tab name="saved" label="Saved">
                <SavedTab
                    isDark={isDark}
                />
            </Tabs.Tab>
        </Tabs.Container>
    );
};

const styles = {
    collectionsSection: {
        width: '95%' as const,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: 'center' as const,
        marginTop: 16,
    },
    collectionsHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        marginBottom: 12,
    },
    collectionsTitle: {
        fontSize: 18,
        fontWeight: '600' as const,
    },
    collectionsHeaderActions: {
        flexDirection: 'row' as const,
        gap: 4,
    },
    headerActionButton: {
        padding: 4,
    },
    collectionsLoading: {
        paddingVertical: 20,
        alignItems: 'center' as const,
    },
    emptyCollections: {
        paddingVertical: 32,
        alignItems: 'center' as const,
    },
    emptyText: {
        fontSize: 14,
        marginTop: 8,
    },
    collectionItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginBottom: 8,
        borderRadius: 12,
        minHeight: 60,
    },
    collectionIcon: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginRight: 12,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionStatus: {
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingLeft: 12,
        paddingRight: 12,
    },
    collectionName: {
        fontSize: 16,
        fontWeight: '500' as const,
        marginBottom: 2,
    },
    collectionDescription: {
        fontSize: 13,
        opacity: 0.7,
    },
    collectionsList: {
        // No height limit since it's in ScrollView
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '500' as const,
        textAlign: 'center' as const,
        marginTop: 20,
    },
};

export default ProfileTabView;