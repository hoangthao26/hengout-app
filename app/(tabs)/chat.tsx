import { useRouter } from 'expo-router';
import { Search, UserPlus, Users, User, X, PlusCircle, MessageCirclePlus } from 'lucide-react-native';
import NavigationService from '../../services/navigationService';
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ChatErrorBoundary } from '../../components/errorBoundaries';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Header from '../../components/Header';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { chatService } from '../../services/chatService';
import { useChatStore } from '../../store/chatStore';
import { useChatSync } from '../../hooks/useChatSync';
import { ChatConversation } from '../../types/chat';
import DatabaseResetButton from '../../components/DatabaseResetButton';
import Badge from '../../components/Badge';
import { useNotificationStore } from '../../store/notificationStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error } = useToast();
    const { openCreateGroupModal, setOnCreateGroupSuccess } = useModal();
    const router = useRouter();

    const {
        conversations,
        conversationsLoading,
        setConversations,
        setConversationsLoading,
        // Store-First Messages
        setConversationMessages,
        setMessageSnapshot,
        preloadMessages
    } = useChatStore();

    const { hasUnreadMessages } = useNotificationStore();

    // SQLite Chat Sync
    const {
        isInitialized: chatSyncInitialized,
        isSyncing,
        getConversations: getConversationsFromDB,
        getMessages: getMessagesFromDB,
        forceSync
    } = useChatSync();

    const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Subscribe to store changes for real-time updates
    // This ensures new conversations appear immediately without pull-to-refresh
    useEffect(() => {
        if (searchQuery.trim()) {
            filterConversations(searchQuery);
        } else {
            setFilteredConversations(conversations);
        }
    }, [conversations, searchQuery, filterConversations]);

    // Preloading Strategy: Load conversations + recent messages
    const loadConversations = useCallback(async () => {
        try {
            setConversationsLoading(true);

            // Load from SQLite first (instant)
            if (chatSyncInitialized) {
                const localConversations = await getConversationsFromDB();
                setConversations(localConversations);
                // setFilteredConversations sẽ được cập nhật tự động qua useEffect

                // MVP OPTIMIZATION: Disabled preloading to reduce memory usage
                // Preloading messages for top conversations is disabled for better performance
                console.log('[MVP Chat] Conversations loaded without preloading messages');

                // MVP OPTIMIZATION: Disabled background sync to reduce network calls
                // Background sync is disabled for better performance, rely on WebSocket for real-time updates
                console.log('[MVP Chat] Skipped background sync, using WebSocket for real-time updates');
            } else {
                // Fallback to direct API call if SQLite not ready
                const response = await chatService.getConversations();
                if (response.status === 'success') {
                    setConversations(response.data);
                    // setFilteredConversations sẽ được cập nhật tự động qua useEffect
                } else {
                    error('Không thể tải danh sách cuộc trò chuyện');
                }
            }
        } catch (err: any) {
            // DEFENSIVE: Don't show error if user logged out
            if (err.message?.includes('User logged out')) {
                console.log('[Chat] User logged out, skipping conversation load');
                return;
            }
            console.error('Failed to load conversations:', err);
            error('Lỗi khi tải cuộc trò chuyện');
        } finally {
            setConversationsLoading(false);
            setRefreshing(false);
        }
    }, [chatSyncInitialized, getConversationsFromDB, getMessagesFromDB, error, setConversations, setConversationsLoading, setConversationMessages, setMessageSnapshot]);

    // Filter conversations based on search query
    const filterConversations = useCallback((query: string) => {
        if (!query.trim()) {
            setFilteredConversations(conversations);
            return;
        }

        const filtered = conversations.filter(conversation => {
            const name = chatService.getConversationDisplayName(conversation).toLowerCase();
            const lastMessage = conversation.lastMessage ?
                chatService.formatMessageContent(conversation.lastMessage).toLowerCase() : '';

            return name.includes(query.toLowerCase()) ||
                lastMessage.includes(query.toLowerCase());
        });

        setFilteredConversations(filtered);
    }, [conversations]);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            filterConversations(searchQuery);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, filterConversations]);

    // Clear search
    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setFilteredConversations(conversations);
    }, [conversations]);

    // OPTIMISTIC REFRESH - Không clear data khi refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (chatSyncInitialized) {
                // Force sync trong background, không clear UI
                await forceSync();

                // Load fresh data từ database (đã được sync)
                const freshConversations = await getConversationsFromDB();
                setConversations(freshConversations);
                setFilteredConversations(freshConversations);
            } else {
                // Fallback to direct API call
                const response = await chatService.getConversations();
                if (response.status === 'success') {
                    setConversations(response.data);
                    setFilteredConversations(response.data);
                }
            }
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    }, [chatSyncInitialized, forceSync, getConversationsFromDB, setConversations]);

    // Handle conversation press
    const handleConversationPress = useCallback((conversation: ChatConversation) => {
        NavigationService.goToChatConversation(conversation.id);
    }, []);

    // Handle create group
    const handleCreateGroup = useCallback(() => {
        // Không cần reload toàn bộ danh sách nữa vì conversation đã được thêm vào store ngay lập tức
        setOnCreateGroupSuccess(() => {
            console.log('[Chat] Group created successfully, conversation already added to store');
        });
        openCreateGroupModal();
    }, [setOnCreateGroupSuccess, openCreateGroupModal]);

    // Load conversations on mount and when screen is focused
    useEffect(() => {
        // Load conversations on initial mount
        loadConversations();
    }, [loadConversations]);

    // REMOVED: useFocusEffect reload - not needed because:
    // 1. WebSocket updates store in real-time
    // 2. Store changes trigger UI re-render automatically
    // 3. Reloading from database can overwrite real-time updates
    // 4. This was causing the "old preview" issue

    // useFocusEffect(
    //     useCallback(() => {
    //         console.log('[Chat] Screen focused, reloading conversations...');
    //         loadConversations();
    //     }, [loadConversations])
    // );

    // Note: This is now handled in the useEffect above (line 66)
    // Removed duplicate useEffect to avoid conflicts

    // Render conversation item
    const renderConversationItem = ({ item }: { item: ChatConversation }) => {
        // Debug log to check lastMessage data
        if (item.lastMessage?.type === 'ACTIVITY') {
            console.log('[ConversationList] Activity lastMessage:', {
                conversationId: item.id,
                conversationName: item.name,
                lastMessage: item.lastMessage,
                content: item.lastMessage.content,
                name: item.lastMessage.content?.name,
                purpose: item.lastMessage.content?.purpose
            });
        }

        const lastMessage = chatService.formatLastMessage(item);
        const timestamp = item.lastMessage ? chatService.formatTimestamp(item.lastMessage.createdAt) : '';

        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => handleConversationPress(item)}
            >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {item.avatarUrl ? (
                        <Image
                            source={{ uri: item.avatarUrl }}
                            style={[
                                styles.avatar,
                                { borderColor: item.type === 'GROUP' ? '#F48C06' : '#9CA3AF' }
                            ]}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={[
                            styles.defaultAvatar,
                            {
                                backgroundColor: isDark ? '#374151' : '#E5E7EB',
                                borderColor: item.type === 'GROUP' ? '#F48C06' : '#9CA3AF'
                            }
                        ]}>
                            {item.type === 'GROUP' ? (
                                <Users size={30} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            ) : (
                                <User size={30} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            )}
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                        <Text
                            style={[styles.conversationName, { color: isDark ? '#FFFFFF' : '#000000' }]}
                            numberOfLines={1}
                        >
                            {chatService.getConversationDisplayName(item)}
                        </Text>
                        {timestamp && (
                            <Text style={[styles.timestamp, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {timestamp}
                            </Text>
                        )}
                    </View>
                    <View style={styles.lastMessageContainer}>
                        <Text
                            style={[
                                styles.lastMessage,
                                {
                                    // Highlight when has unread messages
                                    fontWeight: hasUnreadMessages(item.id) ? '600' : '400',
                                    color: hasUnreadMessages(item.id)
                                        ? (isDark ? '#FFFFFF' : '#000000')
                                        : (isDark ? '#9CA3AF' : '#6B7280')
                                }
                            ]}
                            numberOfLines={1}
                        >
                            {lastMessage}
                        </Text>
                        {/* Gradient dot for unread messages */}
                        {hasUnreadMessages(item.id) && (
                            <LinearGradient
                                colors={['#FAA307', '#F48C06', '#DC2F02', '#9D0208']}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.unreadDot}
                            />
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ChatErrorBoundary>
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <Header
                    title="Chat"
                    showBackButton={false}
                    rightIcons={[
                        {
                            icon: MessageCirclePlus,
                            size: 28,
                            onPress: handleCreateGroup,
                        }
                    ]}
                />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm cuộc trò chuyện..."
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
                                <Search
                                    size={20}
                                    color="#9CA3AF"
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Conversations List - Scrollable between header and tabs */}
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversationItem}
                    style={styles.conversationsList}
                    contentContainerStyle={styles.conversationsContent}
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={isDark ? '#FFFFFF' : '#000000'}
                        />
                    }
                    ListEmptyComponent={
                        !conversationsLoading ? (
                            <View style={styles.emptyState}>
                                <Users
                                    size={48}
                                    color={isDark ? '#4B5563' : '#9CA3AF'}
                                />
                                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
                                </Text>
                            </View>
                        ) : null
                    }
                />

                {/* Database Reset Button - Commented out after one-time reset */}
                {/* <DatabaseResetButton /> */}

            </View>
        </ChatErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
    },
    createGroupButton: {
        padding: 8,
        borderRadius: 8,
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
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 1,
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
    conversationsList: {
        flex: 1,
        marginBottom: 0,
    },
    conversationsContent: {
        paddingVertical: 8,
        flexGrow: 1,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    defaultAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    conversationContent: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    timestamp: {
        fontSize: 14,
        marginLeft: 8,
    },
    lastMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
        color: '#9CA3AF',
    },
});



