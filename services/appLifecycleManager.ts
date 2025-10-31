import { AppState, AppStateStatus } from 'react-native';
import { conversationCleanupManager } from './conversationCleanupManager';
import { smartSyncManager } from './smartSyncManager';

// APP LIFECYCLE MANAGER - Handle app state changes and cleanup
class AppLifecycleManager {
    private appState: AppStateStatus = 'active';
    private backgroundTime: number = 0;
    private isInitialized = false;
    private appStateSubscription: any = null; // Store AppState subscription

    // Configuration
    private readonly BACKGROUND_CLEANUP_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    private readonly FOREGROUND_CLEANUP_DELAY = 5 * 1000; // 5 seconds

    // 🛡️ PROTECTION: Debouncing to prevent race conditions
    private disconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isDisconnecting = false;
    private isReconnecting = false;

    /**
     * Initialize app lifecycle manager
     */
    initialize(): void {
        if (this.isInitialized) {
            console.log('⚠️ [AppLifecycle] Already initialized');
            return;
        }

        console.log('[AppLifecycle] Initializing app lifecycle manager');

        // Listen to app state changes (returns subscription object)
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

        this.isInitialized = true;
        console.log('✅ [AppLifecycle] App lifecycle manager initialized');
    }

    /**
     * Handle app state changes
     */
    private handleAppStateChange = (nextAppState: AppStateStatus): void => {
        console.log(`[AppLifecycle] App state changed: ${this.appState} → ${nextAppState}`);

        if (this.appState === 'background' && nextAppState === 'active') {
            // App came to foreground
            console.log('[AppLifecycle] Triggering foreground handler...');
            this.handleAppForeground();
        } else if ((this.appState === 'active' || this.appState === 'inactive') && nextAppState === 'background') {
            // App went to background (from active OR inactive)
            console.log('[AppLifecycle] Triggering background handler...');
            this.handleAppBackground();
        } else if (this.appState === 'active' && nextAppState === 'inactive') {
            // App went to inactive (might go to background soon)
            console.log('[AppLifecycle] App went to inactive, preparing for possible background...');
            // Don't disconnect yet, wait for background
        }

        this.appState = nextAppState;
    };

    /**
     * Handle app going to background
     */
    private async handleAppBackground(): Promise<void> {
        console.log('[AppLifecycle] App went to background');
        this.backgroundTime = Date.now();

        // Clear smart sync queue to avoid unnecessary syncs
        smartSyncManager.clearSyncQueue();
        console.log('[AppLifecycle] Cleared smart sync queue');

        // PROTECTION: Debounced disconnect to prevent race conditions
        console.log('[AppLifecycle] Starting background disconnect process...');
        this.debouncedDisconnect();
    }

    /**
     * Debounced disconnect to prevent race conditions
     */
    private debouncedDisconnect(): void {
        console.log('[AppLifecycle] Starting debounced disconnect...');

        // Clear any pending disconnect
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            console.log('[AppLifecycle] Cleared pending disconnect');
        }

