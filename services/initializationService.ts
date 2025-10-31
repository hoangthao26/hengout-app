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

    private async performInitialization(): Promise<void> {
        const appStore = useAppStore.getState();

        try {
            console.log('Starting services...');

            // Reset error state
            appStore.setInitializationError(null);

            // 1. Initialize Database (Critical - must be first)
            await this.initializeDatabase();
            appStore.setDatabaseReady(true);
            console.log('[InitializationService] Database ready');

            // 2. Initialize Location Services
            await this.initializeLocation();
            appStore.setLocationReady(true);
            console.log('[InitializationService] Location ready');

            // 3. Initialize Auth Services (BEFORE API calls) ← PROACTIVE
            await this.initializeAuthServices();
            appStore.setAuthReady(true);
            console.log('[InitializationService] Auth ready');

            // 4. Initialize Chat Sync Services (AFTER auth)
            await this.initializeChatServices();
            appStore.setServicesReady(true);
            console.log('[InitializationService] Services ready');

            // 4.5. Initialize Conversation Cleanup Manager
            conversationCleanupManager.initialize();
            // Cleanup manager ready

            // 4.6. Initialize App Lifecycle Manager
            appLifecycleManager.initialize();
            // App lifecycle manager ready

            // 5. Initialize WebSocket Connection (AFTER auth)
            await this.initializeWebSocket();
            console.log('[InitializationService] WebSocket ready');

            // 6. Preload Chat Data for Instant Display (AFTER WebSocket)
            await this.preloadChatData();
            console.log('[InitializationService] Chat data preloaded');

            // 7. Mark app as ready
            appStore.setAppReady(true);
            this.isInitialized = true;

            console.log('App initialization completed');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            console.error('[InitializationService] Initialization failed:', errorMessage);

            appStore.setInitializationError(errorMessage);
            throw error;
        }
    }

    /**
     * MVP-simple: lightweight user-dependent initialization on app start
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
            // Fire-and-forget; idempotent on server
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
            // Non-critical
            // initOnAppStart skipped/failed
        }
    }

    /**
     * MVP-simple: lightweight user-dependent initialization right after login
     */
    async initAfterLogin(): Promise<void> {
        if (this.hasInitAfterLogin) return;
        this.hasInitAfterLogin = true;
        try {
            // Initialize location services ONLY if user already has profile/onboarding complete
            try {
                const { OnboardingService } = await import('./onboardingService');
                const isOnboardingComplete = await OnboardingService.isOnboardingComplete();
                const { useProfileStore } = await import('../store/profileStore');
                const existingProfile = useProfileStore.getState().profile;
                if (isOnboardingComplete && existingProfile) {
            const { locationService } = await import('./locationService');
            locationService.initCurrentVibes().catch(() => { });
                } else {
                    console.log('[Initialization] Skip initCurrentVibes until onboarding/profile complete');
                }
            } catch { }

            // Reinitialize WebSocket after login
            await this.reinitializeWebSocket();
            // WebSocket reinitialized after login

            // Prefetch subscription immediately after login
            try {
                const { useSubscriptionStore } = await import('../store/subscriptionStore');
                console.log('[Initialization] Prefetch active subscription (after login)...');
                await useSubscriptionStore.getState().fetchActiveSubscription();
                console.log('[Initialization] Prefetch after login done');
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
                // Initializing database
                await databaseService.initialize();
                return;
            } catch (error) {
                console.error(`[InitializationService] Database initialization attempt ${attempt} failed:`, error);

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
            // Initializing location services

            // Check if location services are enabled
            const isLocationEnabled = await Location.hasServicesEnabledAsync();

            if (!isLocationEnabled) {
                // Location services disabled
                return;
            }

            // Request permissions
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                // Location permission denied
                return;
            }

            // Location services ready

        } catch (error) {
            console.error('[InitializationService] Location initialization failed:', error);
            // Don't throw - location is not critical for app startup
        }
    }

    /**
     * Initialize auth services - PROACTIVE approach
     */
    private async initializeAuthServices(): Promise<void> {
        try {
            // Initializing auth services

            // Check if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                // User not authenticated, skipping auth services
                return;
            }

            // Check token expiry and refresh if needed
            const tokens = await AuthHelper.getTokens();
            if (tokens && tokens.expiresIn < 5 * 60 * 1000) { // 5 minutes - consistent with RefreshTokenManager
                // Token expiring soon, refreshing
                try {
                    // Use RefreshTokenManager for consistent refresh logic
                    const { refreshTokenManager } = await import('./refreshTokenManager');
                    await refreshTokenManager.performRefresh();
                    // Token refreshed successfully
                } catch (error) {
                    // Token refresh failed, will retry later
                    // Don't throw - auth services can be initialized later
                }
            }

            // Auth services ready

        } catch (error) {
            console.error('[InitializationService] Auth services initialization failed:', error);
            // Don't throw - auth services can be initialized later
        }
    }

    /**
     * Initialize chat sync services
     */
    private async initializeChatServices(): Promise<void> {
        try {
            // Initializing chat services
            await chatSyncService.initialize();
            // Chat services ready
        } catch (error) {
            console.error('[InitializationService] Chat services initialization failed:', error);
            // Don't throw - chat services can be initialized later
        }
    }

    /**
     * Initialize WebSocket connection and subscribe to all conversations
     */
    private async initializeWebSocket(): Promise<void> {
        try {
            // Initializing WebSocket connection

            // Check if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                // User not authenticated, skipping WebSocket
                return;
            }

            // Import WebSocket manager
            const { chatWebSocketManager } = await import('./chatWebSocketManager');

            // Connect WebSocket
            await chatWebSocketManager.connect();
            // WebSocket connected

            // Ensure conversations are available for a fresh session
            const { chatSyncService } = await import('./chatSyncService');
            try {
                // Sync from server first so a new login has data to subscribe
                await chatSyncService.syncConversations();
            } catch { }
            const conversations = await chatSyncService.getConversations();

            if (conversations.length > 0) {
                // Subscribing to conversations

                // Subscribe to all conversations using the new method
                const conversationIds = conversations.map(conversation => conversation.id);
                await chatWebSocketManager.subscribeToAllConversations(conversationIds);

                // Subscribed to all conversations

                // SMART SYNC: Trigger initial smart sync for all conversations
                smartSyncManager.scheduleBatchSync(conversationIds, 'app_startup');
                // Smart sync scheduled
            } else {
                // No conversations to subscribe to
            }

        } catch (error) {
            console.error('[InitializationService] WebSocket initialization failed:', error);
            // Don't throw - WebSocket can be initialized later
        }
    }

    /**
     * Preload chat data for instant display
     */
    private async preloadChatData(): Promise<void> {
        const appStore = useAppStore.getState(); // Move appStore ra ngoài để access trong catch block

        try {
            // Preloading chat data for instant display

            // CHECK AUTH FIRST: Only sync if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                // User not authenticated, skipping chat data preload
                appStore.setChatDataPreloaded(true);
                return;
            }

            const chatStore = useChatStore.getState();

            // SYNC DATA TỪ SERVER TRƯỚC KHI PRELOAD
            // Syncing conversations from server
            await chatSyncService.syncConversations();

            // Get conversations from database (after sync)
            const conversations = await chatSyncService.getConversations();
            // Found conversations after sync

            if (conversations.length > 0) {
                chatStore.setConversations(conversations);
                // Loaded conversations into store

                // PRELOADING - Giống Messenger/Instagram
                const topConversations = conversations.slice(0, 15); // Top 15 conversations (tăng từ 5)
                // Preloading messages for conversations

                //  PARALLEL PRELOADING - Tất cả conversations load cùng lúc
                const preloadPromises = topConversations.map(async (conversation) => {
                    try {
                        //SYNC MESSAGES TỪ SERVER TRƯỚC KHI PRELOAD
                        // Reduce noise: skip per-conversation sync logs in MVP
                        await chatSyncService.syncMessages(conversation.id, 0, 50);

                        //  Preload 50 messages thay vì 20 (giống Messenger)
                        const recentMessages = await chatSyncService.getMessages(conversation.id, 50, 0);
                        if (recentMessages.length > 0) {
                            // Store in conversation messages (50 messages)
                            chatStore.setConversationMessages(conversation.id, recentMessages);
                            // Create snapshot 25 messages thay vì 10 (giống Instagram)
                            chatStore.setMessageSnapshot(conversation.id, recentMessages.slice(0, 25));
                            // Skip per-conversation preload logs; keep summary only

                            // DEBUG: Verify data is stored in store
                            // Skip store debug details
                        } else {
                            // Skip empty logs to reduce noise
                        }
                    } catch (preloadError) {
                        console.error(`[InitializationService] Failed to preload messages for ${conversation.id}:`, preloadError);
                        // Continue with other conversations
                    }
                });

                // ĐỢI TẤT CẢ PRELOADING HOÀN THÀNH
                await Promise.all(preloadPromises);

                // Chat data preloading completed

                // CLEANUP: Trigger cleanup after data preload
                conversationCleanupManager.cleanupInactiveConversations().catch(error => {
                    console.error('[InitializationService] Cleanup after preload failed:', error);
                });

                // Set chat data preloaded status
                appStore.setChatDataPreloaded(true);
            } else {
                // No conversations to preload
                // Set preloaded even if no conversations
                appStore.setChatDataPreloaded(true);
            }
        } catch (error) {
            console.error('[InitializationService] Chat data preloading failed:', error);
            // Set preloaded even if failed to prevent app from hanging
            appStore.setChatDataPreloaded(true);
            // Don't throw - this is not critical for app startup
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
            // Reinitializing WebSocket after auth
            await this.initializeWebSocket();
            // WebSocket reinitialized successfully
        } catch (error) {
            console.error('[InitializationService] WebSocket reinitialization failed:', error);
            // Don't throw - this is not critical
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
        appStore.setChatDataPreloaded(false); // Reset chat data preloaded
        appStore.setAppReady(false);
        appStore.setInitializationError(null);

        // Initialization state reset
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
