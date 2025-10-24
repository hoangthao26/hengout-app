import { create } from 'zustand';
import { ChatConversation, ChatMember, ChatMessage } from '../types/chat';
import { chatWebSocketManager } from '../services/chatWebSocketManager';
import { conversationCleanupManager } from '../services/conversationCleanupManager';

// MEMORY MANAGEMENT CONSTANTS
const MAX_CONVERSATIONS_IN_MEMORY = 50;
const MAX_MESSAGES_PER_CONVERSATION = 100;
const INACTIVE_CONVERSATION_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days

interface ChatState {
    // Conversations
    conversations: ChatConversation[];
    currentConversation: ChatConversation | null;
    conversationsLoading: boolean;
    conversationsError: string | null;

    // Enterprise Store-First Messages
    conversationMessages: { [conversationId: string]: ChatMessage[] };
    messageSnapshots: { [conversationId: string]: ChatMessage[] }; // Recent messages for instant display
    messagesLoading: { [conversationId: string]: boolean };
    messagesError: { [conversationId: string]: string | null };
    hasMoreMessages: { [conversationId: string]: boolean };
    lastMessageTimestamp: { [conversationId: string]: string };

    // Legacy Messages removed - using conversationMessages instead

    // Enterprise Message Caching & Sync
    cachedMessages: { [conversationId: string]: ChatMessage[] };
    lastSyncTime: { [conversationId: string]: number };
    preloadedConversations: string[];
    syncStatus: { [conversationId: string]: 'idle' | 'syncing' | 'error' };

    // Members
    members: { [conversationId: string]: ChatMember[] };
    membersLoading: { [conversationId: string]: boolean };
    membersError: { [conversationId: string]: string | null };

    // UI State
    selectedConversationId: string | null;
    isTyping: { [conversationId: string]: boolean };
    unreadCount: { [conversationId: string]: number };

    // WebSocket State
    websocketConnected: boolean;
    websocketConnecting: boolean;
}

interface ChatActions {
    // Conversations
    setConversations: (conversations: ChatConversation[]) => void;
    addConversation: (conversation: ChatConversation) => void;
    updateConversation: (conversationId: string, updates: Partial<ChatConversation>) => void;
    removeConversation: (conversationId: string) => void;
    setCurrentConversation: (conversation: ChatConversation | null) => void;
    setConversationsLoading: (loading: boolean) => void;
    setConversationsError: (error: string | null) => void;

    // Enterprise Store-First Messages
    setConversationMessages: (conversationId: string, messages: ChatMessage[]) => void;
    addConversationMessage: (conversationId: string, message: ChatMessage) => void;
    updateConversationMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
    removeConversationMessage: (conversationId: string, messageId: string) => void;
    appendConversationMessages: (conversationId: string, messages: ChatMessage[]) => void;
    prependConversationMessages: (conversationId: string, messages: ChatMessage[]) => void;
    setMessagesLoading: (conversationId: string, loading: boolean) => void;
    setMessagesError: (conversationId: string, error: string | null) => void;
    clearConversationMessages: (conversationId: string) => void;
    setHasMoreMessages: (conversationId: string, hasMore: boolean) => void;
    setLastMessageTimestamp: (conversationId: string, timestamp: string) => void;

    // Enterprise Message Snapshots (for instant display)
    setMessageSnapshot: (conversationId: string, messages: ChatMessage[]) => void;
    getMessageSnapshot: (conversationId: string) => ChatMessage[];
    clearMessageSnapshot: (conversationId: string) => void;

    // Enterprise Message Caching
    getCachedMessages: (conversationId: string) => ChatMessage[];
    updateCachedMessages: (conversationId: string, messages: ChatMessage[]) => void;
    preloadMessages: (conversationId: string, messages: ChatMessage[]) => void;
    shouldSyncMessages: (conversationId: string) => boolean;
    markSyncTime: (conversationId: string) => void;
    setSyncStatus: (conversationId: string, status: 'idle' | 'syncing' | 'error') => void;
    clearCache: (conversationId?: string) => void;

    // Members
    setMembers: (conversationId: string, members: ChatMember[]) => void;
    addMember: (conversationId: string, member: ChatMember) => void;
    removeMember: (conversationId: string, memberId: string) => void;
    updateMember: (conversationId: string, memberId: string, updates: Partial<ChatMember>) => void;
    setMembersLoading: (conversationId: string, loading: boolean) => void;
    setMembersError: (conversationId: string, error: string | null) => void;

