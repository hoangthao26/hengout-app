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

    // PROTECTION: Debouncing to prevent race conditions
    private disconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isDisconnecting = false;
    private isReconnecting = false;

    /**
     * Initialize app lifecycle manager
     */
    initialize(): void {
        if (this.isInitialized) {
            return;
        }

        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
        this.isInitialized = true;
    }

    /**
     * Handle app state changes
     */
    private handleAppStateChange = (nextAppState: AppStateStatus): void => {
        if (this.appState === 'background' && nextAppState === 'active') {
            this.handleAppForeground();
        } else if ((this.appState === 'active' || this.appState === 'inactive') && nextAppState === 'background') {
            this.handleAppBackground();
        }

        this.appState = nextAppState;
    };

    /**
     * Handle app going to background
     */
    private async handleAppBackground(): Promise<void> {
        this.backgroundTime = Date.now();
        smartSyncManager.clearSyncQueue();
        this.debouncedDisconnect();
    }

    /**
     * Debounced disconnect to prevent race conditions and rapid state changes
     * 
     * Debouncing strategy:
     * 1. Cancels any pending disconnect timeout (prevents multiple disconnects)
     * 2. Cancels any pending reconnect timeout (prevents reconnect/disconnect race)
     * 3. Schedules disconnect after 1 second delay (allows state to stabilize)
     * 4. Uses isDisconnecting flag to prevent concurrent disconnect attempts
     * 
     * Race condition prevention:
     * - If app rapidly switches between background/foreground, only last state wins
     * - Clears reconnect timeout when disconnecting (prevents conflicting operations)
     * - Guards against multiple simultaneous disconnect calls
     * 
     * Delay rationale: 1 second gives time for app state to stabilize before disconnecting.
     * If user quickly returns to app, reconnect will cancel this disconnect.
     */
    private debouncedDisconnect(): void {
        // Cancel pending disconnect to prevent multiple disconnects
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
        }

        // Cancel pending reconnect to prevent reconnect/disconnect race condition
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.isReconnecting = false;
        }

        // Schedule disconnect after delay (allows state to stabilize)
        this.disconnectTimeout = setTimeout(async () => {
            // Guard: Prevent concurrent disconnect attempts
            if (this.isDisconnecting) {
                return;
            }

            this.isDisconnecting = true;
            try {
                const { chatWebSocketManager } = await import('./chatWebSocketManager');
                await chatWebSocketManager.disconnect();
            } catch (error) {
                console.error('[AppLifecycle] Failed to disconnect WebSocket on background:', error);
            } finally {
                this.isDisconnecting = false;
            }
        }, 1000); // 1 second delay for state stabilization
    }

    /**
     * Handle app coming to foreground
     */
    private async handleAppForeground(): Promise<void> {
        const backgroundDuration = Date.now() - this.backgroundTime;

        this.debouncedReconnect();

        // Trigger cleanup if app was in background for a long time
        if (backgroundDuration > this.BACKGROUND_CLEANUP_THRESHOLD) {
            setTimeout(() => {
                conversationCleanupManager.cleanupInactiveConversations().catch(error => {
                    console.error('[AppLifecycle] Cleanup after foreground failed:', error);
                });
            }, this.FOREGROUND_CLEANUP_DELAY);
        }
    }

    /**
     * Debounced reconnect to prevent race conditions and rapid reconnection attempts
     * 
     * Debouncing strategy:
     * 1. Cancels any pending disconnect timeout (prevents disconnect after reconnect scheduled)
     * 2. Cancels any pending reconnect timeout (prevents multiple reconnect attempts)
     * 3. Schedules reconnect after 500ms delay (faster than disconnect for better UX)
     * 4. Uses isReconnecting flag to prevent concurrent reconnect attempts
     * 
     * Race condition prevention:
     * - Cancels disconnect when reconnecting (user returned to app quickly)
     * - Guards against multiple simultaneous reconnect calls
     * - Faster delay (500ms vs 1000ms) prioritizes reconnection over disconnection
     * 
     * Delay rationale: 500ms is faster than disconnect delay, allowing reconnect to win
     * if user quickly switches between background/foreground.
     */
    private debouncedReconnect(): void {
        // Cancel pending disconnect (reconnect takes priority)
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.isDisconnecting = false;
        }

        // Cancel pending reconnect to prevent multiple reconnect attempts
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        // Schedule reconnect after shorter delay (faster than disconnect)
        this.reconnectTimeout = setTimeout(async () => {
            // Guard: Prevent concurrent reconnect attempts
            if (this.isReconnecting) {
                return;
            }

            this.isReconnecting = true;
            try {
                await this.reinitializeOnForeground();
            } catch (error) {
                console.error('[AppLifecycle] Reconnect failed:', error);
            } finally {
                this.isReconnecting = false;
            }
        }, 500); // 500ms delay (faster than disconnect for better UX)
    }

    /**
     * Reinitialize services when app comes to foreground with full sync and subscription management
     * 
     * Reinitialization flow (mirrors app startup sequence):
     * 1. Validates authentication (early exit if not authenticated)
     * 2. Ensures WebSocket connection (connects if disconnected)
     * 3. Syncs conversations from server (gets latest data)
     * 4. Manages WebSocket subscriptions (subscribes to new conversations only)
     * 5. Updates store with fresh conversation data
     * 6. Preloads messages for top 15 conversations (parallel loading)
     * 7. Triggers smart sync for all conversations (background sync)
     * 
     * Subscription management:
     * - Compares current conversations vs subscribed conversations
     * - Only subscribes to conversations not already subscribed
     * - Prevents duplicate subscriptions and unnecessary WebSocket messages
     * 
     * Parallel preloading:
     * - Loads messages for top 15 conversations simultaneously
     * - Individual failures don't block other conversations
     * - Creates message snapshots (25 messages) for instant display
     * 
     * Error handling: Non-blocking - errors in individual steps don't stop entire flow.
     * 
     * @throws Error (non-critical) - Errors are logged but don't prevent app from functioning
     */
    private async reinitializeOnForeground(): Promise<void> {
        try {
            // Step 1: Validate authentication
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                return; // Early exit if not authenticated
            }

            // Step 2: Ensure WebSocket connection
            const { chatWebSocketManager } = await import('./chatWebSocketManager');
            const isConnected = chatWebSocketManager.isConnected();

            if (!isConnected) {
                try {
                    await chatWebSocketManager.connect();
                } catch (connectError) {
                    console.error('[AppLifecycle] Failed to connect WebSocket:', connectError);
                }
            }

            // Step 3: Sync conversations from server (get latest data)
            const { chatSyncService } = await import('./chatSyncService');
            await chatSyncService.syncConversations();
            const conversations = await chatSyncService.getConversations();

            if (conversations.length > 0) {
                // Step 4: Manage WebSocket subscriptions (only subscribe to new conversations)
                const conversationIds = conversations.map(conversation => conversation.id);
                const subscribedIds = chatWebSocketManager.getSubscribedConversations();
                const subscribedSet = new Set(subscribedIds); // For O(1) lookup

                // Find conversations that need subscription (delta subscription)
                const conversationsToSubscribe = conversationIds.filter(id => !subscribedSet.has(id));

                if (conversationsToSubscribe.length > 0) {
                    await chatWebSocketManager.subscribeToAllConversations(conversationsToSubscribe);
                }

                // Step 5: Update store with fresh conversation data
                const { useChatStore } = await import('../store/chatStore');
                const chatStore = useChatStore.getState();
                chatStore.setConversations(conversations);

                // Step 6: Preload messages for top conversations (parallel loading)
                const topConversations = conversations.slice(0, 15);

                const preloadPromises = topConversations.map(async (conversation) => {
                    try {
                        await chatSyncService.syncMessages(conversation.id, 0, 50);
                        const recentMessages = await chatSyncService.getMessages(conversation.id, 50, 0);
                        if (recentMessages.length > 0) {
                            chatStore.setConversationMessages(conversation.id, recentMessages);
                            chatStore.setMessageSnapshot(conversation.id, recentMessages.slice(0, 25));
                        }
                    } catch (preloadError) {
                        // Individual failures don't block other conversations
                        console.error(`[AppLifecycle] Failed to preload messages for ${conversation.id}:`, preloadError);
                    }
                });

                await Promise.all(preloadPromises);

                // Step 7: Trigger smart sync for all conversations (background sync)
                const { smartSyncManager } = await import('./smartSyncManager');
                smartSyncManager.scheduleBatchSync(conversationIds, 'app_foreground');
            }

        } catch (error) {
            // Non-critical: Reinitialization failure doesn't prevent app from functioning
            console.error('[AppLifecycle] Reinitialization on foreground failed:', error);
        }
    }

    /**
     * Handle memory warning
     */
    handleMemoryWarning(): void {
        conversationCleanupManager.emergencyCleanup().catch(error => {
            console.error('[AppLifecycle] Emergency cleanup failed:', error);
        });
    }

    /**
     * Handle app termination
     */
    handleAppTermination(): void {
        this.cleanup();
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (!this.isInitialized) {
            return;
        }

        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.isDisconnecting = false;
        this.isReconnecting = false;

        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }

        this.isInitialized = false;
        this.appState = 'active';
        this.backgroundTime = 0;
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

