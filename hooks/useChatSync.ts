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
                console.error('Failed to get chat sync stats:', error);
            }
        };

        initialize();

        // Cleanup on unmount
        return () => {
            chatSyncService.stopSync();
        };
    }, [isServicesReady]);

    // Force sync
    const forceSync = useCallback(async () => {
        if (isSyncing) return;

        try {
            setIsSyncing(true);
            await chatSyncService.forceSync();

            // Update stats after sync
            const stats = await chatSyncService.getSyncStats();
            setSyncStats(stats);
        } catch (error) {
            console.error('Force sync failed:', error);
            throw error;
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    // Get conversations (from local DB)
    const getConversations = useCallback(async (): Promise<ChatConversation[]> => {
        if (!isInitialized) {
            console.log('⚠️ [useChatSync] Services not ready, returning empty conversations');
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
            console.log('⚠️ [useChatSync] Services not ready, returning empty messages');
            return [];
        }
        return await chatSyncService.getMessages(conversationId, limit, offset);
    }, [isInitialized]);

    // Send message with optimistic update
    const sendMessage = useCallback(async (messageData: {
        conversationId: string;
        type: 'TEXT' | 'IMAGE' | 'FILE';
        content: {
            text?: string;
            imageUrl?: string;
            fileName?: string;
            fileUrl?: string;
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
            console.log('⚠️ [useChatSync] Services not ready, skipping message sync');
            return [];
        }
        return await chatSyncService.syncMessages(conversationId, page, size);
    }, [isInitialized]);

    // Get members (from local DB)
    const getMembers = useCallback(async (conversationId: string): Promise<ChatMember[]> => {
        if (!isInitialized) {
            console.log('⚠️ [useChatSync] Services not ready, returning empty members');
            return [];
        }
        return await chatSyncService.getMembers(conversationId);
    }, [isInitialized]);

    // Sync members for conversation
    const syncMembers = useCallback(async (conversationId: string): Promise<ChatMember[]> => {
        if (!isInitialized) {
            console.log('⚠️ [useChatSync] Services not ready, skipping member sync');
            return [];
        }
        return await chatSyncService.syncMembers(conversationId);
    }, [isInitialized]);

    // Update conversation
    const updateConversation = useCallback(async (
        conversationId: string,
        updates: Partial<ChatConversation>
    ): Promise<void> => {
        if (!isInitialized) {
            console.log('⚠️ [useChatSync] Services not ready, skipping conversation update');
            return;
        }
        await chatSyncService.updateConversation(conversationId, updates);
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
        updateConversation,
        clearAllData,
        resetDatabase
    };
};
