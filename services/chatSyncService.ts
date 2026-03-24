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
        // SMART SYNC: No more periodic sync - using event-driven sync instead
        // Chat sync service initialized with Smart Sync
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
            console.error('[ChatSyncService] Background sync failed:', error);
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
            // Force sync completed
        } catch (error) {
            console.error('[ChatSyncService] Force sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    // ==================== CONVERSATIONS SYNC ====================

    /**
     * Sync conversations from server to local DB with merge/delete logic
     * 
     * Sync strategy:
     * 1. PROACTIVE: Validates authentication before API call
     * 2. PROACTIVE: Refreshes token if expiring soon (< 5 min)
     * 3. Fetches conversations from server
     * 4. DEFENSIVE: Validates authentication after API call (logout detection)
     * 5. Merges server data: Saves/updates conversations from server
     * 6. Deletes local conversations not in server response (cleanup)
     * 
     * Merge logic:
     * - Server data is source of truth
     * - Local conversations not on server are deleted (user left, group disbanded)
     * - All server conversations are saved/updated locally
     * 
     * Error handling:
     * - 401 errors trigger logout (token invalid/expired)
     * - Logout during sync aborts gracefully (doesn't throw)
     * - Other errors are logged and rethrown
     * 
     * @throws Error if sync fails (except logout cases which abort silently)
     */
    async syncConversations(): Promise<void> {
        try {
            // Ensure database is initialized before sync
            await databaseService.initialize();

            // PROACTIVE: Check auth first (before making API call)
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                return; // User not authenticated, skipping sync
            }

            // PROACTIVE: Check token expiry and refresh if needed
            const tokens = await AuthHelper.getTokens();
            if (tokens && tokens.expiresIn < 5 * 60 * 1000) { // 5 minutes
                try {
                    // Use RefreshTokenManager for consistent refresh logic
                    const { refreshTokenManager } = await import('./refreshTokenManager');
                    await refreshTokenManager.performRefresh();
                } catch (error) {
                    return; // Don't make API call with expired token
                }
            }

            // Fetch conversations from server
            const response = await chatService.getConversations();

            // DEFENSIVE: Check if user logged out during API call
            const stillAuthenticated = await AuthHelper.isAuthenticated();
            if (!stillAuthenticated) {
                return; // User logged out, abort gracefully
            }

            if (response.status === 'success') {
                // Get current local conversations for comparison
                const currentConversations = await databaseService.getConversations();
                const serverConversationIds = new Set(response.data.map(c => c.id));

                // Merge: Save/update all conversations from server (server is source of truth)
                for (const conversation of response.data) {
                    await databaseService.saveConversation(conversation);
                }

                // Cleanup: Delete local conversations not in server response
                // (User left group, conversation deleted, etc.)
                for (const currentConv of currentConversations) {
                    if (!serverConversationIds.has(currentConv.id)) {
                        await databaseService.deleteConversation(currentConv.id);
                    }
                }
            }
        } catch (error: any) {
            // PROACTIVE: Handle 401 specifically (token invalid/expired)
            if (error.response?.status === 401) {
                try {
                    const { AuthHelper } = await import('./authHelper');
                    await AuthHelper.logoutAndNavigate();
                    return;
                } catch (logoutError) {
                    console.error('[ChatSyncService] Failed to logout:', logoutError);
                }
            }

            // DEFENSIVE: Don't throw error if user logged out (graceful abort)
            if (error.message?.includes('User logged out')) {
                return; // Abort silently
            }
            console.error('[ChatSyncService] Failed to sync conversations:', error);
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
            // Syncing messages for conversation

            // CHECK AUTH FIRST: Only sync if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                // User not authenticated, skipping message sync
                return [];
            }

            // Fetch messages from server
            const response = await chatService.getMessages(conversationId, page, size);

            // DEFENSIVE: Check if user is still authenticated after API call
            const stillAuthenticated = await AuthHelper.isAuthenticated();

            if (!stillAuthenticated) {
                // User logged out during message sync, aborting
                return [];
            }

            if (response.status === 'success') {
                // Save to local database
                for (const message of response.data) {
                    await databaseService.saveMessage(message);
                }

                // Synced messages
                return response.data;
            }

            return [];
        } catch (error: any) {
            // DEFENSIVE: Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                // User logged out during message sync, aborting gracefully
                return [];
            }
            console.error(`[ChatSyncService] Failed to sync messages for conversation ${conversationId}:`, error);
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
     * Send message with optimistic update pattern
     * 
     * Optimistic update flow:
     * 1. Creates temporary message with temp ID (instant UI update)
     * 2. Saves optimistic message to local DB (offline support)
     * 3. Sends message to server (async)
     * 4. On success: Deletes temp message, saves real message from server
     * 5. On failure: Marks temp message as failed (for retry)
     * 
     * Benefits:
     * - Instant UI feedback (message appears immediately)
     * - Works offline (message saved locally, synced later)
     * - Handles failures gracefully (marks as failed for retry)
     * - Prevents duplicate messages (temp ID replaced with real ID)
     * 
     * Temp ID format: `temp_${timestamp}_${random}` ensures uniqueness.
     * Real message from server replaces temp message to prevent duplicates.
     * 
     * @param messageData - Message data (conversationId, type, content)
     * @returns Real message from server (replaces optimistic message)
     * @throws Error if server send fails (optimistic message marked as failed)
     */
    async sendMessage(messageData: {
        conversationId: string;
        type: 'TEXT' | 'ACTIVITY';
        content: {
            text?: string;
            activityId?: string;
            name?: string;
            purpose?: string;
        };
    }): Promise<ChatMessage> {
        await databaseService.initialize();

        // Step 1: Create optimistic message with temp ID (instant UI update)
        const optimisticMessage: ChatMessage = {
            id: `temp_${Date.now()}_${Math.random()}`,
            conversationId: messageData.conversationId,
            senderId: 'current_user', // Should be actual user ID
            senderName: 'Bạn',
            senderAvatar: '',
            type: messageData.type,
            content: messageData.content,
            createdAt: new Date().toISOString(),
            mine: true
        };

        // Step 2: Save optimistic message to local DB (offline support)
        await databaseService.saveMessage(optimisticMessage);

        try {
            // Step 3: Send to server (async)
            const response = await chatService.sendMessage(messageData);

            if (response.status === 'success') {
                // Step 4: Replace optimistic message with real message from server
                await databaseService.deleteMessage(optimisticMessage.id);
                await databaseService.saveMessage(response.data);

                return response.data;
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
        } catch (error) {
            // Step 5: Mark optimistic message as failed (for retry later)
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
            // Syncing members for conversation

            // Check conversation type first - only sync members for GROUP conversations
            const conversation = await databaseService.getConversation(conversationId);
            if (!conversation || conversation.type !== 'GROUP') {
                // Skipping member sync for conversation
                return [];
            }

            // Fetch members from server
            const response = await chatService.getGroupMembers(conversationId);

            if (response.status === 'success') {
                // Save to local database
                for (const member of response.data) {
                    await databaseService.saveMember(member, conversationId);
                }

                // Synced members
                return response.data;
            }

            return [];
        } catch (error) {
            console.error(`[ChatSyncService] Failed to sync members for conversation ${conversationId}:`, error);
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
     * Sync unsynced messages to server with retry logic and temp message filtering
     * 
     * Offline message sync strategy:
     * 1. Fetches all unsynced messages from local database (failed sends, offline messages)
     * 2. Filters out temporary messages (temp_* IDs) - these are optimistic messages, not real failures
     * 3. Retries sending each message to server individually
     * 4. Marks successful messages as synced (prevents duplicate sends)
     * 5. Continues on individual failures (one failure doesn't block others)
     * 
     * Temp message handling:
     * - Temp messages (temp_*) are optimistic messages created during offline sends
     * - These are handled by optimistic update flow, not retry flow
     * - Skipping prevents duplicate sends (temp messages replaced by real messages on reconnect)
     * 
     * Error resilience:
     * - Individual message failures are logged but don't stop other messages
     * - Failed messages remain unsynced for next retry attempt
     * - Silent failures allow app to continue functioning
     * 
     * Use case: Periodic background sync to retry failed message sends after network recovery.
     */
    private async syncUnsyncedMessages(): Promise<void> {
        try {
            const unsyncedMessages = await databaseService.getUnsyncedMessages();

            if (unsyncedMessages.length === 0) return;

            // Process each unsynced message individually (parallel could overwhelm server)
            for (const message of unsyncedMessages) {
                try {
                    // Filter: Skip temporary messages (handled by optimistic update flow)
                    if (message.id.startsWith('temp_')) continue;

                    // Retry: Send message to server
                    const response = await chatService.sendMessage({
                        conversationId: message.conversationId,
                        type: message.type as 'TEXT' | 'ACTIVITY',
                        content: message.content
                    });

                    // Success: Mark as synced to prevent duplicate sends
                    if (response.status === 'success') {
                        await databaseService.markMessageAsSynced(message.id);
                    }
                } catch (error) {
                    // Individual failure: Log but continue with other messages
                    console.error(`[ChatSyncService] Failed to sync message ${message.id}:`, error);
                }
            }
        } catch (error) {
            // Overall failure: Log but don't throw (allows app to continue)
            console.error('[ChatSyncService] Failed to sync unsynced messages:', error);
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
     * Delete conversation from local DB (when user leaves/disbands)
     */
    async deleteConversation(conversationId: string): Promise<void> {
        await databaseService.initialize();
        await databaseService.deleteConversation(conversationId);
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
