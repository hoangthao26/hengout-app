import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { databaseService } from './databaseService';
import { smartSyncManager } from './smartSyncManager';

// CONVERSATION CLEANUP MANAGER - Smart cleanup to prevent memory leaks
class ConversationCleanupManager {
    private cleanupTimer: NodeJS.Timeout | null = null;
    private isCleanupInProgress = false;
    private lastCleanupTime = 0;

    // Cleanup configuration
    private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    private readonly INACTIVE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
    private readonly UNUSED_THRESHOLD = 14 * 24 * 60 * 60 * 1000; // 14 days
    private readonly MEMORY_THRESHOLD = 0.8; // 80% memory usage
    private readonly MAX_CLEANUP_BATCH_SIZE = 20; // Max conversations to cleanup at once

    // Smart cleanup configuration
    private readonly MAX_MESSAGES_PER_CONVERSATION = 50; // Keep 50 recent messages
    private readonly MAX_MEDIA_FILES_PER_CONVERSATION = 20; // Keep 20 recent media files
    private readonly MAX_TEMP_DATA_AGE = 3 * 24 * 60 * 60 * 1000; // 3 days

    /**
     * Initialize cleanup manager
     */
    initialize(): void {
        // Initializing smart cleanup manager
        this.startPeriodicCleanup();
    }

