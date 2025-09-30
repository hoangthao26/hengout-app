import { databaseService } from './databaseService';
import { chatSyncService } from './chatSyncService';
import { useAppStore } from '../store/appStore';
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
            
            // 4. Mark app as ready
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
