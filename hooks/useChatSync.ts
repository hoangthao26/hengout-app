import { useEffect, useState, useCallback } from 'react';
import { chatSyncService } from '../services/chatSyncService';
import { useAppStore } from '../store/appStore';
import { ChatMessage, ChatConversation, ChatMember } from '../types/chat';

export const useChatSync = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState({
        conversations: 0,
        messages: 0,
        members: 0,
        unsyncedMessages: 0
    });

    // Get initialization state from global store
    const { isServicesReady, isDatabaseReady } = useAppStore();
    const isInitialized = isServicesReady && isDatabaseReady;

    // Initialize sync service when services are ready
    useEffect(() => {
        const initialize = async () => {
            if (!isServicesReady) return;

            try {
                // Services are already initialized by initializationService
                // Just get initial stats
                const stats = await chatSyncService.getSyncStats();
                setSyncStats(stats);
            } catch (error) {
                console.error('[useChatSync] Failed to get chat sync stats:', error);
            }
        };

        initialize();

        // Cleanup on unmount
        return () => {
            chatSyncService.stopSync();
        };
    }, [isServicesReady]);

    /**
     * Force a full sync of chat data from server to local database
     * Useful for manual refresh or recovery scenarios
     */
    const forceSync = useCallback(async () => {
        if (isSyncing) return;

        try {
            setIsSyncing(true);
            await chatSyncService.forceSync();

            // Update stats after sync
            const stats = await chatSyncService.getSyncStats();
            setSyncStats(stats);
        } catch (error) {
            console.error('[useChatSync] Force sync failed:', error);
            throw error;
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    /**
     * Get conversations from local database
     * Returns cached data immediately without network request
     * @returns Array of conversations from local SQLite database
     */
    const getConversations = useCallback(async (): Promise<ChatConversation[]> => {
        if (!isInitialized) {
            return [];
        }
        return await chatSyncService.getConversations();
    }, [isInitialized]);

    // Get messages (from local DB)
    const getMessages = useCallback(async (
        conversationId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<ChatMessage[]> => {
        if (!isInitialized) {
            return [];
        }
        return await chatSyncService.getMessages(conversationId, limit, offset);
    }, [isInitialized]);

    /**
     * Send a message with optimistic update
     * Message is saved locally first, then synced to server
     * @param messageData - Message data including conversation ID, type, and content
     * @returns The created message
     */
    const sendMessage = useCallback(async (messageData: {
        conversationId: string;
        type: 'TEXT' | 'ACTIVITY';
        content: {
            text?: string;
            activityId?: string;
            name?: string;
            purpose?: string;
        };
    }): Promise<ChatMessage> => {
        if (!isInitialized) {
            throw new Error('Chat services not ready. Please wait for initialization to complete.');
        }
        return await chatSyncService.sendMessage(messageData);
    }, [isInitialized]);

    // Sync messages for conversation
    const syncMessages = useCallback(async (
        conversationId: string,
        page: number = 0,
        size: number = 50
    ): Promise<ChatMessage[]> => {
        if (!isInitialized) {
            return [];
        }
        return await chatSyncService.syncMessages(conversationId, page, size);
    }, [isInitialized]);

    // Get members (from local DB)
    const getMembers = useCallback(async (conversationId: string): Promise<ChatMember[]> => {
        if (!isInitialized) {
            return [];
        }
        return await chatSyncService.getMembers(conversationId);
    }, [isInitialized]);

    // Sync members for conversation
    const syncMembers = useCallback(async (conversationId: string): Promise<ChatMember[]> => {
        if (!isInitialized) {
            return [];
        }
        return await chatSyncService.syncMembers(conversationId);
    }, [isInitialized]);

    // Sync conversations from server to database
    const syncConversations = useCallback(async (): Promise<void> => {
        if (!isInitialized) {
            return;
        }
        await chatSyncService.syncConversations();
    }, [isInitialized]);

    // Update conversation
    const updateConversation = useCallback(async (
        conversationId: string,
        updates: Partial<ChatConversation>
    ): Promise<void> => {
        if (!isInitialized) {
            return;
        }
        await chatSyncService.updateConversation(conversationId, updates);
    }, [isInitialized]);

    // Delete conversation (when leaving/disbanding)
    const deleteConversation = useCallback(async (
        conversationId: string
    ): Promise<void> => {
        if (!isInitialized) {
            return;
        }
        await chatSyncService.deleteConversation(conversationId);
    }, [isInitialized]);

    // Clear all data
    const clearAllData = useCallback(async (): Promise<void> => {
        if (!isInitialized) return;
        await chatSyncService.clearAllData();

        // Reset stats
        setSyncStats({
            conversations: 0,
            messages: 0,
            members: 0,
            unsyncedMessages: 0
        });
    }, [isInitialized]);

    // Reset database (for fixing constraint errors)
    const resetDatabase = useCallback(async (): Promise<void> => {
        if (!isInitialized) return;
        await chatSyncService.resetDatabase();

        // Reset stats
        setSyncStats({
            conversations: 0,
            messages: 0,
            members: 0,
            unsyncedMessages: 0
        });
    }, [isInitialized]);

    return {
        // State
        isInitialized,
        isSyncing,
        syncStats,

        // Actions
        forceSync,
        getConversations,
        getMessages,
        sendMessage,
        syncMessages,
        getMembers,
        syncMembers,
        syncConversations,
        updateConversation,
        deleteConversation,
        clearAllData,
        resetDatabase
    };
};