    /**
     * Start periodic cleanup
     */
    private startPeriodicCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.performPeriodicCleanup();
        }, this.CLEANUP_INTERVAL);

    }

    /**
     * Stop periodic cleanup
     */
    stopCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Perform periodic cleanup
     */
    private async performPeriodicCleanup(): Promise<void> {
        if (this.isCleanupInProgress) {
            return;
        }

        try {
            await this.cleanupInactiveConversations();
            this.lastCleanupTime = Date.now();
        } catch (error) {
            console.error('[ConversationCleanup] Periodic cleanup failed:', error);
        }
    }

    /**
     * Cleanup inactive conversations - SMART CLEANUP (giống app lớn)
     */
    async cleanupInactiveConversations(force: boolean = false): Promise<{
        cleaned: number;
        skipped: number;
        errors: number;
    }> {
        if (this.isCleanupInProgress && !force) {
            // Cleanup already in progress, skipping
            return { cleaned: 0, skipped: 0, errors: 0 };
        }

        try {
            this.isCleanupInProgress = true;

            // Check if user is authenticated
            const { isAuthenticated } = useAuthStore.getState();
            if (!isAuthenticated) {
                return { cleaned: 0, skipped: 0, errors: 0 };
            }

            const { conversations, selectedConversationId } = useChatStore.getState();
            const now = Date.now();

            // Find conversations to cleanup
            const conversationsToCleanup = conversations.filter(conv =>
                this.shouldCleanupConversation(conv, selectedConversationId, now)
            );

            if (conversationsToCleanup.length === 0) {
                return { cleaned: 0, skipped: 0, errors: 0 };
            }

            // Cleanup in batches
            const result = await this.cleanupConversationsBatch(conversationsToCleanup);

            return result;

        } catch (error) {
            console.error('[ConversationCleanup] Cleanup failed:', error);
            return { cleaned: 0, skipped: 0, errors: 1 };
        } finally {
            this.isCleanupInProgress = false;
        }
    }

    /**
     * Determine if a conversation should be cleaned up using multi-criteria decision logic
     * 
     * Cleanup decision tree (all conditions must pass):
     * 1. Exclusion checks (if true, NEVER cleanup):
     *    - Current conversation (user actively viewing)
     *    - Pinned conversations (future feature, user marked as important)
     * 
     * 2. Activity-based criteria (AND logic - both must pass):
     *    - No activity for 7+ days (lastMessage > 7 days old)
     *    - Not opened for 14+ days (lastOpenedAt > 14 days old)
     * 
     * Strategy rationale:
     * - Dual threshold (7 days activity, 14 days opened) prevents accidental cleanup
     * - Current conversation protection ensures active sessions aren't disrupted
     * - Pinned conversations bypass cleanup (user preference)
     * 
     * @param conversation - Conversation to evaluate
     * @param currentConversationId - Currently active conversation ID (never cleanup)
     * @param now - Current timestamp for age calculations
     * @returns true if should cleanup, false if should preserve
     */
    private shouldCleanupConversation(
        conversation: any,
        currentConversationId: string | null,
        now: number
    ): boolean {
        // Exclusion 1: Never cleanup current conversation (user is actively viewing it)
        if (conversation.id === currentConversationId) {
            return false;
        }

        // Exclusion 2: Never cleanup pinned conversations (user marked as important)
        if ((conversation as any).isPinned) {
            return false;
        }

        // Calculate time since last activity (message sent/received)
        const lastActivity = new Date(conversation.lastMessage?.createdAt || conversation.createdAt).getTime();
        const timeSinceActivity = now - lastActivity;

        // Calculate time since last opened (user interaction)
        const lastOpened = conversation.lastOpenedAt || lastActivity;
        const timeSinceOpened = now - lastOpened;

        // Cleanup only if both conditions met:
        // 1. No activity for 7+ days (inactive)
        // 2. Not opened for 14+ days (unused)
        return (
            timeSinceActivity > this.INACTIVE_THRESHOLD &&
            timeSinceOpened > this.UNUSED_THRESHOLD
        );
    }

    /**
     * Cleanup conversations in batches to avoid memory/performance issues
     * 
     * Splits conversations into smaller batches and processes them sequentially
     * with delays between batches to prevent overwhelming the system.
     * 
     * @param conversations - Array of conversations to clean up
     * @returns Summary of cleanup results (cleaned, skipped, errors)
     */
    private async cleanupConversationsBatch(conversations: any[]): Promise<{
        cleaned: number;
        skipped: number;
        errors: number;
    }> {
        let cleaned = 0;
        let skipped = 0;
        let errors = 0;

        // Split conversations into batches for processing
        const batches = [];
        for (let i = 0; i < conversations.length; i += this.MAX_CLEANUP_BATCH_SIZE) {
            batches.push(conversations.slice(i, i + this.MAX_CLEANUP_BATCH_SIZE));
        }

        // Process each batch sequentially
        for (const batch of batches) {
            const batchResult = await this.cleanupBatch(batch);
            cleaned += batchResult.cleaned;
            skipped += batchResult.skipped;
            errors += batchResult.errors;

            // Add delay between batches to prevent system overload
            if (batches.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        return { cleaned, skipped, errors };
    }

    /**
     * Process a single batch of conversations for cleanup
     * 
     * Iterates through conversations and attempts cleanup for each.
     * Tracks successes, skips, and errors for reporting.
     * 
     * @param conversations - Batch of conversations to process
     * @returns Summary of batch processing results
     */
    private async cleanupBatch(conversations: any[]): Promise<{
        cleaned: number;
        skipped: number;
        errors: number;
    }> {
        let cleaned = 0;
        let skipped = 0;
        let errors = 0;

        for (const conversation of conversations) {
            try {
                await this.cleanupOldConversationData(conversation);
                cleaned++;
            } catch (error) {
                console.error(`[ConversationCleanup] Failed to cleanup conversation ${conversation.id}:`, error);
                errors++;
            }
        }

        return { cleaned, skipped, errors };
    }

    /**
     * Smart cleanup for conversation - removes old data without deleting the conversation
     * 
     * This is a multi-step cleanup process that:
     * 1. Removes old messages (keeps only recent ones)
     * 2. Removes old media files if any
     * 3. Removes stale temporary data
     * 4. Clears memory cache
     * 
     * The conversation itself is preserved, only old data is cleaned.
     * 
     * @param conversation - Conversation object to clean up
     */
    private async cleanupOldConversationData(conversation: any): Promise<void> {
        try {
            // Step 1: Clean old messages (keep only the most recent 50 messages)
            await this.cleanupOldMessages(conversation.id);

            // Step 2: Clean old media files (if any exist)
            await this.cleanupOldMedia(conversation.id);

            // Step 3: Clean old temporary data (drafts, cache, etc.)
            await this.cleanupTempData(conversation.id);

            // Step 4: Clean memory cache (doesn't delete the conversation)
            await this.cleanupMemoryCache(conversation.id);
        } catch (error) {
            console.error(`[ConversationCleanup] Failed to smart cleanup conversation ${conversation.id}:`, error);
            throw error;
        }
    }

    /**
     * Clean old messages from a conversation
     * 
     * Strategy: Keep only the most recent N messages (default: 50)
     * - Fetches all messages from database
     * - Sorts by creation time (newest first)
     * - Keeps the most recent messages
     * - Deletes older messages to free up space
     * - Updates conversation's lastMessage reference
     * 
     * This prevents database bloat while preserving recent conversation history
     */
    private async cleanupOldMessages(conversationId: string): Promise<void> {
        try {
            // Fetch all messages (limit 1000 to avoid memory issues)
            const messages = await databaseService.getMessages(conversationId, 1000, 0);

            // Skip cleanup if conversation has fewer messages than limit
            if (messages.length <= this.MAX_MESSAGES_PER_CONVERSATION) {
                return;
            }

            // Sort by creation time (newest first)
            const sortedMessages = messages.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // Keep most recent messages, delete the rest
            const keepMessages = sortedMessages.slice(0, this.MAX_MESSAGES_PER_CONVERSATION);
            const deleteMessages = sortedMessages.slice(this.MAX_MESSAGES_PER_CONVERSATION);

            // Delete old messages from database
            for (const message of deleteMessages) {
                await databaseService.deleteMessage(message.id);
            }

            // Update conversation with most recent message info
            if (keepMessages.length > 0) {
                const lastMessage = keepMessages[0];
                await databaseService.updateConversationLastMessage(
                    conversationId,
                    lastMessage.id,
                    lastMessage.createdAt,
                    lastMessage.mine,
                    lastMessage.senderName
                );
            }
        } catch (error) {
            console.error(`[ConversationCleanup] Failed to cleanup old messages for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Clean old media files (placeholder for future implementation)
     * 
     * This method will be implemented when media support is added to conversations.
     * It will remove old media files that are no longer needed to free up storage space.
     * 
     * @param conversationId - ID of conversation to clean media for
     */
    private async cleanupOldMedia(conversationId: string): Promise<void> {
        try {
            // TODO: Implement media cleanup when we add media support
            // Strategy: Remove media files older than a certain threshold or exceeding storage limits
        } catch (error) {
            console.error(`[ConversationCleanup] Failed to cleanup old media for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Clean temporary data older than threshold
     * 
     * Removes temporary data (e.g., unsent drafts, cached data) that exceeds the age limit.
     * This helps prevent accumulation of stale temporary data.
     * 
     * @param conversationId - ID of conversation to clean temp data for
     */
    private async cleanupTempData(conversationId: string): Promise<void> {
        try {
            // Clean temp data older than 3 days
            const now = Date.now();
            const tempDataThreshold = now - this.MAX_TEMP_DATA_AGE;

            // TODO: Implement temp data cleanup when we add temp data support
            // Strategy: Query and delete temp data where timestamp < tempDataThreshold
        } catch (error) {
            console.error(`[ConversationCleanup] Failed to cleanup temp data for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Clean memory cache for conversation
     * 
     * Clears cached data from memory without deleting the conversation itself.
     * This helps free up memory while keeping the conversation structure intact.
     * 
     * @param conversationId - ID of conversation to clean memory cache for
     */
    private async cleanupMemoryCache(conversationId: string): Promise<void> {
        try {
            const { conversationMessages, messageSnapshots, cachedMessages } = useChatStore.getState();

            // Clean old messages from memory (giữ 50 messages gần nhất)
            if (conversationMessages[conversationId]) {
                const messages = conversationMessages[conversationId];
                if (messages.length > this.MAX_MESSAGES_PER_CONVERSATION) {
                    const keepMessages = messages.slice(0, this.MAX_MESSAGES_PER_CONVERSATION);
                    useChatStore.getState().setConversationMessages(conversationId, keepMessages);
                }
            }

            // Clean old snapshots
            if (messageSnapshots[conversationId]) {
                delete messageSnapshots[conversationId];
            }

            // Clean old cached messages
            if (cachedMessages[conversationId]) {
                delete cachedMessages[conversationId];
            }
        } catch (error) {
            console.error(`[ConversationCleanup] Failed to cleanup memory cache for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Emergency cleanup when memory is high
     */
    async emergencyCleanup(): Promise<void> {
        try {
            // More aggressive cleanup
            const { conversations, selectedConversationId } = useChatStore.getState();
            const now = Date.now();

            // Find conversations to cleanup (more aggressive threshold)
            const conversationsToCleanup = conversations.filter(conv => {
                if (conv.id === selectedConversationId) return false;
                if ((conv as any).isPinned) return false;

                const lastActivity = new Date(conv.lastMessage?.createdAt || conv.createdAt).getTime();
                const timeSinceActivity = now - lastActivity;

                // Emergency cleanup: 3 days instead of 7
                return timeSinceActivity > (3 * 24 * 60 * 60 * 1000);
            });

            if (conversationsToCleanup.length > 0) {
                await this.cleanupConversationsBatch(conversationsToCleanup);
            }
        } catch (error) {
            console.error('[ConversationCleanup] Emergency cleanup failed:', error);
        }
    }

    /**
     * Manual cleanup trigger
     */
    async manualCleanup(): Promise<void> {
        await this.cleanupInactiveConversations(true);
    }

    /**
     * Get cleanup statistics
     */
    getCleanupStats(): {
        isCleanupInProgress: boolean;
        lastCleanupTime: number;
        timeSinceLastCleanup: number;
        nextCleanupTime: number;
    } {
        const now = Date.now();
        return {
            isCleanupInProgress: this.isCleanupInProgress,
            lastCleanupTime: this.lastCleanupTime,
            timeSinceLastCleanup: this.lastCleanupTime ? now - this.lastCleanupTime : 0,
            nextCleanupTime: this.lastCleanupTime ? this.lastCleanupTime + this.CLEANUP_INTERVAL : now + this.CLEANUP_INTERVAL
        };
    }

    /**
     * Reset cleanup manager
     */
    reset(): void {
        this.stopCleanup();
        this.isCleanupInProgress = false;
        this.lastCleanupTime = 0;
    }
}

// Export singleton instance
export const conversationCleanupManager = new ConversationCleanupManager();
export default conversationCleanupManager;
