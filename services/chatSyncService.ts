import { databaseService } from './databaseService';
import { chatService } from './chatService';
import { ChatMessage, ChatConversation, ChatMember } from '../types/chat';
import { smartSyncManager } from './smartSyncManager';

class ChatSyncService {
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private readonly SYNC_INTERVAL = 30000; // 30 seconds

    /**
     * Initialize sync service with Smart Sync
     */
    async initialize(): Promise<void> {
        await databaseService.initialize();
        // 🚀 SMART SYNC: No more periodic sync - using event-driven sync instead
        console.log('✅ Chat sync service initialized with Smart Sync');
    }

    /**
     * Start periodic background sync
     */
    private startPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.performBackgroundSync();
        }, this.SYNC_INTERVAL);
    }

    /**
     * Stop periodic sync
     */
    stopSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Perform background sync (non-blocking)
     */
    private async performBackgroundSync(): Promise<void> {
        if (this.isSyncing) return;

        try {
            this.isSyncing = true;
            await this.syncConversations();
            await this.syncUnsyncedMessages();
        } catch (error) {
            console.error('Background sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Force immediate sync
     */
    async forceSync(): Promise<void> {
        if (this.isSyncing) return;

        try {
            this.isSyncing = true;
            await this.syncConversations();
            await this.syncUnsyncedMessages();
            console.log('✅ Force sync completed');
        } catch (error) {
            console.error('Force sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    // ==================== CONVERSATIONS SYNC ====================

    /**
     * Sync conversations from server to local DB - PROACTIVE approach
     */
    async syncConversations(): Promise<void> {
        try {
            console.log('🔄 Syncing conversations...');

            // 🚀 PROACTIVE: Check auth first
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                console.log('ℹ️ [ChatSyncService] User not authenticated, skipping conversation sync');
                return;
            }

            // 🚀 PROACTIVE: Check token expiry and refresh if needed
            const tokens = await AuthHelper.getTokens();
            if (tokens && tokens.expiresIn < 5 * 60 * 1000) { // 5 minutes - consistent with other services
                console.log('⏰ [ChatSyncService] Token expiring soon, refreshing proactively');
                try {
                    // Use RefreshTokenManager for consistent refresh logic
                    const { refreshTokenManager } = await import('./refreshTokenManager');
                    await refreshTokenManager.performRefresh();
                    console.log('✅ [ChatSyncService] Token refreshed successfully');
                } catch (error) {
                    console.log('⚠️ [ChatSyncService] Token refresh failed, will retry later');
                    return; // Don't make API call with expired token
                }
            }

            // Fetch conversations from server
            const response = await chatService.getConversations();

            // 🚀 DEFENSIVE: Check if user is still authenticated after API call
            const stillAuthenticated = await AuthHelper.isAuthenticated();

            if (!stillAuthenticated) {
                console.log('ℹ️ [ChatSyncService] User logged out during sync, aborting');
                return;
            }

            if (response.status === 'success') {
                // Save to local database
                for (const conversation of response.data) {
                    await databaseService.saveConversation(conversation);
                }

                console.log(`✅ Synced ${response.data.length} conversations`);
            }
        } catch (error: any) {
            // 🚀 PROACTIVE: Handle 401 specifically
            if (error.response?.status === 401) {
                console.log('🔐 [ChatSyncService] 401 error - user needs to login');
                try {
                    const { AuthHelper } = await import('./authHelper');
                    await AuthHelper.logoutAndNavigate();
                    return;
                } catch (logoutError) {
                    console.error('❌ [ChatSyncService] Failed to logout:', logoutError);
                }
            }

            // 🚀 DEFENSIVE: Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                console.log('ℹ️ [ChatSyncService] User logged out during conversation sync, aborting gracefully');
                return;
            }
            console.error('Failed to sync conversations:', error);
            throw error;
        }
    }

    /**
     * Get conversations from local DB (instant)
     */
    async getConversations(): Promise<ChatConversation[]> {
        await databaseService.initialize();
        return await databaseService.getConversations();
    }

    /**
     * Get specific conversation from local DB
     */
    async getConversation(conversationId: string): Promise<ChatConversation | null> {
        await databaseService.initialize();
        return await databaseService.getConversation(conversationId);
    }

    // ==================== MESSAGES SYNC ====================

    /**
     * Sync messages for a specific conversation
     */
    async syncMessages(conversationId: string, page: number = 0, size: number = 50): Promise<ChatMessage[]> {
        try {
            console.log(`🔄 Syncing messages for conversation ${conversationId}...`);

            // 🚀 CHECK AUTH FIRST: Only sync if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                console.log('ℹ️ [ChatSyncService] User not authenticated, skipping message sync');
                return [];
            }

            // Fetch messages from server
            const response = await chatService.getMessages(conversationId, page, size);

            // 🚀 DEFENSIVE: Check if user is still authenticated after API call
            const stillAuthenticated = await AuthHelper.isAuthenticated();

            if (!stillAuthenticated) {
                console.log('ℹ️ [ChatSyncService] User logged out during message sync, aborting');
                return [];
            }

            if (response.status === 'success') {
                // Save to local database
                for (const message of response.data) {
                    await databaseService.saveMessage(message);
                }

                console.log(`✅ Synced ${response.data.length} messages`);
                return response.data;
            }

            return [];
        } catch (error: any) {
            // 🚀 DEFENSIVE: Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                console.log('ℹ️ [ChatSyncService] User logged out during message sync, aborting gracefully');
                return [];
            }
            console.error(`Failed to sync messages for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Get messages from local DB (instant)
     */
    async getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
        await databaseService.initialize();
        return await databaseService.getMessages(conversationId, limit, offset);
    }

    /**
     * Send message with optimistic update
     */
    async sendMessage(messageData: {
        conversationId: string;
        type: 'TEXT' | 'ACTIVITY';
        content: {
            text?: string;
            // ACTIVITY content
            activityId?: string;
            name?: string;
            purpose?: string;
        };
    }): Promise<ChatMessage> {
        await databaseService.initialize();

        // Create optimistic message
        const optimisticMessage: ChatMessage = {
            id: `temp_${Date.now()}_${Math.random()}`,
            conversationId: messageData.conversationId,
            senderId: 'current_user', // This should be actual user ID
            senderName: 'Bạn',
            senderAvatar: '',
            type: messageData.type,
            content: messageData.content,
            createdAt: new Date().toISOString(),
            mine: true
        };

        // Save optimistic message to local DB
        await databaseService.saveMessage(optimisticMessage);

        try {
            // Send to server
            const response = await chatService.sendMessage(messageData);

            if (response.status === 'success') {
                // Replace optimistic message with real message
                await databaseService.deleteMessage(optimisticMessage.id);
                await databaseService.saveMessage(response.data);

                return response.data;
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
        } catch (error) {
            // Mark optimistic message as failed
            await databaseService.updateMessageStatus(optimisticMessage.id, 'failed');
            throw error;
        }
    }

    // ==================== MEMBERS SYNC ====================

    /**
     * Sync members for a conversation
     */
    async syncMembers(conversationId: string): Promise<ChatMember[]> {
        try {
            console.log(`🔄 Syncing members for conversation ${conversationId}...`);

            // Check conversation type first - only sync members for GROUP conversations
            const conversation = await databaseService.getConversation(conversationId);
            if (!conversation || conversation.type !== 'GROUP') {
                console.log(`ℹ️ Skipping member sync for ${conversation?.type || 'unknown'} conversation`);
                return [];
            }

            // Fetch members from server
            const response = await chatService.getGroupMembers(conversationId);

            if (response.status === 'success') {
                // Save to local database
                for (const member of response.data) {
                    await databaseService.saveMember(member, conversationId);
                }

                console.log(`✅ Synced ${response.data.length} members`);
                return response.data;
            }

            return [];
        } catch (error) {
            console.error(`Failed to sync members for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Get members from local DB
     */
    async getMembers(conversationId: string): Promise<ChatMember[]> {
        await databaseService.initialize();
        return await databaseService.getMembers(conversationId);
    }

    // ==================== UNSYNCED MESSAGES SYNC ====================

    /**
     * Sync unsynced messages to server
     */
    private async syncUnsyncedMessages(): Promise<void> {
        try {
            const unsyncedMessages = await databaseService.getUnsyncedMessages();

            if (unsyncedMessages.length === 0) return;

            console.log(`🔄 Syncing ${unsyncedMessages.length} unsynced messages...`);

            for (const message of unsyncedMessages) {
                try {
                    // Skip if it's a temporary message
                    if (message.id.startsWith('temp_')) continue;

                    const response = await chatService.sendMessage({
                        conversationId: message.conversationId,
                        type: message.type as 'TEXT' | 'ACTIVITY',
                        content: message.content
                    });

                    if (response.status === 'success') {
                        await databaseService.markMessageAsSynced(message.id);
                    }
                } catch (error) {
                    console.error(`Failed to sync message ${message.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to sync unsynced messages:', error);
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Update conversation in local DB
     */
    async updateConversation(conversationId: string, updates: Partial<ChatConversation>): Promise<void> {
        await databaseService.initialize();
        await databaseService.updateConversation(conversationId, updates);
    }

    /**
     * Clear all local data
     */
    async clearAllData(): Promise<void> {
        await databaseService.initialize();
        await databaseService.clearAllData();
    }

    /**
     * Reset database (for fixing constraint errors)
     */
    async resetDatabase(): Promise<void> {
        await databaseService.initialize();
        await databaseService.resetDatabase();
    }

    /**
     * Get sync statistics
     */
    async getSyncStats(): Promise<{
        conversations: number;
        messages: number;
        members: number;
        unsyncedMessages: number;
    }> {
        await databaseService.initialize();
        return await databaseService.getStats();
    }

    /**
     * Check if sync is in progress
     */
    isSyncInProgress(): boolean {
        return this.isSyncing;
    }

    // ==================== SMART SYNC INTEGRATION ====================

    /**
     * Schedule smart sync for a conversation
     */
    scheduleSmartSync(conversationId: string, reason: string = 'manual'): void {
        smartSyncManager.scheduleSync(conversationId, reason);
    }

    /**
     * Schedule smart sync for multiple conversations
     */
    scheduleBatchSmartSync(conversationIds: string[], reason: string = 'batch'): void {
        smartSyncManager.scheduleBatchSync(conversationIds, reason);
    }

    /**
     * Force immediate smart sync for a conversation
     */
    async forceSmartSync(conversationId: string): Promise<void> {
        await smartSyncManager.forceSync(conversationId);
    }

    /**
     * Get smart sync statistics
     */
    getSmartSyncStats() {
        return smartSyncManager.getSyncStats();
    }

    /**
     * Clear smart sync queue
     */
    clearSmartSyncQueue(): void {
        smartSyncManager.clearSyncQueue();
    }

    /**
     * Reset smart sync manager
     */
    resetSmartSync(): void {
        smartSyncManager.reset();
    }
}

// Export singleton instance
export const chatSyncService = new ChatSyncService();
export default chatSyncService;
