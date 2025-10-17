import { Ban, UserMinus, UserPlus, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import ContextMenu from '../../components/ContextMenu';
import Header from '../../components/Header';
import SearchUserItem from '../../components/SearchUserItem';
import SimpleAvatar from '../../components/SimpleAvatar';
import { FeatureErrorBoundary } from '../../components/FeatureErrorBoundary';
import { useToast } from '../../contexts/ToastContext';
import { useFriendActions } from '../../hooks/useFriendActions';
import NavigationService from '../../services/navigationService';
import { socialService } from '../../services/socialService';
import { userSearchService } from '../../services/userSearchService';
import { chatService } from '../../services/chatService';
import { useChatStore } from '../../store/chatStore';
import { Friend, SearchUser } from '../../types/social';

export default function FriendsListScreen() {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    // Chat store for refreshing conversations
    const { setConversations } = useChatStore();

    const [friends, setFriends] = useState<Friend[]>([]);
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    // Use custom hook for friend actions
    const {
        processingUser,
        handleSendFriendRequest,
        handleCancelRequest,
        handleRemoveFriend,
        handleAcceptRequestFromSearch,
        handleRejectRequestFromSearch,
        handleBlockUser,
    } = useFriendActions(searchResults, setSearchResults);

    // Function to refresh conversations after friend actions
    const refreshConversations = useCallback(async () => {
        try {
            console.log('🔄 [Friends List] Refreshing conversations after friend action...');
            const response = await chatService.getConversations();
            if (response.status === 'success') {
                setConversations(response.data);
                console.log('✅ [Friends List] Conversations refreshed successfully');
            } else {
                console.warn('⚠️ [Friends List] Failed to refresh conversations:', response.message);
            }
        } catch (error) {
            console.error('❌ [Friends List] Error refreshing conversations:', error);
        }
    }, [setConversations]);

    useEffect(() => {
        loadFriends();
    }, []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle search when debounced query changes
    useEffect(() => {
        if (debouncedSearchQuery.trim()) {
            handleSearch(debouncedSearchQuery);
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearchQuery]);

    const loadFriends = async () => {
        try {
            setLoading(true);
            const friendsData = await socialService.getFriends();
            setFriends(friendsData);
        } catch (error) {
            console.error('Error loading friends:', error);
            Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFriendFromList = (friendId: string, friendName: string) => {
        Alert.alert(
            'Xóa bạn bè',
            `Bạn có chắc chắn muốn xóa ${friendName} khỏi danh sách bạn bè?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => removeFriend(friendId),
                },
            ]
        );
    };

    const handleBlockFriendFromList = (friendId: string, friendName: string) => {
        Alert.alert(
            'Chặn bạn bè',
            `Bạn có chắc chắn muốn chặn ${friendName}? Hành động này không thể hoàn tác.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Chặn',
                    style: 'destructive',
                    onPress: () => blockFriend(friendId),
                },
            ]
        );
    };

    const removeFriend = async (friendId: string) => {
        try {
            await socialService.removeFriend(friendId);
            setFriends(prev => prev.filter(friend => friend.friendId !== friendId));
            showSuccess('Đã xóa bạn bè');

            // Refresh conversations to update conversation list (private conversation may be hidden/removed)
            await refreshConversations();
        } catch (error) {
            console.error('Error removing friend:', error);
            showError('Không thể xóa bạn bè');
        }
    };

    const blockFriend = async (friendId: string) => {
        try {
            await socialService.blockFriend(friendId, 'BLOCKED');
            setFriends(prev => prev.filter(friend => friend.friendId !== friendId));
            showSuccess('Đã chặn bạn bè');

            // Refresh conversations to update conversation list (private conversation may be hidden/removed)
            await refreshConversations();
        } catch (error) {
            console.error('Error blocking friend:', error);
            showError('Không thể chặn bạn bè');
        }
    };

    const filteredFriends = friends.filter(friend =>
        friend.friendName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
        setSearchResults([]);
    }, []);

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearchLoading(true);
            console.log('🔍 Friends List - Starting search for:', query);

            const response = await userSearchService.searchUsers({
                query,
                page: 0,
                size: 10
            });

            console.log('📋 Friends List - Search response:', response);
            console.log('📋 Friends List - Search results content:', response.data.content);

            setSearchResults(response.data.content);

            console.log('✅ Friends List - Search results set:', response.data.content.length, 'users');
        } catch (error: any) {
            console.error('❌ Friends List - Failed to search users:', error);
            showError(`Failed to search users: ${error.message}`);
        } finally {
            setSearchLoading(false);
        }
    };


    const renderFriendItem = ({ item }: { item: Friend }) => {
        const menuActions = [
            {
                id: 'remove',
                title: 'Xóa bạn',
                icon: UserMinus,
                onPress: () => handleRemoveFriendFromList(item.friendId, item.friendName),
                destructive: true,
            },
            {
                id: 'block',
                title: 'Chặn',
                icon: Ban,
                onPress: () => handleBlockFriendFromList(item.friendId, item.friendName),
                destructive: true,
            },
        ];

        return (
            <View style={[styles.friendItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                <View style={styles.friendInfo}>
                    <SimpleAvatar
                        size={55}
                        avatarUrl={item.avatarUrl || undefined}
                    />
                    <View style={styles.friendDetails}>
                        <Text style={[styles.friendName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            {item.friendName}
                        </Text>
                        <Text style={[styles.friendEmail, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Bạn bè từ {new Date(item.friendsSince).toLocaleDateString('vi-VN')}
                        </Text>
                    </View>
                </View>
                <ContextMenu
                    actions={menuActions}
                    disabled={processingUser === item.friendId}
                />
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <FeatureErrorBoundary feature="Friends">
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <Header
                    title="Bạn bè của bạn"
                    onBackPress={() => NavigationService.goBack()}
                />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Thêm bạn mới"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchLoading ? (
                        <ActivityIndicator size="small" color="#F48C06" style={styles.searchButton} />
                    ) : (
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={searchQuery ? clearSearch : undefined}
                        >
                            {searchQuery ? (
                                <X
                                    size={20}
                                    color="#9CA3AF"
                                />
                            ) : (
                                <UserPlus
                                    size={20}
                                    color="#9CA3AF"
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Content */}
                {searchQuery ? (
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <SearchUserItem
                                user={item}
                                onAddFriend={handleSendFriendRequest}
                                onRemoveFriend={handleRemoveFriend}
                                onCancelRequest={handleCancelRequest}
                                onAcceptRequest={handleAcceptRequestFromSearch}
                                onRejectRequest={handleRejectRequestFromSearch}
                                onBlock={handleBlockUser}
                                loading={processingUser === item.id}
                                disabled={processingUser === item.id}
                            />
                        )}
                        style={styles.friendsList}
                        contentContainerStyle={styles.friendsListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    Không tìm thấy người dùng nào
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        data={filteredFriends}
                        keyExtractor={(item) => item.friendId}
                        renderItem={renderFriendItem}
                        style={styles.friendsList}
                        contentContainerStyle={styles.friendsListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Users
                                    size={64}
                                    color={isDark ? '#4B5563' : '#9CA3AF'}
                                />
                                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    Chưa có bạn bè nào
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        color: '#000000',
    },
    searchButton: {
        marginLeft: 8,
    },
    friendsList: {
        flex: 1,
    },
    friendsListContent: {
        paddingBottom: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendDetails: {
        marginLeft: 12,
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    friendEmail: {
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});