    // UI State
    setSelectedConversationId: (conversationId: string | null) => void;
    setIsTyping: (conversationId: string, isTyping: boolean) => void;
    setUnreadCount: (conversationId: string, count: number) => void;
    incrementUnreadCount: (conversationId: string) => void;
    clearUnreadCount: (conversationId: string) => void;

    // WebSocket Actions
    connectWebSocket: () => Promise<void>;
    disconnectWebSocket: () => Promise<void>;
    subscribeToConversation: (conversationId: string) => void;
    unsubscribeFromConversation: (conversationId: string) => void;
    sendWebSocketMessage: (messageData: {
        conversationId: string;
        type: 'TEXT' | 'ACTIVITY';
        content: {
            text?: string;
            // ACTIVITY content
            activityId?: string;
            name?: string;
            purpose?: string;
        };
    }) => void;
    setWebSocketConnected: (connected: boolean) => void;
    setWebSocketConnecting: (connecting: boolean) => void;

    // MEMORY MANAGEMENT ACTIONS
    cleanupInactiveConversations: () => void;
    cleanupOldMessages: (conversationId: string) => void;
    limitConversationsInMemory: () => void;

    // Utility
    reset: () => void;
    resetConversation: (conversationId: string) => void;
}

type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
    // Conversations
    conversations: [],
    currentConversation: null,
    conversationsLoading: false,
    conversationsError: null,

    // Enterprise Store-First Messages
    conversationMessages: {},
    messageSnapshots: {},
    messagesLoading: {},
    messagesError: {},
    hasMoreMessages: {},
    lastMessageTimestamp: {},

    // Legacy Messages removed - using conversationMessages instead

    // Enterprise Message Caching & Sync
    cachedMessages: {},
    lastSyncTime: {},
    preloadedConversations: [],
    syncStatus: {},

    // Members
    members: {},
    membersLoading: {},
    membersError: {},

    // UI State
    selectedConversationId: null,
    isTyping: {},
    unreadCount: {},

    // WebSocket State
    websocketConnected: false,
    websocketConnecting: false,
};

