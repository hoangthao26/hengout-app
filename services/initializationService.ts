import { databaseService } from './databaseService';
import { chatSyncService } from './chatSyncService';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import * as Location from 'expo-location';

/**
 * Enterprise Initialization Service
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
            console.log('🚀 [InitializationService] Starting app initialization...');

            // Reset error state
            appStore.setInitializationError(null);

            // 1. Initialize Database (Critical - must be first)
            await this.initializeDatabase();
            appStore.setDatabaseReady(true);
            console.log('✅ [InitializationService] Database ready');

            // 2. Initialize Location Services
            await this.initializeLocation();
            appStore.setLocationReady(true);
            console.log('✅ [InitializationService] Location ready');

            // 3. Initialize Auth Services (BEFORE API calls) ← PROACTIVE
            await this.initializeAuthServices();
            appStore.setAuthReady(true);
            console.log('✅ [InitializationService] Auth ready');

            // 4. Initialize Chat Sync Services (AFTER auth)
            await this.initializeChatServices();
            appStore.setServicesReady(true);
            console.log('✅ [InitializationService] Services ready');

            // 5. Preload Chat Data for Instant Display (AFTER auth)
            await this.preloadChatData();
            console.log('✅ [InitializationService] Chat data preloaded');

            // 6. Mark app as ready
            appStore.setAppReady(true);
            this.isInitialized = true;

            console.log('🎉 [InitializationService] App initialization completed successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            console.error('❌ [InitializationService] Initialization failed:', errorMessage);

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
        } catch (err) {
            // Non-critical
            console.log('ℹ️ [InitializationService] initOnAppStart skipped/failed', err);
        }
    }

    /**
     * MVP-simple: lightweight user-dependent initialization right after login
     */
    async initAfterLogin(): Promise<void> {
        if (this.hasInitAfterLogin) return;
        this.hasInitAfterLogin = true;
        try {
            const { locationService } = await import('./locationService');
            locationService.initCurrentVibes().catch(() => { });
        } catch (err) {
            console.log('ℹ️ [InitializationService] initAfterLogin skipped/failed', err);
        }
    }

    /**
     * Initialize database with retry mechanism
     */
    private async initializeDatabase(): Promise<void> {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                console.log(`🗄️ [InitializationService] Initializing database (attempt ${attempt}/${this.MAX_RETRIES})`);
                await databaseService.initialize();
                return;
            } catch (error) {
                console.error(`❌ [InitializationService] Database initialization attempt ${attempt} failed:`, error);

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
            console.log('📍 [InitializationService] Initializing location services...');

            // Check if location services are enabled
            const isLocationEnabled = await Location.hasServicesEnabledAsync();

            if (!isLocationEnabled) {
                console.log('📍 [InitializationService] Location services disabled, using fallback');
                return;
            }

            // Request permissions
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log('📍 [InitializationService] Location permission denied, using fallback');
                return;
            }

            console.log('✅ [InitializationService] Location services ready');

        } catch (error) {
            console.error('❌ [InitializationService] Location initialization failed:', error);
            // Don't throw - location is not critical for app startup
        }
    }

    /**
     * Initialize auth services - PROACTIVE approach
     */
    private async initializeAuthServices(): Promise<void> {
        try {
            console.log('🔐 [InitializationService] Initializing auth services...');

            // Check if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                console.log('ℹ️ [InitializationService] User not authenticated, skipping auth services');
                return;
            }

            // Check token expiry and refresh if needed
            const tokens = await AuthHelper.getTokens();
            if (tokens && tokens.expiresIn < 5 * 60 * 1000) { // 5 minutes - consistent with RefreshTokenManager
                console.log('⏰ [InitializationService] Token expiring soon, refreshing proactively');
                try {
                    // Use RefreshTokenManager for consistent refresh logic
                    const { refreshTokenManager } = await import('./refreshTokenManager');
                    await refreshTokenManager.performRefresh();
                    console.log('✅ [InitializationService] Token refreshed successfully');
                } catch (error) {
                    console.log('⚠️ [InitializationService] Token refresh failed, will retry later');
                    // Don't throw - auth services can be initialized later
                }
            }

            console.log('✅ [InitializationService] Auth services ready');

        } catch (error) {
            console.error('❌ [InitializationService] Auth services initialization failed:', error);
            // Don't throw - auth services can be initialized later
        }
    }

    /**
     * Initialize chat sync services
     */
    private async initializeChatServices(): Promise<void> {
        try {
            console.log('💬 [InitializationService] Initializing chat services...');
            await chatSyncService.initialize();
            console.log('✅ [InitializationService] Chat services ready');
        } catch (error) {
            console.error('❌ [InitializationService] Chat services initialization failed:', error);
            // Don't throw - chat services can be initialized later
        }
    }

    /**
     * Preload chat data for instant display
     */
    private async preloadChatData(): Promise<void> {
        const appStore = useAppStore.getState(); // ✅ Move appStore ra ngoài để access trong catch block

        try {
            if (__DEV__) console.log('🚀 [InitializationService] Preloading chat data for instant display...');

            // 🚀 CHECK AUTH FIRST: Only sync if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                if (__DEV__) console.log('ℹ️ [InitializationService] User not authenticated, skipping chat data preload');
                appStore.setChatDataPreloaded(true);
                return;
            }

            const chatStore = useChatStore.getState();

            // ✅ SYNC DATA TỪ SERVER TRƯỚC KHI PRELOAD
            if (__DEV__) console.log('🔄 [InitializationService] Syncing conversations from server...');
            await chatSyncService.syncConversations();

            // Get conversations from database (after sync)
            const conversations = await chatSyncService.getConversations();
            if (__DEV__) console.log(`🔍 [InitializationService] Found ${conversations.length} conversations after sync`);

            if (conversations.length > 0) {
                chatStore.setConversations(conversations);
                if (__DEV__) console.log(`📊 [InitializationService] Loaded ${conversations.length} conversations into store`);

                // ✅ ENTERPRISE PRELOADING - Giống Messenger/Instagram
                const topConversations = conversations.slice(0, 15); // Top 15 conversations (tăng từ 5)
                if (__DEV__) console.log(`⚡ [InitializationService] Preloading messages for ${topConversations.length} conversations...`);

                // ✅ PARALLEL PRELOADING - Tất cả conversations load cùng lúc
                const preloadPromises = topConversations.map(async (conversation) => {
                    try {
                        // ✅ SYNC MESSAGES TỪ SERVER TRƯỚC KHI PRELOAD
                        // Reduce noise: skip per-conversation sync logs in MVP
                        await chatSyncService.syncMessages(conversation.id, 0, 50);

                        // ✅ Preload 50 messages thay vì 20 (giống Messenger)
                        const recentMessages = await chatSyncService.getMessages(conversation.id, 50, 0);
                        if (recentMessages.length > 0) {
                            // Store in conversation messages (50 messages)
                            chatStore.setConversationMessages(conversation.id, recentMessages);
                            // ✅ Create snapshot 25 messages thay vì 10 (giống Instagram)
                            chatStore.setMessageSnapshot(conversation.id, recentMessages.slice(0, 25));
                            // Skip per-conversation preload logs; keep summary only

                            // ✅ DEBUG: Verify data is stored in store
                            // Skip store debug details
                        } else {
                            // Skip empty logs to reduce noise
                        }
                    } catch (preloadError) {
                        console.error(`❌ [InitializationService] Failed to preload messages for ${conversation.id}:`, preloadError);
                        // Continue with other conversations
                    }
                });

                // ✅ ĐỢI TẤT CẢ PRELOADING HOÀN THÀNH
                await Promise.all(preloadPromises);

                if (__DEV__) console.log('✅ [InitializationService] Chat data preloading completed');

                // ✅ Set chat data preloaded status
                appStore.setChatDataPreloaded(true);
            } else {
                console.log('ℹ️ [InitializationService] No conversations to preload');
                // ✅ Set preloaded even if no conversations
                appStore.setChatDataPreloaded(true);
            }
        } catch (error) {
            console.error('❌ [InitializationService] Chat data preloading failed:', error);
            // ✅ Set preloaded even if failed to prevent app from hanging
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
     * Reset initialization state (for testing/debugging)
     */
    reset(): void {
        this.isInitialized = false;
        this.initializationPromise = null;

        const appStore = useAppStore.getState();
        appStore.setDatabaseReady(false);
        appStore.setLocationReady(false);
        appStore.setServicesReady(false);
        appStore.setChatDataPreloaded(false); // ✅ Reset chat data preloaded
        appStore.setAppReady(false);
        appStore.setInitializationError(null);

        console.log('🔄 [InitializationService] Initialization state reset');
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
