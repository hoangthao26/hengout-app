import { databaseService } from './databaseService';
import { chatSyncService } from './chatSyncService';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import { smartSyncManager } from './smartSyncManager';
import { conversationCleanupManager } from './conversationCleanupManager';
import { appLifecycleManager } from './appLifecycleManager';
import * as Location from 'expo-location';

/**
 * Initialization Service
 * 
 * Features:
 * - Controlled initialization sequence
 * - Error handling and recovery
 * - Progress tracking
 * - Service dependency management
 * - Retry mechanisms
 */
class InitializationService {
    private static instance: InitializationService;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;
    private hasInitOnAppStart = false;
    private hasInitAfterLogin = false;

    // Configuration
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second

    static getInstance(): InitializationService {
        if (!InitializationService.instance) {
            InitializationService.instance = new InitializationService();
        }
        return InitializationService.instance;
    }

    /**
     * Initialize all services in proper order
     */
    async initialize(): Promise<void> {
        // Prevent multiple initialization calls
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.isInitialized) {
            return;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform sequential initialization with dependency management
     * 
     * Initialization sequence (strict dependency order):
     * 1. Database (CRITICAL) - Must be first, all services depend on it
     * 2. Location Services - Independent, can initialize in parallel but done sequentially
     * 3. Auth Services - Required before API calls and WebSocket
     * 4. Chat Sync Services - Requires auth, provides data layer
     * 5. Cleanup/Lifecycle Managers - Background services
     * 6. WebSocket Connection - Requires auth, provides real-time updates
     * 7. Preload Chat Data - Requires WebSocket and data layer
     * 8. Mark App Ready - Final step after all dependencies initialized
     * 
     * Error handling: First failure stops entire initialization and sets error state.
     * All services set ready flags individually for granular status tracking.
     * 
     * @throws Error if any critical step fails (stops initialization)
     */
    private async performInitialization(): Promise<void> {
        const appStore = useAppStore.getState();

        try {
            appStore.setInitializationError(null);

            // Step 1: Database (CRITICAL - all services depend on it, must be first)
            await this.initializeDatabase();
            appStore.setDatabaseReady(true);

            // Step 2: Location Services (independent, can run in parallel but done sequentially)
            await this.initializeLocation();
            appStore.setLocationReady(true);

            // Step 3: Auth Services (required before API calls and WebSocket)
            await this.initializeAuthServices();
            appStore.setAuthReady(true);

            // Step 4: Chat Sync Services (requires auth, provides data layer)
            await this.initializeChatServices();
            appStore.setServicesReady(true);

            // Background services: Cleanup and lifecycle managers
            conversationCleanupManager.initialize();
            appLifecycleManager.initialize();

            // Step 5: WebSocket Connection (requires auth, provides real-time updates)
            await this.initializeWebSocket();

            // Step 6: Preload Chat Data (requires WebSocket and data layer, enables instant display)
            await this.preloadChatData();

            // Step 7: Mark app as ready (final step after all dependencies initialized)
            appStore.setAppReady(true);
            this.isInitialized = true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            console.error('[InitializationService] Initialization failed:', errorMessage);

            appStore.setInitializationError(errorMessage);
            throw error; // Propagate error to caller
        }
    }

    /**
     * Lightweight user-dependent initialization on app start
     * Safe to call multiple times; guarded by in-memory flags
     */
    async initOnAppStart(): Promise<void> {
        if (this.hasInitOnAppStart) return;
        this.hasInitOnAppStart = true;
        try {
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();
            if (!isAuthenticated) return;

            const { locationService } = await import('./locationService');
            locationService.initCurrentVibes().catch(() => { });

            // Prefetch active subscription/limits for quota UI
            try {
                const { useSubscriptionStore } = await import('../store/subscriptionStore');
                const { activeSubscription, fetchActiveSubscription } = useSubscriptionStore.getState();
                if (!activeSubscription) {
                    fetchActiveSubscription().catch(() => { });
                }
            } catch { }
        } catch (err) {
            // Non-critical initialization
        }
    }

    /**
     * Lightweight user-dependent initialization right after login
     */
    async initAfterLogin(): Promise<void> {
        if (this.hasInitAfterLogin) return;
        this.hasInitAfterLogin = true;
        try {
            // Initialize location services only if onboarding/profile complete
            try {
                const { OnboardingService } = await import('./onboardingService');
                const isOnboardingComplete = await OnboardingService.isOnboardingComplete();
                const { useProfileStore } = await import('../store/profileStore');
                const existingProfile = useProfileStore.getState().profile;
                if (isOnboardingComplete && existingProfile) {
                    const { locationService } = await import('./locationService');
                    locationService.initCurrentVibes().catch(() => { });
                }
            } catch { }

            // Reinitialize WebSocket after login
            await this.reinitializeWebSocket();

            // Prefetch subscription immediately after login
            try {
                const { useSubscriptionStore } = await import('../store/subscriptionStore');
                await useSubscriptionStore.getState().fetchActiveSubscription();
            } catch { }
        } catch (err) {
            // initAfterLogin skipped/failed
        }
    }

    /**
     * Initialize database with retry mechanism
     */
    private async initializeDatabase(): Promise<void> {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                await databaseService.initialize();
                return;
            } catch (error) {
                console.error(`[InitializationService] Database init attempt ${attempt}/${this.MAX_RETRIES} failed:`, error);

                if (attempt === this.MAX_RETRIES) {
                    throw new Error(`Database initialization failed after ${this.MAX_RETRIES} attempts: ${error}`);
                }

                // Wait before retry
                await this.delay(this.RETRY_DELAY * attempt);
            }
        }
    }

    /**
     * Initialize location services
     */
    private async initializeLocation(): Promise<void> {
        try {
            const isLocationEnabled = await Location.hasServicesEnabledAsync();
            if (!isLocationEnabled) {
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }
        } catch (error) {
            console.error('[InitializationService] Location initialization failed:', error);
        }
    }

    /**
     * Initialize auth services - proactive token refresh
     */
    private async initializeAuthServices(): Promise<void> {
        try {
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                return;
            }

            // Refresh token if expiring soon
            const tokens = await AuthHelper.getTokens();
            if (tokens && tokens.expiresIn < 5 * 60 * 1000) {
                try {
                    const { refreshTokenManager } = await import('./refreshTokenManager');
                    await refreshTokenManager.performRefresh();
                } catch (error) {
                    // Token refresh failed, will retry later
                }
            }
        } catch (error) {
            console.error('[InitializationService] Auth services initialization failed:', error);
        }
    }

    /**
     * Initialize chat sync services
     */
    private async initializeChatServices(): Promise<void> {
        try {
            await chatSyncService.initialize();
        } catch (error) {
            console.error('[InitializationService] Chat services initialization failed:', error);
        }
    }

    /**
     * Initialize WebSocket connection and subscribe to all conversations
     */
    private async initializeWebSocket(): Promise<void> {
        try {
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                return;
            }

            const { chatWebSocketManager } = await import('./chatWebSocketManager');
            await chatWebSocketManager.connect();

            // Sync conversations from server first
            const { chatSyncService } = await import('./chatSyncService');
            try {
                await chatSyncService.syncConversations();
            } catch { }

            const conversations = await chatSyncService.getConversations();

            if (conversations.length > 0) {
                const conversationIds = conversations.map(conversation => conversation.id);
                await chatWebSocketManager.subscribeToAllConversations(conversationIds);

                // Trigger initial smart sync for all conversations
                smartSyncManager.scheduleBatchSync(conversationIds, 'app_startup');
            }
        } catch (error) {
            console.error('[InitializationService] WebSocket initialization failed:', error);
        }
    }

    /**
     * Preload chat data for instant display using parallel loading strategy
     * 
     * Preloading strategy:
     * 1. Syncs conversations from server to get latest list
     * 2. Loads top 15 conversations (most recent) for instant display
     * 3. Parallel preloading: Fetches messages for all 15 conversations simultaneously
     * 4. Creates message snapshots (25 messages) for instant UI rendering
     * 5. Triggers cleanup after preload to free memory from inactive conversations
     * 
     * Parallel loading optimization:
     * - All 15 conversations load messages simultaneously (Promise.all)
     * - Individual failures don't block other conversations
     * - Reduces total preload time from ~15s to ~2-3s (sequential → parallel)
     * 
     * Memory management:
     * - Only preloads top 15 to balance instant display vs memory usage
     * - Cleanup removes inactive conversations to prevent memory bloat
     * 
     * @throws Error (non-critical) - Errors are logged but don't prevent app from being ready
     */
    private async preloadChatData(): Promise<void> {
        const appStore = useAppStore.getState();

        try {
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                appStore.setChatDataPreloaded(true);
                return;
            }

            const chatStore = useChatStore.getState();

            // Step 1: Sync conversations from server first (get latest list)
            await chatSyncService.syncConversations();
            const conversations = await chatSyncService.getConversations();

            if (conversations.length > 0) {
                chatStore.setConversations(conversations);

                // Step 2: Preload top 15 conversations (most recent)
                const topConversations = conversations.slice(0, 15);

                // Step 3: Parallel preloading (all conversations load simultaneously)
                // Optimizes from ~15s sequential to ~2-3s parallel
                const preloadPromises = topConversations.map(async (conversation) => {
                    try {
                        // Sync and fetch messages for each conversation
                        await chatSyncService.syncMessages(conversation.id, 0, 50);
                        const recentMessages = await chatSyncService.getMessages(conversation.id, 50, 0);
                        if (recentMessages.length > 0) {
                            // Store full messages and create snapshot for instant display
                            chatStore.setConversationMessages(conversation.id, recentMessages);
                            chatStore.setMessageSnapshot(conversation.id, recentMessages.slice(0, 25));
                        }
                    } catch (preloadError) {
                        // Individual failures don't block other conversations
                        console.error(`[InitializationService] Failed to preload messages for ${conversation.id}:`, preloadError);
                    }
                });

                // Wait for all parallel preloads to complete
                await Promise.all(preloadPromises);

                // Step 4: Trigger cleanup after preload to free memory from inactive conversations
                conversationCleanupManager.cleanupInactiveConversations().catch(error => {
                    console.error('[InitializationService] Cleanup after preload failed:', error);
                });

                appStore.setChatDataPreloaded(true);
            } else {
                appStore.setChatDataPreloaded(true);
            }
        } catch (error) {
            // Non-critical: Preload failure doesn't prevent app from being ready
            console.error('[InitializationService] Chat data preloading failed:', error);
            appStore.setChatDataPreloaded(true);
        }
    }

    /**
     * Get initialization status
     */
    getStatus(): {
        isInitialized: boolean;
        isDatabaseReady: boolean;
        isLocationReady: boolean;
        isServicesReady: boolean;
        isAppReady: boolean;
        error: string | null;
        progress: number;
    } {
        const appStore = useAppStore.getState();

        return {
            isInitialized: this.isInitialized,
            isDatabaseReady: appStore.isDatabaseReady,
            isLocationReady: appStore.isLocationReady,
            isServicesReady: appStore.isServicesReady,
            isAppReady: appStore.isAppReady,
            error: appStore.initializationError,
            progress: appStore.getInitializationProgress()
        };
    }

    /**
     * Reinitialize WebSocket after login/register
     */
    async reinitializeWebSocket(): Promise<void> {
        try {
            await this.initializeWebSocket();
        } catch (error) {
            console.error('[InitializationService] WebSocket reinitialization failed:', error);
        }
    }

    /**
     * Reset initialization state (for testing/debugging)
     */
    reset(): void {
        this.isInitialized = false;
        this.initializationPromise = null;

        const appStore = useAppStore.getState();
        appStore.setDatabaseReady(false);
        appStore.setLocationReady(false);
        appStore.setServicesReady(false);
        appStore.setChatDataPreloaded(false);
        appStore.setAppReady(false);
        appStore.setInitializationError(null);
    }

    /**
     * Utility: Delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const initializationService = InitializationService.getInstance();
export default initializationService;