export const useChatStore = create<ChatStore>((set, get) => ({
    ...initialState,

    // ==================== CONVERSATIONS ====================

    setConversations: (conversations) => set((state) => {
        // MEMORY MANAGEMENT: Limit conversations in memory
        const limitedConversations = conversations.length > MAX_CONVERSATIONS_IN_MEMORY
            ? conversations.slice(0, MAX_CONVERSATIONS_IN_MEMORY)
            : conversations;

        if (conversations.length > MAX_CONVERSATIONS_IN_MEMORY) {
            console.log(`🧹 [Memory] Limited conversations in memory: ${conversations.length} → ${limitedConversations.length}`);
        }

        // SẮP XẾP conversations theo lastMessage.createdAt (DESC), nếu null thì dùng createdAt
        const sortedConversations = limitedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return { conversations: sortedConversations };
    }),

    addConversation: (conversation) => set((state) => {
        const newConversations = [conversation, ...state.conversations];

        // MEMORY MANAGEMENT: Auto cleanup if too many conversations
        if (newConversations.length > MAX_CONVERSATIONS_IN_MEMORY) {
            console.log(`🧹 [Memory] Auto cleanup triggered: ${newConversations.length} conversations`);
            const limitedConversations = newConversations.slice(0, MAX_CONVERSATIONS_IN_MEMORY);
            const removedConversations = newConversations.slice(MAX_CONVERSATIONS_IN_MEMORY);

            // Remove data for removed conversations
            const newConversationMessages = { ...state.conversationMessages };
            const newMessageSnapshots = { ...state.messageSnapshots };
            const newCachedMessages = { ...state.cachedMessages };
            const newMembers = { ...state.members };
            const newMessagesLoading = { ...state.messagesLoading };
            const newMessagesError = { ...state.messagesError };
            const newMembersLoading = { ...state.membersLoading };
            const newMembersError = { ...state.membersError };

            removedConversations.forEach(conv => {
                delete newConversationMessages[conv.id];
                delete newMessageSnapshots[conv.id];
                delete newCachedMessages[conv.id];
                delete newMembers[conv.id];
                delete newMessagesLoading[conv.id];
                delete newMessagesError[conv.id];
                delete newMembersLoading[conv.id];
                delete newMembersError[conv.id];
            });

            // SẮP XẾP conversations theo lastMessage.createdAt (DESC), nếu null thì dùng createdAt
            const sortedLimitedConversations = limitedConversations.sort((a, b) => {
                const aTime = a.lastMessage?.createdAt || a.createdAt;
                const bTime = b.lastMessage?.createdAt || b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            });

            return {
                conversations: sortedLimitedConversations,
                conversationMessages: newConversationMessages,
                messageSnapshots: newMessageSnapshots,
                cachedMessages: newCachedMessages,
                members: newMembers,
                messagesLoading: newMessagesLoading,
                messagesError: newMessagesError,
                membersLoading: newMembersLoading,
                membersError: newMembersError
            };
        }

        // 🧹 CLEANUP: Trigger cleanup if too many conversations
        if (newConversations.length > MAX_CONVERSATIONS_IN_MEMORY * 1.5) {
            console.log('🧹 [ChatStore] Too many conversations, triggering cleanup');
            conversationCleanupManager.cleanupInactiveConversations().catch(error => {
                console.error('❌ [ChatStore] Cleanup failed:', error);
            });
        }

        // SẮP XẾP conversations theo lastMessage.createdAt (DESC), nếu null thì dùng createdAt
        const sortedConversations = newConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return { conversations: sortedConversations };
    }),

    updateConversation: (conversationId, updates) => set((state) => {
        const updatedConversations = state.conversations.map(conv =>
            conv.id === conversationId ? { ...conv, ...updates } : conv
        );

        // SẮP XẾP LẠI conversations theo lastMessage.createdAt (DESC)
        const sortedConversations = updatedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return {
            conversations: sortedConversations,
            currentConversation: state.currentConversation?.id === conversationId
                ? { ...state.currentConversation, ...updates }
                : state.currentConversation
        };
    }),

    removeConversation: (conversationId) => set((state) => ({
        conversations: state.conversations.filter(conv => conv.id !== conversationId),
        currentConversation: state.currentConversation?.id === conversationId
            ? null
            : state.currentConversation,
        selectedConversationId: state.selectedConversationId === conversationId
            ? null
            : state.selectedConversationId
    })),

    setCurrentConversation: (conversation) => set({ currentConversation: conversation }),

    setConversationsLoading: (loading) => set({ conversationsLoading: loading }),

    setConversationsError: (error) => set({ conversationsError: error }),

    // ==================== LEGACY MESSAGES REMOVED ====================
    // Using conversationMessages actions instead

    setMessagesLoading: (conversationId, loading) => set((state) => ({
        messagesLoading: {
            ...state.messagesLoading,
            [conversationId]: loading
        }
    })),

    setMessagesError: (conversationId, error) => set((state) => ({
        messagesError: {
            ...state.messagesError,
            [conversationId]: error
        }
    })),

    // ==================== ENTERPRISE STORE-FIRST MESSAGES ====================

    setConversationMessages: (conversationId, messages) => set((state) => {
        // OPTIMIZATION: Limit messages in store to reduce memory usage
        const MAX_MESSAGES_IN_STORE = 200;
        const limitedMessages = messages.length > MAX_MESSAGES_IN_STORE
            ? messages.slice(-MAX_MESSAGES_IN_STORE) // Keep only the latest messages
            : messages;

        if (messages.length > MAX_MESSAGES_IN_STORE) {
            console.log(`✅ [ChatStore] Limited messages for conversation ${conversationId}: ${messages.length} → ${limitedMessages.length}`);
        }

        return {
            conversationMessages: {
                ...state.conversationMessages,
                [conversationId]: limitedMessages
            },
            lastMessageTimestamp: {
                ...state.lastMessageTimestamp,
                [conversationId]: limitedMessages.length > 0 ? limitedMessages[0].createdAt : ''
            }
        };
    }),

    addConversationMessage: (conversationId, message) => set((state) => {
        const existingMessages = state.conversationMessages[conversationId] || [];

        // Check if message already exists to prevent duplicates
        const messageExists = existingMessages.some(msg => msg.id === message.id);

        if (messageExists) {
            console.log('⚠️ [ChatStore] Message already exists, skipping:', message.id);
            return state; // Return unchanged state
        }

        // MEMORY MANAGEMENT: Limit messages in store to reduce memory usage
        const newMessages = [message, ...existingMessages];
        const limitedMessages = newMessages.length > MAX_MESSAGES_PER_CONVERSATION
            ? newMessages.slice(0, MAX_MESSAGES_PER_CONVERSATION) // Keep only the latest messages
            : newMessages;

        if (newMessages.length > MAX_MESSAGES_PER_CONVERSATION) {
            console.log(`🧹 [Memory] Limited messages for conversation ${conversationId}: ${newMessages.length} → ${limitedMessages.length}`);
        }

        return {
            conversationMessages: {
                ...state.conversationMessages,
                [conversationId]: limitedMessages
            },
            lastMessageTimestamp: {
                ...state.lastMessageTimestamp,
                [conversationId]: message.createdAt
            }
        };
    }),

    updateConversationMessage: (conversationId, messageId, updates) => set((state) => {
        const existingMessages = state.conversationMessages[conversationId] || [];

        // If updating ID, check if new ID already exists
        if (updates.id && updates.id !== messageId) {
            const newIdExists = existingMessages.some(msg => msg.id === updates.id);
            if (newIdExists) {
                console.log('⚠️ [ChatStore] Message with new ID already exists, removing old message:', messageId);
                // Remove old message instead of updating
                return {
                    conversationMessages: {
                        ...state.conversationMessages,
                        [conversationId]: existingMessages.filter(msg => msg.id !== messageId)
                    }
                };
            }
        }

        return {
            conversationMessages: {
                ...state.conversationMessages,
                [conversationId]: existingMessages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                )
            }
        };
    }),

    removeConversationMessage: (conversationId, messageId) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: (state.conversationMessages[conversationId] || []).filter(msg => msg.id !== messageId)
        }
    })),

    appendConversationMessages: (conversationId, messages) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: [...(state.conversationMessages[conversationId] || []), ...messages]
        }
    })),

    prependConversationMessages: (conversationId, messages) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: [...messages, ...(state.conversationMessages[conversationId] || [])]
        }
    })),

    clearConversationMessages: (conversationId) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: []
        }
    })),

    setHasMoreMessages: (conversationId, hasMore) => set((state) => ({
        hasMoreMessages: {
            ...state.hasMoreMessages,
            [conversationId]: hasMore
        }
    })),

    setLastMessageTimestamp: (conversationId, timestamp) => set((state) => ({
        lastMessageTimestamp: {
            ...state.lastMessageTimestamp,
            [conversationId]: timestamp
        }
    })),

    // ==================== ENTERPRISE MESSAGE SNAPSHOTS ====================

    setMessageSnapshot: (conversationId, messages) => set((state) => ({
        messageSnapshots: {
            ...state.messageSnapshots,
            [conversationId]: messages
        }
    })),

    getMessageSnapshot: (conversationId) => {
        const state = get();
        return state.messageSnapshots[conversationId] || [];
    },

    clearMessageSnapshot: (conversationId) => set((state) => ({
        messageSnapshots: {
            ...state.messageSnapshots,
            [conversationId]: []
        }
    })),

    // ==================== MEMBERS ====================

    setMembers: (conversationId, members) => set((state) => ({
        members: {
            ...state.members,
            [conversationId]: members
        }
    })),

    addMember: (conversationId, member) => set((state) => ({
        members: {
            ...state.members,
            [conversationId]: [...(state.members[conversationId] || []), member]
        }
    })),

    removeMember: (conversationId, memberId) => set((state) => ({
        members: {
            ...state.members,
            [conversationId]: (state.members[conversationId] || []).filter(member => member.userId !== memberId)
        }
    })),

    updateMember: (conversationId, memberId, updates) => set((state) => ({
        members: {
            ...state.members,
            [conversationId]: (state.members[conversationId] || []).map(member =>
                member.userId === memberId ? { ...member, ...updates } : member
            )
        }
    })),

    setMembersLoading: (conversationId, loading) => set((state) => ({
        membersLoading: {
            ...state.membersLoading,
            [conversationId]: loading
        }
    })),

    setMembersError: (conversationId, error) => set((state) => ({
        membersError: {
            ...state.membersError,
            [conversationId]: error
        }
    })),

    // ==================== ENTERPRISE MESSAGE CACHING ====================

    getCachedMessages: (conversationId) => {
        const state = get();
        return state.cachedMessages[conversationId] || [];
    },

    updateCachedMessages: (conversationId, messages) => set((state) => ({
        cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: messages
        },
        lastSyncTime: {
            ...state.lastSyncTime,
            [conversationId]: Date.now()
        }
    })),

    preloadMessages: (conversationId, messages) => set((state) => ({
        cachedMessages: {
            ...state.cachedMessages,
            [conversationId]: messages
        },
        preloadedConversations: [...state.preloadedConversations, conversationId]
    })),

    shouldSyncMessages: (conversationId) => {
        const state = get();
        const lastSync = state.lastSyncTime[conversationId];
        const now = Date.now();
        const SYNC_INTERVAL = 30000; // 30 seconds

        return !lastSync || (now - lastSync) > SYNC_INTERVAL;
    },

    markSyncTime: (conversationId) => set((state) => ({
        lastSyncTime: {
            ...state.lastSyncTime,
            [conversationId]: Date.now()
        }
    })),

    setSyncStatus: (conversationId, status) => set((state) => ({
        syncStatus: {
            ...state.syncStatus,
            [conversationId]: status
        }
    })),

    // ==================== UI STATE ====================

    setSelectedConversationId: (conversationId) => set({ selectedConversationId: conversationId }),

    setIsTyping: (conversationId, isTyping) => set((state) => ({
        isTyping: {
            ...state.isTyping,
            [conversationId]: isTyping
        }
    })),

    setUnreadCount: (conversationId, count) => set((state) => ({
        unreadCount: {
            ...state.unreadCount,
            [conversationId]: count
        }
    })),

    incrementUnreadCount: (conversationId) => set((state) => ({
        unreadCount: {
            ...state.unreadCount,
            [conversationId]: (state.unreadCount[conversationId] || 0) + 1
        }
    })),

    clearUnreadCount: (conversationId) => set((state) => ({
        unreadCount: {
            ...state.unreadCount,
            [conversationId]: 0
        }
    })),

    // ==================== UTILITY ====================

    reset: () => set(initialState),

    resetConversation: (conversationId) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: []
        },
        members: {
            ...state.members,
            [conversationId]: []
        },
        messagesLoading: {
            ...state.messagesLoading,
            [conversationId]: false
        },
        membersLoading: {
            ...state.membersLoading,
            [conversationId]: false
        },
        messagesError: {
            ...state.messagesError,
            [conversationId]: null
        },
        membersError: {
            ...state.membersError,
            [conversationId]: null
        },
        isTyping: {
            ...state.isTyping,
            [conversationId]: false
        },
        unreadCount: {
            ...state.unreadCount,
            [conversationId]: 0
        }
    })),

    clearCache: (conversationId) => set((state) => {
        if (conversationId) {
            // Clear specific conversation cache
            const newCachedMessages = { ...state.cachedMessages };
            const newLastSyncTime = { ...state.lastSyncTime };
            const newPreloadedConversations = state.preloadedConversations.filter(id => id !== conversationId);

            delete newCachedMessages[conversationId];
            delete newLastSyncTime[conversationId];

            return {
                cachedMessages: newCachedMessages,
                lastSyncTime: newLastSyncTime,
                preloadedConversations: newPreloadedConversations
            };
        } else {
            // Clear all cache
            return {
                cachedMessages: {},
                lastSyncTime: {},
                preloadedConversations: []
            };
        }
    }),

    // ==================== WEBSOCKET ACTIONS ====================

    connectWebSocket: async () => {
        set({ websocketConnecting: true });
        try {
            await chatWebSocketManager.connect();
            set({ websocketConnected: true, websocketConnecting: false });
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            set({ websocketConnected: false, websocketConnecting: false });
        }
    },

    disconnectWebSocket: async () => {
        await chatWebSocketManager.disconnect();
        set({ websocketConnected: false, websocketConnecting: false });
    },

    subscribeToConversation: (conversationId) => {
        chatWebSocketManager.subscribeToConversation(conversationId);
    },

    unsubscribeFromConversation: (conversationId) => {
        chatWebSocketManager.unsubscribeFromConversation(conversationId);
    },

    sendWebSocketMessage: (messageData) => {
        chatWebSocketManager.sendMessage(messageData);
    },

    setWebSocketConnected: (connected) => set({ websocketConnected: connected }),

    setWebSocketConnecting: (connecting) => set({ websocketConnecting: connecting }),

    // ==================== MEMORY MANAGEMENT ====================

    cleanupInactiveConversations: () => set((state) => {
        const now = Date.now();
        const activeConversations = state.conversations.filter(conv => {
            const lastActivity = new Date(conv.lastMessage?.createdAt || conv.createdAt).getTime();
            return now - lastActivity <= INACTIVE_CONVERSATION_THRESHOLD;
        });

        const inactiveConversations = state.conversations.filter(conv => {
            const lastActivity = new Date(conv.lastMessage?.createdAt || conv.createdAt).getTime();
            return now - lastActivity > INACTIVE_CONVERSATION_THRESHOLD;
        });

        if (inactiveConversations.length > 0) {
            console.log(`🧹 [Memory] Cleaning up ${inactiveConversations.length} inactive conversations`);

            // Remove inactive conversations from memory
            const newConversationMessages = { ...state.conversationMessages };
            const newMessageSnapshots = { ...state.messageSnapshots };
            const newCachedMessages = { ...state.cachedMessages };
            const newMembers = { ...state.members };
            const newMessagesLoading = { ...state.messagesLoading };
            const newMessagesError = { ...state.messagesError };
            const newMembersLoading = { ...state.membersLoading };
            const newMembersError = { ...state.membersError };

            inactiveConversations.forEach(conv => {
                delete newConversationMessages[conv.id];
                delete newMessageSnapshots[conv.id];
                delete newCachedMessages[conv.id];
                delete newMembers[conv.id];
                delete newMessagesLoading[conv.id];
                delete newMessagesError[conv.id];
                delete newMembersLoading[conv.id];
                delete newMembersError[conv.id];
            });

            return {
                conversations: activeConversations,
                conversationMessages: newConversationMessages,
                messageSnapshots: newMessageSnapshots,
                cachedMessages: newCachedMessages,
                members: newMembers,
                messagesLoading: newMessagesLoading,
                messagesError: newMessagesError,
                membersLoading: newMembersLoading,
                membersError: newMembersError
            };
        }

        return state;
    }),

    cleanupOldMessages: (conversationId) => set((state) => {
        const messages = state.conversationMessages[conversationId] || [];
        if (messages.length <= MAX_MESSAGES_PER_CONVERSATION) {
            return state;
        }

        console.log(`🧹 [Memory] Cleaning up old messages for conversation ${conversationId}: ${messages.length} → ${MAX_MESSAGES_PER_CONVERSATION}`);

        // Keep only the latest messages
        const limitedMessages = messages.slice(0, MAX_MESSAGES_PER_CONVERSATION);

        return {
            conversationMessages: {
                ...state.conversationMessages,
                [conversationId]: limitedMessages
            }
        };
    }),

    limitConversationsInMemory: () => set((state) => {
        if (state.conversations.length <= MAX_CONVERSATIONS_IN_MEMORY) {
            return state;
        }

        console.log(`🧹 [Memory] Limiting conversations in memory: ${state.conversations.length} → ${MAX_CONVERSATIONS_IN_MEMORY}`);

        // Keep only the most recent conversations
        const limitedConversations = state.conversations.slice(0, MAX_CONVERSATIONS_IN_MEMORY);
        const removedConversations = state.conversations.slice(MAX_CONVERSATIONS_IN_MEMORY);

        // Remove data for removed conversations
        const newConversationMessages = { ...state.conversationMessages };
        const newMessageSnapshots = { ...state.messageSnapshots };
        const newCachedMessages = { ...state.cachedMessages };
        const newMembers = { ...state.members };
        const newMessagesLoading = { ...state.messagesLoading };
        const newMessagesError = { ...state.messagesError };
        const newMembersLoading = { ...state.membersLoading };
        const newMembersError = { ...state.membersError };

        removedConversations.forEach(conv => {
            delete newConversationMessages[conv.id];
            delete newMessageSnapshots[conv.id];
            delete newCachedMessages[conv.id];
            delete newMembers[conv.id];
            delete newMessagesLoading[conv.id];
            delete newMessagesError[conv.id];
            delete newMembersLoading[conv.id];
            delete newMembersError[conv.id];
        });

        return {
            conversations: limitedConversations,
            conversationMessages: newConversationMessages,
            messageSnapshots: newMessageSnapshots,
            cachedMessages: newCachedMessages,
            members: newMembers,
            messagesLoading: newMessagesLoading,
            messagesError: newMessagesError,
            membersLoading: newMembersLoading,
            membersError: newMembersError
        };
    }),
}));
