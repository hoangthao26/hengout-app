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

    // Conversation Caching
    lastConversationLoadTime: number;
    conversationCacheValid: boolean;

    // Store-First Messages
    conversationMessages: { [conversationId: string]: ChatMessage[] };
    messageSnapshots: { [conversationId: string]: ChatMessage[] }; // Recent messages for instant display
    messagesLoading: { [conversationId: string]: boolean };
    messagesError: { [conversationId: string]: string | null };
    hasMoreMessages: { [conversationId: string]: boolean };
    lastMessageTimestamp: { [conversationId: string]: string };

    // Legacy Messages removed - using conversationMessages instead

    // Message Caching & Sync
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

    // Conversation Caching
    setLastConversationLoadTime: (timestamp: number) => void;
    setConversationCacheValid: (valid: boolean) => void;
    mergeConversationsWithWebSocketUpdates: (apiConversations: ChatConversation[]) => ChatConversation[];

    // Store-First Messages
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

    // Message Snapshots (for instant display)
    setMessageSnapshot: (conversationId: string, messages: ChatMessage[]) => void;
    getMessageSnapshot: (conversationId: string) => ChatMessage[];
    clearMessageSnapshot: (conversationId: string) => void;

    // Message Caching
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

    // Conversation Caching
    lastConversationLoadTime: 0,
    conversationCacheValid: false,

    // Store-First Messages
    conversationMessages: {},
    messageSnapshots: {},
    messagesLoading: {},
    messagesError: {},
    hasMoreMessages: {},
    lastMessageTimestamp: {},

    // Legacy Messages removed - using conversationMessages instead

    // Message Caching & Sync
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


        // SẮP XẾP conversations theo lastMessage.createdAt (DESC), nếu null thì dùng createdAt
        const sortedConversations = limitedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return { conversations: sortedConversations };
    }),

    /**
     * Add new conversation with automatic memory management
     * 
     * Memory management strategy:
     * 1. Adds conversation to beginning of list (most recent first)
     * 2. If exceeds MAX_CONVERSATIONS_IN_MEMORY (50), removes oldest conversations
     * 3. Cleans up all associated data (messages, members, cache) for removed conversations
     * 4. Triggers background cleanup if exceeds 1.5x limit (75 conversations)
     * 5. Sorts conversations by lastMessage timestamp after addition
     * 
     * Prevents memory bloat by automatically removing least-recent conversations
     * and their associated data when memory limit is reached.
     * 
     * @param conversation - New conversation to add
     */
    addConversation: (conversation) => set((state) => {
        const newConversations = [conversation, ...state.conversations];

        // MEMORY MANAGEMENT: Auto cleanup if too many conversations
        if (newConversations.length > MAX_CONVERSATIONS_IN_MEMORY) {
            const limitedConversations = newConversations.slice(0, MAX_CONVERSATIONS_IN_MEMORY);
            const removedConversations = newConversations.slice(MAX_CONVERSATIONS_IN_MEMORY);

            // Clean up all associated data for removed conversations to prevent memory leaks
            // Removes: messages, snapshots, cache, members, loading states, error states
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

        // CLEANUP: Trigger background cleanup if significantly over limit (150% threshold)
        // This proactively cleans up inactive conversations before hitting hard limit
        if (newConversations.length > MAX_CONVERSATIONS_IN_MEMORY * 1.5) {
            conversationCleanupManager.cleanupInactiveConversations().catch(error => {
                console.error('[ChatStore] Cleanup failed:', error);
            });
        }

        // Sort conversations by lastMessage timestamp (newest first)
        // Falls back to conversation createdAt if lastMessage is null
        const sortedConversations = newConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return { conversations: sortedConversations };
    }),

    /**
     * Update conversation with automatic re-sorting and current conversation sync
     * 
     * Update flow:
     * 1. Updates conversation in list with provided updates (shallow merge)
     * 2. Auto-re-sorts entire conversation list by lastMessage timestamp (newest first)
     * 3. Syncs currentConversation if it's the updated one (keeps UI in sync)
     * 4. Creates new array reference (triggers React re-render)
     * 
     * Auto-re-sorting logic:
     * - Triggered automatically on any update (especially lastMessage changes)
     * - Sorts by lastMessage.createdAt (fallback to createdAt if no lastMessage)
     * - Descending order: Newest conversations appear first
     * - Maintains consistent list order across updates
     * 
     * Current conversation sync:
     * - If updated conversation is currently selected, updates currentConversation too
     * - Ensures detail view shows latest data (name, avatar, lastMessage, etc.)
     * - Prevents UI inconsistencies between list and detail views
     * 
     * React re-render trigger:
     * - Spread operator creates new array reference [...sortedConversations]
     * - React detects reference change and re-renders conversation list
     * - Ensures UI updates when conversation data changes
     * 
     * Use cases:
     * - New message arrives (updates lastMessage, triggers re-sort)
     * - Conversation name/avatar changes (updates metadata)
     * - Member count changes (updates member_count)
     * 
     * @param conversationId - ID of conversation to update
     * @param updates - Partial conversation data to merge
     */
    updateConversation: (conversationId, updates) => set((state) => {
        // Step 1: Update conversation in list
        const updatedConversations = state.conversations.map(conv =>
            conv.id === conversationId ? { ...conv, ...updates } : conv
        );

        // Step 2: Auto-re-sort by lastMessage timestamp (newest first)
        const sortedConversations = updatedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime(); // Descending
        });

        // Step 3: Return new state with synced currentConversation
        return {
            // New array reference triggers React re-render
            conversations: [...sortedConversations],
            // Sync currentConversation if it's the updated one
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

    // ==================== ENTERPRISE CONVERSATION CACHING ====================

    setLastConversationLoadTime: (timestamp) => set({ lastConversationLoadTime: timestamp }),

    setConversationCacheValid: (valid) => set({ conversationCacheValid: valid }),

    /**
     * Merge API conversations with WebSocket real-time updates
     * 
     * Intelligent merge strategy that combines API data with WebSocket updates:
     * - Compares lastMessage timestamps to determine which is newer
     * - Prefers WebSocket updates when more recent (real-time message updates)
     * - Falls back to API data when WebSocket hasn't updated or API is newer
     * 
     * This ensures:
     * - Real-time updates from WebSocket are preserved
     * - API data provides fallback for conversations without WebSocket updates
     * - No data loss during merge process
     * - Conversation list shows latest messages even after API refresh
     * 
     * @param apiConversations - Conversations from API call
     * @returns Merged conversations with WebSocket updates prioritized when newer, sorted by lastMessage timestamp
     */
    mergeConversationsWithWebSocketUpdates: (apiConversations) => {
        const state = get();
        const storeConversations = state.conversations;

        // Merge strategy: prefer WebSocket updates when timestamp is newer
        const mergedConversations = apiConversations.map(apiConv => {
            const storeConv = storeConversations.find(s => s.id === apiConv.id);

            // Compare lastMessage timestamps to determine which is more recent
            if (storeConv && storeConv.lastMessage && apiConv.lastMessage) {
                const storeTime = new Date(storeConv.lastMessage.createdAt).getTime();
                const apiTime = new Date(apiConv.lastMessage.createdAt).getTime();

                // Use WebSocket data if newer (real-time updates take priority)
                if (storeTime > apiTime) {
                    return storeConv;
                }
            }

            // Use API data (no WebSocket updates exist or API data is newer)
            return apiConv;
        });

        // Sort merged conversations by lastMessage timestamp (newest first)
        const sortedConversations = mergedConversations.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        return sortedConversations;
    },

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

    /**
     * Set messages for conversation with memory optimization
     * 
     * Memory management:
     * - Limits messages to MAX_MESSAGES_IN_STORE (200) to prevent memory bloat
     * - Keeps only latest messages (slice from end) when limit exceeded
     * - Updates lastMessageTimestamp for conversation ordering
     * 
     * Older messages beyond limit are handled by conversationCleanupManager.
     * Used when loading full message list from API/database.
     * 
     * @param conversationId - ID of conversation
     * @param messages - Array of messages (can exceed limit, will be truncated)
     */
    setConversationMessages: (conversationId, messages) => set((state) => {
        // OPTIMIZATION: Limit messages in store to reduce memory usage
        const MAX_MESSAGES_IN_STORE = 200;
        const limitedMessages = messages.length > MAX_MESSAGES_IN_STORE
            ? messages.slice(-MAX_MESSAGES_IN_STORE) // Keep only the latest messages (from end)
            : messages;

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

    /**
     * Add a new message to conversation with duplicate prevention, notification, and memory management
     * 
     * Message addition flow:
     * 1. Duplicate detection: Checks if message ID already exists (idempotency)
     *    - Prevents duplicate messages from WebSocket re-delivery or optimistic updates
     *    - Returns state unchanged if duplicate found
     * 2. Notification handling: Triggers notification for new messages
     *    - Handles own message filtering internally (no notification for own messages)
     *    - Finds conversation for notification context
     *    - Silent failure: Errors don't block message addition
     * 3. Memory management: Limits messages to MAX_MESSAGES_PER_CONVERSATION (100)
     *    - Keeps only most recent messages (slice from beginning)
     *    - Prevents memory bloat in long conversations
     * 4. State update: Updates message list and lastMessageTimestamp
     * 
     * Duplicate prevention:
     * - Critical for WebSocket reliability (handles re-delivery)
     * - Critical for optimistic updates (prevents temp + real message duplicates)
     * - Uses message ID comparison (O(n) check, acceptable for message lists)
     * 
     * Memory optimization:
     * - Hard limit: 100 messages per conversation in memory
     * - Older messages beyond limit are handled by cleanup manager
     * - Keeps most recent messages (slice keeps newest when limit exceeded)
     * 
     * @param conversationId - ID of conversation to add message to
     * @param message - New message to add (must have unique ID)
     */
    addConversationMessage: (conversationId, message) => set((state) => {
        const existingMessages = state.conversationMessages[conversationId] || [];

        // Prevent duplicates - check if message already exists
        const messageExists = existingMessages.some(msg => msg.id === message.id);
        if (messageExists) {
            return state;
        }

        // Trigger notification for new messages (handles own message filtering internally)
        try {
            const { notificationManager } = require('../services/notificationManager');
            const conversation = state.conversations.find(conv => conv.id === conversationId);
            if (conversation) {
                notificationManager.handleNewMessage(message, conversation);
            } else {
                console.warn('[ChatStore] Conversation not found for notification:', conversationId);
            }
        } catch (error) {
            console.error('[ChatStore] Failed to handle notification:', error);
        }

        // Memory management: limit messages to prevent memory bloat
        const newMessages = [message, ...existingMessages];
        const limitedMessages = newMessages.length > MAX_MESSAGES_PER_CONVERSATION
            ? newMessages.slice(0, MAX_MESSAGES_PER_CONVERSATION) // Keep only most recent
            : newMessages;


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

    /**
     * Update message with ID conflict handling
     * 
     * Handles message ID changes (e.g., temporary ID → server ID):
     * 1. If new ID already exists, removes old message (duplicate prevention)
     * 2. Otherwise, updates message in place
     * 
     * Prevents duplicate messages when temporary IDs are replaced with server IDs.
     * Common scenario: Optimistic message sends with temp ID, then server assigns real ID.
     * 
     * @param conversationId - ID of conversation containing message
     * @param messageId - Current message ID to update
     * @param updates - Partial message data including potentially new ID
     */
    updateConversationMessage: (conversationId, messageId, updates) => set((state) => {
        const existingMessages = state.conversationMessages[conversationId] || [];

        // Handle ID change: If updating to a new ID that already exists, remove old message
        // This prevents duplicates when temp ID is replaced with server ID
        if (updates.id && updates.id !== messageId) {
            const newIdExists = existingMessages.some(msg => msg.id === updates.id);
            if (newIdExists) {
                // New ID already exists - remove old message to prevent duplicate
                return {
                    conversationMessages: {
                        ...state.conversationMessages,
                        [conversationId]: existingMessages.filter(msg => msg.id !== messageId)
                    }
                };
            }
        }

        // Normal update: Apply updates to matching message
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

    /**
     * Determines if messages should be synced for a conversation
     * 
     * Rate limiting logic to prevent excessive sync calls:
     * - Allows sync if never synced before
     * - Allows sync if last sync was more than SYNC_INTERVAL (30s) ago
     * - Prevents sync if synced within last 30 seconds
     * 
     * @param conversationId - ID of conversation to check
     * @returns true if should sync (rate limit not exceeded), false otherwise
     */
    shouldSyncMessages: (conversationId) => {
        const state = get();
        const lastSync = state.lastSyncTime[conversationId];
        const now = Date.now();
        const SYNC_INTERVAL = 30000; // 30 seconds

        // Allow sync if never synced or if enough time has passed since last sync
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
            console.error('[ChatStore] Failed to connect WebSocket:', error);
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

        // Keep only the latest messages to manage memory
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
