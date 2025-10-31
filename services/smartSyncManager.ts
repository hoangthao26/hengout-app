import { chatSyncService } from './chatSyncService';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

// SMART SYNC MANAGER - Intelligent background sync
class SmartSyncManager {
    private syncQueue = new Set<string>();
    private syncInProgress = false;
    private lastSyncTime: { [conversationId: string]: number } = {};
    private lastActivityTime: { [conversationId: string]: number } = {};
    private debounceTimer: NodeJS.Timeout | null = null;

    // Sync configuration
    private readonly SYNC_DEBOUNCE_DELAY = 5000; // 5 seconds
    private readonly MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_SYNC_BATCH_SIZE = 10; // Max conversations per batch

    /**
     * Schedule sync for a specific conversation
     */
    scheduleSync(conversationId: string, reason: string = 'unknown'): void {
        // Scheduling sync for conversation

        // Update activity time
        this.lastActivityTime[conversationId] = Date.now();

        // Add to sync queue
        this.syncQueue.add(conversationId);

        // Debounce sync to avoid too frequent calls
        this.debouncedSync();
    }

    /**
     * Schedule sync for multiple conversations
     */
    scheduleBatchSync(conversationIds: string[], reason: string = 'batch'): void {
        // Scheduling batch sync for conversations

        const now = Date.now();
        conversationIds.forEach(id => {
            this.lastActivityTime[id] = now;
            this.syncQueue.add(id);
        });

        this.debouncedSync();
    }

    /**
     * Debounced sync - gộp nhiều sync requests thành 1
     */
    private debouncedSync(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.processSyncQueue();
        }, this.SYNC_DEBOUNCE_DELAY);
    }

    /**
     * Process sync queue with priority
     */
    private async processSyncQueue(): Promise<void> {
        if (this.syncInProgress || this.syncQueue.size === 0) {
            return;
        }

        try {
            this.syncInProgress = true;
            // Processing sync queue

            // Get conversations to sync
            const conversationsToSync = Array.from(this.syncQueue);
            this.syncQueue.clear();

            // Filter conversations that actually need sync
            const conversationsNeedingSync = conversationsToSync.filter(id =>
                this.shouldSync(id)
            );

            if (conversationsNeedingSync.length === 0) {
                // No conversations need sync, skipping
                return;
            }

            // Sort by priority
            const prioritizedConversations = this.prioritizeConversations(conversationsNeedingSync);

            // Sync in batches
            await this.syncInBatches(prioritizedConversations);

            // Completed sync for conversations

        } catch (error) {
            console.error('[SmartSync] Sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Check if conversation should be synced
     */
    private shouldSync(conversationId: string): boolean {
        const now = Date.now();
        const lastSync = this.lastSyncTime[conversationId] || 0;
        const lastActivity = this.lastActivityTime[conversationId] || 0;

        // Don't sync if:
        // 1. Already synced recently (< 5 minutes)
        // 2. No recent activity
        // 3. User not authenticated
        // 4. App in background

        const timeSinceLastSync = now - lastSync;
        const timeSinceLastActivity = now - lastActivity;

        if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
            // Skipping - synced recently
            return false;
        }

        if (timeSinceLastActivity > this.MIN_SYNC_INTERVAL * 2) {
            // Skipping - no recent activity
            return false;
        }

        // Check if user is authenticated
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
            // Skipping - user not authenticated
            return false;
        }

        return true;
    }

    /**
     * Prioritize conversations for sync
     */
    private prioritizeConversations(conversationIds: string[]): string[] {
        const { conversations, selectedConversationId } = useChatStore.getState();

        return conversationIds.sort((a, b) => {
            // Priority 1: Current conversation
            if (a === selectedConversationId) return -1;
            if (b === selectedConversationId) return 1;

            // Priority 2: Recent conversations (by lastMessage)
            const convA = conversations.find(c => c.id === a);
            const convB = conversations.find(c => c.id === b);

            if (convA && convB) {
                const timeA = new Date(convA.lastMessage?.createdAt || convA.createdAt).getTime();
                const timeB = new Date(convB.lastMessage?.createdAt || convB.createdAt).getTime();
                return timeB - timeA; // Newer first
            }

            // Priority 3: By activity time
            const activityA = this.lastActivityTime[a] || 0;
            const activityB = this.lastActivityTime[b] || 0;
            return activityB - activityA;
        });
    }

    /**
     * Sync conversations in batches
     */
    private async syncInBatches(conversationIds: string[]): Promise<void> {
        const batches = [];
        for (let i = 0; i < conversationIds.length; i += this.MAX_SYNC_BATCH_SIZE) {
            batches.push(conversationIds.slice(i, i + this.MAX_SYNC_BATCH_SIZE));
        }

        for (const batch of batches) {
            await this.syncBatch(batch);

            // Small delay between batches to avoid overwhelming server
            if (batches.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Sync a batch of conversations
     */
    private async syncBatch(conversationIds: string[]): Promise<void> {
        // Syncing batch

        const syncPromises = conversationIds.map(async (conversationId) => {
            try {
                // Sync messages for this conversation
                await chatSyncService.syncMessages(conversationId, 0, 50);

                // Update last sync time
                this.lastSyncTime[conversationId] = Date.now();

                // Synced conversation
            } catch (error) {
                console.error(`[SmartSync] Failed to sync conversation ${conversationId}:`, error);
            }
        });

        await Promise.allSettled(syncPromises);
    }

    /**
     * Force immediate sync for a conversation
     */
    async forceSync(conversationId: string): Promise<void> {
        // Force syncing conversation

        try {
            await chatSyncService.syncMessages(conversationId, 0, 50);
            this.lastSyncTime[conversationId] = Date.now();
            // Force sync completed
        } catch (error) {
            console.error(`[SmartSync] Force sync failed for ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Get sync statistics
     */
    getSyncStats(): {
        queueSize: number;
        lastSyncTimes: { [conversationId: string]: number };
        lastActivityTimes: { [conversationId: string]: number };
        isSyncInProgress: boolean;
    } {
        return {
            queueSize: this.syncQueue.size,
            lastSyncTimes: { ...this.lastSyncTime },
            lastActivityTimes: { ...this.lastActivityTime },
            isSyncInProgress: this.syncInProgress
        };
    }

    /**
     * Clear sync queue and reset timers
     */
    clearSyncQueue(): void {
        this.syncQueue.clear();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        // Cleared sync queue
    }

    /**
     * Reset all sync data
     */
    reset(): void {
        this.syncQueue.clear();
        this.lastSyncTime = {};
        this.lastActivityTime = {};
        this.syncInProgress = false;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // Reset all sync data
    }
}

// Export singleton instance
export const smartSyncManager = new SmartSyncManager();
export default smartSyncManager;