        // Clear any pending reconnect
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.isReconnecting = false;
            console.log('🧹 [AppLifecycle] Cleared pending reconnect');
        }

        // Set debounced disconnect
        this.disconnectTimeout = setTimeout(async () => {
            console.log('⏰ [AppLifecycle] Debounce timeout reached, starting disconnect...');

            if (this.isDisconnecting) {
                console.log('⚠️ [AppLifecycle] Disconnect already in progress, skipping');
                return;
            }

            this.isDisconnecting = true;
            try {
                console.log('🔌 [AppLifecycle] Disconnecting WebSocket...');
                const { chatWebSocketManager } = await import('./chatWebSocketManager');
                await chatWebSocketManager.disconnect();
                console.log('✅ [AppLifecycle] WebSocket disconnected due to background');
            } catch (error) {
                console.error('❌ [AppLifecycle] Failed to disconnect WebSocket on background:', error);
            } finally {
                this.isDisconnecting = false;
            }
        }, 1000); // 1 second debounce

        console.log('⏳ [AppLifecycle] Disconnect scheduled in 1000ms');
    }

    /**
     * Handle app coming to foreground
     */
    private async handleAppForeground(): Promise<void> {
        console.log('[AppLifecycle] App came to foreground');

        const backgroundDuration = Date.now() - this.backgroundTime;
        console.log(`[AppLifecycle] Background duration: ${Math.round(backgroundDuration / 1000)}s`);

        // 🛡️ PROTECTION: Debounced reconnect to prevent race conditions
        this.debouncedReconnect();

        // Trigger cleanup if app was in background for a long time
        if (backgroundDuration > this.BACKGROUND_CLEANUP_THRESHOLD) {
            console.log('🧹 [AppLifecycle] App was in background for long time, triggering cleanup');

            // Delay cleanup to avoid blocking app startup
            setTimeout(() => {
                conversationCleanupManager.cleanupInactiveConversations().catch(error => {
                    console.error('❌ [AppLifecycle] Cleanup after foreground failed:', error);
                });
            }, this.FOREGROUND_CLEANUP_DELAY);
        }
    }

    /**
     * 🛡️ Debounced reconnect to prevent race conditions
     */
    private debouncedReconnect(): void {
        console.log('🔄 [AppLifecycle] Starting debounced reconnect...');

        // Clear any pending disconnect
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.isDisconnecting = false;
            console.log('[AppLifecycle] Cleared pending disconnect');
        }

        // Clear any pending reconnect
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            console.log('🧹 [AppLifecycle] Cleared pending reconnect');
        }

        // Set debounced reconnect
        this.reconnectTimeout = setTimeout(async () => {
            console.log('⏰ [AppLifecycle] Debounce timeout reached, starting reconnect...');

            if (this.isReconnecting) {
                console.log('⚠️ [AppLifecycle] Reconnect already in progress, skipping');
                return;
            }

            this.isReconnecting = true;
            try {
                // OPTIMIZED: Reinitialize services when app comes to foreground (giống lúc mở app)
                await this.reinitializeOnForeground();
            } catch (error) {
                console.error('❌ [AppLifecycle] Reconnect failed:', error);
            } finally {
                this.isReconnecting = false;
            }
        }, 500); // 0.5 second debounce (faster than disconnect)

        console.log('⏳ [AppLifecycle] Reconnect scheduled in 500ms');
    }

    /**
     * Reinitialize services when app comes to foreground (giống lúc mở app)
     */
    private async reinitializeOnForeground(): Promise<void> {
        try {
            console.log('🔄 [AppLifecycle] Reinitializing services on foreground...');

            // 1. Check authentication
            console.log('🔐 [AppLifecycle] Checking authentication...');
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                console.log('⚠️ [AppLifecycle] User not authenticated, skipping reinitialization');
                return;
            }
            console.log('✅ [AppLifecycle] User authenticated, proceeding...');

            // 2. Ensure WebSocket is connected (trigger reconnect if needed)
            const { chatWebSocketManager } = await import('./chatWebSocketManager');
            const isConnected = chatWebSocketManager.isConnected();

            if (!isConnected) {
                console.log('🔌 [AppLifecycle] WebSocket disconnected, triggering reconnect...');
                try {
                    await chatWebSocketManager.connect();
                    console.log('✅ [AppLifecycle] WebSocket connected successfully');
                } catch (connectError) {
                    console.error('❌ [AppLifecycle] Failed to connect WebSocket:', connectError);
                    // Continue anyway - WebSocket will auto-reconnect later
                }
            } else {
                console.log('✅ [AppLifecycle] WebSocket already connected');
            }

            // 3. Sync conversations from server (giống preloadChatData)
            console.log('🔄 [AppLifecycle] Syncing conversations from server...');
            const { chatSyncService } = await import('./chatSyncService');
            await chatSyncService.syncConversations();
            console.log('✅ [AppLifecycle] Conversations synced from server');

            // 4. Get updated conversations
            console.log('📋 [AppLifecycle] Getting conversations from database...');
            const conversations = await chatSyncService.getConversations();
            console.log(`📋 [AppLifecycle] Found ${conversations.length} conversations`);

            if (conversations.length > 0) {
                // 5. Ensure WebSocket is subscribed to ALL current conversations (including new ones)
                const conversationIds = conversations.map(conversation => conversation.id);
                console.log(`🔌 [AppLifecycle] Ensuring WebSocket subscription for ${conversationIds.length} conversations...`);
                console.log(`🔌 [AppLifecycle] Conversation IDs: ${conversationIds.join(', ')}`);

                // Get currently subscribed conversations
                const subscribedIds = chatWebSocketManager.getSubscribedConversations();
                const subscribedSet = new Set(subscribedIds);

                // Find conversations that need subscription (new or not yet subscribed)
                const conversationsToSubscribe = conversationIds.filter(id => !subscribedSet.has(id));

                if (conversationsToSubscribe.length > 0) {
                    console.log(`🔌 [AppLifecycle] Found ${conversationsToSubscribe.length} new conversations to subscribe`);
                    await chatWebSocketManager.subscribeToAllConversations(conversationsToSubscribe);
                    console.log('✅ [AppLifecycle] Subscribed to new conversations');
                } else {
                    console.log('✅ [AppLifecycle] All conversations already subscribed');
                }

                // 6. Update store with fresh data
                console.log('💾 [AppLifecycle] Updating store with fresh data...');
                const { useChatStore } = await import('../store/chatStore');
                const chatStore = useChatStore.getState();
                chatStore.setConversations(conversations);
                console.log('✅ [AppLifecycle] Store updated with fresh conversations');

                // 7. Preload messages for top conversations (giống preloadChatData)
                console.log('📨 [AppLifecycle] Preloading messages for top conversations...');
                const topConversations = conversations.slice(0, 15); // Top 15 conversations

                const preloadPromises = topConversations.map(async (conversation) => {
                    try {
                        // Sync messages from server before preload (giống lúc mở app)
                        await chatSyncService.syncMessages(conversation.id, 0, 50);

                        // Preload 50 messages (giống lúc mở app)
                        const recentMessages = await chatSyncService.getMessages(conversation.id, 50, 0);
                        if (recentMessages.length > 0) {
                            // Store in conversation messages
                            chatStore.setConversationMessages(conversation.id, recentMessages);
                            // Create snapshot
                            chatStore.setMessageSnapshot(conversation.id, recentMessages.slice(0, 25));
                        }
                    } catch (preloadError) {
                        console.error(`❌ [AppLifecycle] Failed to preload messages for ${conversation.id}:`, preloadError);
                    }
                });

                // Wait for all preloading to complete
                await Promise.all(preloadPromises);
                console.log('✅ [AppLifecycle] Messages preloaded for top conversations');

                // 8. Trigger smart sync for all conversations (giống initializeWebSocket)
                console.log('[AppLifecycle] Triggering smart sync for all conversations...');
                const { smartSyncManager } = await import('./smartSyncManager');
                smartSyncManager.scheduleBatchSync(conversationIds, 'app_foreground');
                console.log('✅ [AppLifecycle] Smart sync scheduled');

                console.log('[AppLifecycle] Services reinitialized on foreground successfully');
            } else {
                console.log('ℹ️ [AppLifecycle] No conversations found, skipping subscription');
            }

        } catch (error) {
            console.error('❌ [AppLifecycle] Reinitialization on foreground failed:', error);
        }
    }

    /**
     * Handle memory warning
     */
    handleMemoryWarning(): void {
        console.log('🚨 [AppLifecycle] Memory warning received');

        // Trigger emergency cleanup
        conversationCleanupManager.emergencyCleanup().catch(error => {
            console.error('❌ [AppLifecycle] Emergency cleanup failed:', error);
        });
    }

    /**
     * Handle app termination
     */
    handleAppTermination(): void {
        console.log('[AppLifecycle] App terminating');

        // Clean up resources
        this.cleanup();
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (!this.isInitialized) {
            return;
        }

        console.log('🧹 [AppLifecycle] Cleaning up app lifecycle manager');

        // 🛡️ PROTECTION: Clear all timeouts
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Reset flags
        this.isDisconnecting = false;
        this.isReconnecting = false;

        // Remove app state listener (using subscription object)
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }

        // Reset state
        this.isInitialized = false;
        this.appState = 'active';
        this.backgroundTime = 0;

        console.log('✅ [AppLifecycle] App lifecycle manager cleaned up');
    }

    /**
     * Get current app state
     */
    getCurrentAppState(): AppStateStatus {
        return this.appState;
    }

    /**
     * Get background duration
     */
    getBackgroundDuration(): number {
        if (this.appState === 'background') {
            return Date.now() - this.backgroundTime;
        }
        return 0;
    }

    /**
     * Check if app is in background
     */
    isAppInBackground(): boolean {
        return this.appState === 'background';
    }

    /**
     * Check if app is active
     */
    isAppActive(): boolean {
        return this.appState === 'active';
    }
}

// Export singleton instance
export const appLifecycleManager = new AppLifecycleManager();
export default appLifecycleManager;

