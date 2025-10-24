import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { databaseService } from './databaseService';
import { smartSyncManager } from './smartSyncManager';

// 🧹 CONVERSATION CLEANUP MANAGER - Smart cleanup to prevent memory leaks
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

        // Smart periodic cleanup scheduled
    }

    /**
     * Stop periodic cleanup
     */
    stopCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        // Periodic cleanup stopped
    }

    /**
     * Perform periodic cleanup
     */
    private async performPeriodicCleanup(): Promise<void> {
        if (this.isCleanupInProgress) {
            // Cleanup already in progress, skipping
            return;
        }

        try {
            // Starting smart periodic cleanup
            await this.cleanupInactiveConversations();
            this.lastCleanupTime = Date.now();
            // Smart periodic cleanup completed
        } catch (error) {
            console.error('❌ [ConversationCleanup] Periodic cleanup failed:', error);
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
            // Starting smart conversation cleanup

            // Check if user is authenticated
            const { isAuthenticated } = useAuthStore.getState();
            if (!isAuthenticated) {
                // User not authenticated, skipping cleanup
                return { cleaned: 0, skipped: 0, errors: 0 };
            }

            const { conversations, selectedConversationId } = useChatStore.getState();
            const now = Date.now();

            // Find conversations to cleanup
            const conversationsToCleanup = conversations.filter(conv =>
                this.shouldCleanupConversation(conv, selectedConversationId, now)
            );

            if (conversationsToCleanup.length === 0) {
                // No conversations need cleanup
                return { cleaned: 0, skipped: 0, errors: 0 };
            }

            // Found conversations to cleanup

            // Cleanup in batches
            const result = await this.cleanupConversationsBatch(conversationsToCleanup);

            // Smart cleanup completed
            return result;

        } catch (error) {
            console.error('❌ [ConversationCleanup] Cleanup failed:', error);
            return { cleaned: 0, skipped: 0, errors: 1 };
        } finally {
            this.isCleanupInProgress = false;
        }
    }

    /**
     * Check if conversation should be cleaned up
     */
    private shouldCleanupConversation(
        conversation: any,
        currentConversationId: string | null,
        now: number
    ): boolean {
        // Never cleanup current conversation
        if (conversation.id === currentConversationId) {
            return false;
        }

        // Never cleanup pinned conversations (if we add this feature)
        if ((conversation as any).isPinned) {
            return false;
        }

        // Check last activity
        const lastActivity = new Date(conversation.lastMessage?.createdAt || conversation.createdAt).getTime();
        const timeSinceActivity = now - lastActivity;

        // Check last opened (if we track this)
        const lastOpened = conversation.lastOpenedAt || lastActivity;
        const timeSinceOpened = now - lastOpened;

        // Cleanup if:
        // 1. No activity for more than 7 days AND
        // 2. Not opened for more than 14 days
        const shouldCleanup = (
            timeSinceActivity > this.INACTIVE_THRESHOLD &&
            timeSinceOpened > this.UNUSED_THRESHOLD
        );

        if (shouldCleanup) {
            // Marking for smart cleanup
        }

        return shouldCleanup;
    }

    /**
     * Cleanup conversations in batches
     */
    private async cleanupConversationsBatch(conversations: any[]): Promise<{
        cleaned: number;
        skipped: number;
        errors: number;
    }> {
        let cleaned = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches
        const batches = [];
        for (let i = 0; i < conversations.length; i += this.MAX_CLEANUP_BATCH_SIZE) {
            batches.push(conversations.slice(i, i + this.MAX_CLEANUP_BATCH_SIZE));
        }

        for (const batch of batches) {
            const batchResult = await this.cleanupBatch(batch);
            cleaned += batchResult.cleaned;
            skipped += batchResult.skipped;
            errors += batchResult.errors;

            // Small delay between batches
            if (batches.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        return { cleaned, skipped, errors };
    }

    /**
     * Cleanup a batch of conversations
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
                console.error(`❌ [ConversationCleanup] Failed to cleanup conversation ${conversation.id}:`, error);
                errors++;
            }
        }

        return { cleaned, skipped, errors };
    }

    /**
     * Smart cleanup - chỉ clean data cũ, không xóa toàn bộ conversation
     */
    private async cleanupOldConversationData(conversation: any): Promise<void> {
        // Smart cleaning conversation

        try {
            // 1. Clean old messages (giữ 50 messages gần nhất)
            await this.cleanupOldMessages(conversation.id);

            // 2. Clean old media files (nếu có)
            await this.cleanupOldMedia(conversation.id);

            // 3. Clean temp data cũ
            await this.cleanupTempData(conversation.id);

            // 4. Clean memory cache (không xóa conversation)
            await this.cleanupMemoryCache(conversation.id);

            // Smart cleaned conversation
        } catch (error) {
            console.error(`❌ [ConversationCleanup] Failed to smart cleanup conversation ${conversation.id}:`, error);
            throw error;
        }
    }

    /**
     * Clean old messages - giữ 50 messages gần nhất
     */
    private async cleanupOldMessages(conversationId: string): Promise<void> {
        try {
            // Lấy messages từ database
            const messages = await databaseService.getMessages(conversationId, 1000, 0); // Lấy tất cả

            if (messages.length <= this.MAX_MESSAGES_PER_CONVERSATION) {
                // Conversation has no cleanup needed
                return;
            }

            // Sắp xếp theo thời gian (mới nhất trước)
            const sortedMessages = messages.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // Giữ 50 messages gần nhất
            const keepMessages = sortedMessages.slice(0, this.MAX_MESSAGES_PER_CONVERSATION);
            const deleteMessages = sortedMessages.slice(this.MAX_MESSAGES_PER_CONVERSATION);

            // Cleaning old messages from conversation

            // Xóa messages cũ từ database
            for (const message of deleteMessages) {
                await databaseService.deleteMessage(message.id);
            }

            // Cập nhật conversation với messages gần nhất
            if (keepMessages.length > 0) {
                const lastMessage = keepMessages[0]; // Message mới nhất
                await databaseService.updateConversationLastMessage(
                    conversationId,
                    lastMessage.id,
                    lastMessage.createdAt,
                    lastMessage.mine,
                    lastMessage.senderName
                );
            }

            console.log(`✅ [ConversationCleanup] Cleaned ${deleteMessages.length} old messages, kept ${keepMessages.length} recent messages`);
        } catch (error) {
            console.error(`❌ [ConversationCleanup] Failed to cleanup old messages for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Clean old media files (placeholder for future implementation)
     */
    private async cleanupOldMedia(conversationId: string): Promise<void> {
        try {
            // TODO: Implement media cleanup when we add media support
            // For now, just log that we would clean media
            // Media cleanup not implemented yet
        } catch (error) {
            console.error(`❌ [ConversationCleanup] Failed to cleanup old media for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Clean temp data cũ
     */
    private async cleanupTempData(conversationId: string): Promise<void> {
        try {
            // Clean temp data older than 3 days
            const now = Date.now();
            const tempDataThreshold = now - this.MAX_TEMP_DATA_AGE;

            // TODO: Implement temp data cleanup when we add temp data support
            // For now, just log that we would clean temp data
            console.log(`ℹ️ [ConversationCleanup] Temp data cleanup for conversation ${conversationId} - not implemented yet`);
        } catch (error) {
            console.error(`❌ [ConversationCleanup] Failed to cleanup temp data for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Clean memory cache (không xóa conversation)
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
                    console.log(`🧹 [ConversationCleanup] Cleaned memory cache: ${messages.length} → ${keepMessages.length} messages`);
                }
            }

            // Clean old snapshots
            if (messageSnapshots[conversationId]) {
                delete messageSnapshots[conversationId];
                console.log(`🧹 [ConversationCleanup] Cleaned message snapshots for conversation ${conversationId}`);
            }

            // Clean old cached messages
            if (cachedMessages[conversationId]) {
                delete cachedMessages[conversationId];
                console.log(`🧹 [ConversationCleanup] Cleaned cached messages for conversation ${conversationId}`);
            }

            // Memory cache cleaned for conversation
        } catch (error) {
            console.error(`❌ [ConversationCleanup] Failed to cleanup memory cache for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Emergency cleanup when memory is high
     */
    async emergencyCleanup(): Promise<void> {
        console.log('🚨 [ConversationCleanup] Starting emergency smart cleanup...');

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
                console.log(`🚨 [ConversationCleanup] Emergency smart cleanup: ${conversationsToCleanup.length} conversations`);
                await this.cleanupConversationsBatch(conversationsToCleanup);
            }

            console.log('✅ [ConversationCleanup] Emergency smart cleanup completed');
        } catch (error) {
            console.error('❌ [ConversationCleanup] Emergency cleanup failed:', error);
        }
    }

    /**
     * Manual cleanup trigger
     */
    async manualCleanup(): Promise<void> {
        console.log('🔧 [ConversationCleanup] Manual smart cleanup triggered');
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
        console.log('🔄 [ConversationCleanup] Smart cleanup manager reset');
    }
}

// Export singleton instance
export const conversationCleanupManager = new ConversationCleanupManager();
export default conversationCleanupManager;
