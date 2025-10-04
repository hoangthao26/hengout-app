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

            // 3. Initialize Chat Sync Services
            await this.initializeChatServices();
            appStore.setServicesReady(true);
            console.log('✅ [InitializationService] Services ready');

            // 4. Preload Chat Data for Instant Display
            await this.preloadChatData();
            console.log('✅ [InitializationService] Chat data preloaded');

            // 5. Mark app as ready
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
            console.log('🚀 [InitializationService] Preloading chat data for instant display...');

            // 🚀 CHECK AUTH FIRST: Only sync if user is authenticated
            const { AuthHelper } = await import('./authHelper');
            const isAuthenticated = await AuthHelper.isAuthenticated();

            if (!isAuthenticated) {
                console.log('ℹ️ [InitializationService] User not authenticated, skipping chat data preload');
                appStore.setChatDataPreloaded(true);
                return;
            }

            const chatStore = useChatStore.getState();

            // ✅ SYNC DATA TỪ SERVER TRƯỚC KHI PRELOAD
            console.log('🔄 [InitializationService] Syncing conversations from server...');
            await chatSyncService.syncConversations();

            // Get conversations from database (after sync)
            const conversations = await chatSyncService.getConversations();
            console.log(`🔍 [InitializationService] DEBUG - Found ${conversations.length} conversations in database after sync`);

            if (conversations.length > 0) {
                chatStore.setConversations(conversations);
                console.log(`📊 [InitializationService] Loaded ${conversations.length} conversations into store`);

                // ✅ ENTERPRISE PRELOADING - Giống Messenger/Instagram
                const topConversations = conversations.slice(0, 15); // Top 15 conversations (tăng từ 5)
                console.log(`⚡ [InitializationService] Preloading messages for ${topConversations.length} top conversations...`);

                // ✅ PARALLEL PRELOADING - Tất cả conversations load cùng lúc
                const preloadPromises = topConversations.map(async (conversation) => {
                    try {
                        // ✅ SYNC MESSAGES TỪ SERVER TRƯỚC KHI PRELOAD
                        console.log(`🔄 [InitializationService] Syncing messages for: ${conversation.name}`);
                        await chatSyncService.syncMessages(conversation.id, 0, 50);

                        // ✅ Preload 50 messages thay vì 20 (giống Messenger)
                        const recentMessages = await chatSyncService.getMessages(conversation.id, 50, 0);
                        if (recentMessages.length > 0) {
                            // Store in conversation messages (50 messages)
                            chatStore.setConversationMessages(conversation.id, recentMessages);
                            // ✅ Create snapshot 25 messages thay vì 10 (giống Instagram)
                            chatStore.setMessageSnapshot(conversation.id, recentMessages.slice(0, 25));
                            console.log(`⚡ [InitializationService] Preloaded ${recentMessages.length} messages for: ${conversation.name}`);

                            // ✅ DEBUG: Verify data is stored in store
                            const storeState = useChatStore.getState();
                            const storedMessages = storeState.conversationMessages[conversation.id] || [];
                            const storedSnapshot = storeState.messageSnapshots[conversation.id] || [];
                            console.log(`🔍 [InitializationService] DEBUG - Stored in store: ${storedMessages.length} messages, ${storedSnapshot.length} snapshot`);
                        } else {
                            console.log(`⚠️ [InitializationService] No messages found for: ${conversation.name}`);
                        }
                    } catch (preloadError) {
                        console.error(`❌ [InitializationService] Failed to preload messages for ${conversation.id}:`, preloadError);
                        // Continue with other conversations
                    }
                });

                // ✅ ĐỢI TẤT CẢ PRELOADING HOÀN THÀNH
                await Promise.all(preloadPromises);

                console.log('✅ [InitializationService] Chat data preloading completed');

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
