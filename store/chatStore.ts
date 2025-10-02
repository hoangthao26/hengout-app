import { create } from 'zustand';
import { ChatConversation, ChatMember, ChatMessage } from '../types/chat';

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

    // Legacy Messages (for backward compatibility)
    messages: { [conversationId: string]: ChatMessage[] };

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

    // Legacy Messages (for backward compatibility)
    setMessages: (conversationId: string, messages: ChatMessage[]) => void;
    addMessage: (conversationId: string, message: ChatMessage) => void;
    updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
    removeMessage: (conversationId: string, messageId: string) => void;
    clearMessages: (conversationId: string) => void;

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

    // Legacy Messages (for backward compatibility)
    messages: {},

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
};

export const useChatStore = create<ChatStore>((set, get) => ({
    ...initialState,

    // ==================== CONVERSATIONS ====================

    setConversations: (conversations) => set({ conversations }),

    addConversation: (conversation) => set((state) => ({
        conversations: [conversation, ...state.conversations]
    })),

    updateConversation: (conversationId, updates) => set((state) => ({
        conversations: state.conversations.map(conv =>
            conv.id === conversationId ? { ...conv, ...updates } : conv
        ),
        currentConversation: state.currentConversation?.id === conversationId
            ? { ...state.currentConversation, ...updates }
            : state.currentConversation
    })),

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

    // ==================== MESSAGES ====================

    setMessages: (conversationId, messages) => set((state) => ({
        messages: {
            ...state.messages,
            [conversationId]: messages
        }
    })),

    addMessage: (conversationId, message) => set((state) => ({
        messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message]
        }
    })),

    updateMessage: (conversationId, messageId, updates) => set((state) => ({
        messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        }
    })),

    removeMessage: (conversationId, messageId) => set((state) => ({
        messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).filter(msg => msg.id !== messageId)
        }
    })),

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

    clearMessages: (conversationId) => set((state) => ({
        messages: {
            ...state.messages,
            [conversationId]: []
        }
    })),

    // ==================== ENTERPRISE STORE-FIRST MESSAGES ====================

    setConversationMessages: (conversationId, messages) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: messages
        },
        lastMessageTimestamp: {
            ...state.lastMessageTimestamp,
            [conversationId]: messages.length > 0 ? messages[0].createdAt : ''
        }
    })),

    addConversationMessage: (conversationId, message) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: [message, ...(state.conversationMessages[conversationId] || [])]
        },
        lastMessageTimestamp: {
            ...state.lastMessageTimestamp,
            [conversationId]: message.createdAt
        }
    })),

    updateConversationMessage: (conversationId, messageId, updates) => set((state) => ({
        conversationMessages: {
            ...state.conversationMessages,
            [conversationId]: (state.conversationMessages[conversationId] || []).map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        }
    })),

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
        messages: {
            ...state.messages,
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
}));
