import { AppState, AppStateStatus } from 'react-native';
import { conversationCleanupManager } from './conversationCleanupManager';
import { smartSyncManager } from './smartSyncManager';

// 📱 APP LIFECYCLE MANAGER - Handle app state changes and cleanup
class AppLifecycleManager {
    private appState: AppStateStatus = 'active';
    private backgroundTime: number = 0;
    private isInitialized = false;

    // Configuration
    private readonly BACKGROUND_CLEANUP_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    private readonly FOREGROUND_CLEANUP_DELAY = 5 * 1000; // 5 seconds

    /**
     * Initialize app lifecycle manager
     */
    initialize(): void {
        if (this.isInitialized) {
            console.log('⚠️ [AppLifecycle] Already initialized');
            return;
        }

        console.log('📱 [AppLifecycle] Initializing app lifecycle manager');

        // Listen to app state changes
        AppState.addEventListener('change', this.handleAppStateChange);

        this.isInitialized = true;
        console.log('✅ [AppLifecycle] App lifecycle manager initialized');
    }

    /**
     * Handle app state changes
     */
    private handleAppStateChange = (nextAppState: AppStateStatus): void => {
        console.log(`📱 [AppLifecycle] App state changed: ${this.appState} → ${nextAppState}`);

        if (this.appState === 'background' && nextAppState === 'active') {
            // App came to foreground
            this.handleAppForeground();
        } else if (this.appState === 'active' && nextAppState === 'background') {
            // App went to background
            this.handleAppBackground();
        }

        this.appState = nextAppState;
    };

    /**
     * Handle app going to background
     */
    private handleAppBackground(): void {
        console.log('📱 [AppLifecycle] App went to background');
        this.backgroundTime = Date.now();

        // Clear smart sync queue to avoid unnecessary syncs
        smartSyncManager.clearSyncQueue();
        console.log('🧹 [AppLifecycle] Cleared smart sync queue');
    }

    /**
     * Handle app coming to foreground
     */
    private handleAppForeground(): void {
        console.log('📱 [AppLifecycle] App came to foreground');

        const backgroundDuration = Date.now() - this.backgroundTime;
        console.log(`📱 [AppLifecycle] Background duration: ${Math.round(backgroundDuration / 1000)}s`);

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
        console.log('📱 [AppLifecycle] App terminating');

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

        // Remove app state listener
        AppState.addEventListener('change', this.handleAppStateChange);

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

