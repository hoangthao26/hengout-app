import { create } from 'zustand';
import { ChatConversation, ChatMember, ChatMessage } from '../types/chat';

interface ChatState {
    // Conversations
    conversations: ChatConversation[];
    currentConversation: ChatConversation | null;
    conversationsLoading: boolean;
    conversationsError: string | null;

    // Messages
    messages: { [conversationId: string]: ChatMessage[] };
    messagesLoading: { [conversationId: string]: boolean };
    messagesError: { [conversationId: string]: string | null };

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

    // Messages
    setMessages: (conversationId: string, messages: ChatMessage[]) => void;
    addMessage: (conversationId: string, message: ChatMessage) => void;
    updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
    removeMessage: (conversationId: string, messageId: string) => void;
    setMessagesLoading: (conversationId: string, loading: boolean) => void;
    setMessagesError: (conversationId: string, error: string | null) => void;
    clearMessages: (conversationId: string) => void;

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

    // Messages
    messages: {},
    messagesLoading: {},
    messagesError: {},

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
    }))
}));
