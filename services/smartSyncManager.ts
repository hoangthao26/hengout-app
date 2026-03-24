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
     * Debounced sync - Aggregates multiple sync requests into single batch
     * 
     * Implements debounce pattern to prevent excessive sync calls:
     * - Waits SYNC_DEBOUNCE_DELAY (5s) before processing
     * - Cancels previous timer if new request arrives
     * - Reduces server load and improves battery life
     * 
     * Example: 10 sync requests in 3 seconds → single sync after 5 seconds
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
     * Process sync queue with intelligent filtering and prioritization
     * 
     * Multi-stage processing pipeline:
     * 1. Collects all queued conversations
     * 2. Filters by shouldSync() logic (time-based, auth checks)
     * 3. Prioritizes conversations (current > recent > others)
     * 4. Syncs in batches to avoid overwhelming server
     * 
     * Thread-safe: Uses isSyncInProgress flag to prevent concurrent processing
     */
    private async processSyncQueue(): Promise<void> {
        if (this.syncInProgress || this.syncQueue.size === 0) {
            return;
        }

        try {
            this.syncInProgress = true;

            // Stage 1: Collect conversations from queue and clear it
            const conversationsToSync = Array.from(this.syncQueue);
            this.syncQueue.clear();

            // Stage 2: Filter conversations that actually need sync
            // (excludes recently synced, inactive, or unauthenticated)
            const conversationsNeedingSync = conversationsToSync.filter(id =>
                this.shouldSync(id)
            );

            if (conversationsNeedingSync.length === 0) {
                // All conversations filtered out, nothing to sync
                return;
            }

            // Stage 3: Prioritize conversations (current conversation first, then by recency)
            const prioritizedConversations = this.prioritizeConversations(conversationsNeedingSync);

            // Stage 4: Sync in batches with delays between batches
            await this.syncInBatches(prioritizedConversations);

        } catch (error) {
            console.error('[SmartSync] Sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Determines if a conversation should be synced based on multiple conditions
     * 
     * Sync decision logic (all must pass):
     * 1. Time-based: Not synced within MIN_SYNC_INTERVAL (5 min)
     * 2. Activity-based: Had activity within 2x MIN_SYNC_INTERVAL (10 min)
     * 3. Auth check: User must be authenticated
     * 
     * Prevents unnecessary syncs for:
     * - Recently synced conversations (rate limiting)
     * - Inactive conversations (optimization)
     * - Unauthenticated users (error prevention)
     * 
     * @param conversationId - ID of conversation to check
     * @returns true if should sync, false otherwise
     */
    private shouldSync(conversationId: string): boolean {
        const now = Date.now();
        const lastSync = this.lastSyncTime[conversationId] || 0;
        const lastActivity = this.lastActivityTime[conversationId] || 0;

        const timeSinceLastSync = now - lastSync;
        const timeSinceLastActivity = now - lastActivity;

        // Condition 1: Rate limiting - skip if synced too recently
        if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
            return false;
        }

        // Condition 2: Activity threshold - skip if no recent activity
        if (timeSinceLastActivity > this.MIN_SYNC_INTERVAL * 2) {
            return false;
        }

        // Condition 3: Authentication check - skip if user not logged in
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
            return false;
        }

        return true;
    }

    /**
     * Prioritize conversations for sync based on importance and recency
     * 
     * Priority order (ascending priority):
     * 1. Currently selected conversation (highest - user is viewing it)
     * 2. Recent conversations by lastMessage timestamp (newer = higher)
     * 3. Conversations by activity time (fallback if lastMessage unavailable)
     * 
     * Ensures critical conversations sync first for better UX.
     * 
     * @param conversationIds - Array of conversation IDs to prioritize
     * @returns Sorted array with highest priority first
     */
    private prioritizeConversations(conversationIds: string[]): string[] {
        const { conversations, selectedConversationId } = useChatStore.getState();

        return conversationIds.sort((a, b) => {
            // Priority 1: Current conversation gets highest priority
            if (a === selectedConversationId) return -1;
            if (b === selectedConversationId) return 1;

            // Priority 2: Sort by lastMessage timestamp (newer = higher priority)
            const convA = conversations.find(c => c.id === a);
            const convB = conversations.find(c => c.id === b);

            if (convA && convB) {
                const timeA = new Date(convA.lastMessage?.createdAt || convA.createdAt).getTime();
                const timeB = new Date(convB.lastMessage?.createdAt || convB.createdAt).getTime();
                return timeB - timeA; // Newer first (descending order)
            }

            // Priority 3: Fallback to activity time if conversation not found
            const activityA = this.lastActivityTime[a] || 0;
            const activityB = this.lastActivityTime[b] || 0;
            return activityB - activityA; // More recent activity first
        });
    }

    /**
     * Sync conversations in batches with rate limiting
     * 
     * Batch processing strategy:
     * 1. Splits conversations into batches of MAX_SYNC_BATCH_SIZE
     * 2. Processes batches sequentially (not parallel to avoid overwhelming server)
     * 3. Adds 1 second delay between batches (rate limiting)
     * 4. Skips delay if only one batch (optimization)
     * 
     * Rate limiting:
     * - Delays prevent overwhelming server with simultaneous sync requests
     * - Sequential processing ensures server can handle load gracefully
     * - 1 second delay balances speed vs server load
     * 
     * @param conversationIds - Array of conversation IDs to sync in batches
     */
    private async syncInBatches(conversationIds: string[]): Promise<void> {
        // Split conversations into batches
        const batches = [];
        for (let i = 0; i < conversationIds.length; i += this.MAX_SYNC_BATCH_SIZE) {
            batches.push(conversationIds.slice(i, i + this.MAX_SYNC_BATCH_SIZE));
        }

        // Process batches sequentially with rate limiting
        for (const batch of batches) {
            await this.syncBatch(batch);

            // Rate limiting: Add delay between batches (except last batch)
            if (batches.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
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
