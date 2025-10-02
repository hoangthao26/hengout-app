import { useRouter } from 'expo-router';
import { Search, UserPlus, Users, X } from 'lucide-react-native';
import NavigationService from '../../services/navigationService';
import React, { useCallback, useEffect, useState } from 'react';
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
        // Enterprise Store-First Messages
        setConversationMessages,
        setMessageSnapshot,
        preloadMessages
    } = useChatStore();

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

    // Enterprise Preloading Strategy: Load conversations + recent messages
    const loadConversations = useCallback(async () => {
        try {
            setConversationsLoading(true);

            // Load from SQLite first (instant)
            if (chatSyncInitialized) {
                const localConversations = await getConversationsFromDB();
                setConversations(localConversations);
                setFilteredConversations(localConversations);

                // 🚀 ENTERPRISE PRELOADING: Load recent messages for top conversations
                console.log('🚀 [Enterprise Chat] Preloading recent messages for instant display...');
                const topConversations = localConversations.slice(0, 5); // Top 5 conversations

                for (const conversation of topConversations) {
                    try {
                        const recentMessages = await getMessagesFromDB(conversation.id, 20, 0); // Last 20 messages
                        if (recentMessages.length > 0) {
                            // Store in conversation messages
                            setConversationMessages(conversation.id, recentMessages);
                            // Create snapshot for instant display
                            setMessageSnapshot(conversation.id, recentMessages.slice(0, 10)); // Keep 10 for instant display
                            console.log(`⚡ [Enterprise Chat] Preloaded ${recentMessages.length} messages for conversation: ${conversation.name}`);
                        }
                    } catch (preloadError) {
                        console.error(`Failed to preload messages for conversation ${conversation.id}:`, preloadError);
                        // Continue with other conversations
                    }
                }

                // ✅ Background sync từ server (không update UI, chỉ sync database)
                try {
                    const response = await chatService.getConversations();
                    if (response.status === 'success') {
                        // ✅ Chỉ sync vào database, không update UI (tránh flicker)
                        console.log('🔄 [Background Sync] Synced conversations to database');
                    }
                } catch (syncError) {
                    console.error('Background sync failed:', syncError);
                    // Continue with local data
                }
            } else {
                // Fallback to direct API call if SQLite not ready
                const response = await chatService.getConversations();
                if (response.status === 'success') {
                    setConversations(response.data);
                    setFilteredConversations(response.data);
                } else {
                    error('Không thể tải danh sách cuộc trò chuyện');
                }
            }
        } catch (err: any) {
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

    // ✅ OPTIMISTIC REFRESH - Không clear data khi refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (chatSyncInitialized) {
                // ✅ Force sync trong background, không clear UI
                await forceSync();

                // ✅ Load fresh data từ database (đã được sync)
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
        setOnCreateGroupSuccess(() => loadConversations);
        openCreateGroupModal();
    }, [setOnCreateGroupSuccess, openCreateGroupModal, loadConversations]);

    // Load conversations on mount (only if not already loaded by initialization)
    useEffect(() => {
        // Only load if conversations are empty (not preloaded by initialization service)
        if (conversations.length === 0) {
            loadConversations();
        }
    }, [loadConversations, conversations.length]);

    // Update filtered conversations when store conversations change
    useEffect(() => {
        if (searchQuery.trim()) {
            filterConversations(searchQuery);
        } else {
            setFilteredConversations(conversations);
        }
    }, [conversations, searchQuery, filterConversations]);

    // Render conversation item
    const renderConversationItem = ({ item }: { item: ChatConversation }) => {
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
                            <Users
                                size={24}
                                color={isDark ? '#9CA3AF' : '#6B7280'}
                            />
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
                    <Text
                        style={[styles.lastMessage, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                        numberOfLines={1}
                    >
                        {lastMessage}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Header */}
            <Header
                title="Chat"
                showBackButton={false}
                rightIcons={[
                    {
                        icon: UserPlus,
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

            {/* Temporary Database Reset Button for Testing */}
            <DatabaseResetButton />

        </View>
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
    lastMessage: {
        fontSize: 14,
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
