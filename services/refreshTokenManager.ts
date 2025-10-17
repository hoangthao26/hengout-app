/**
 * Refresh Token Manager - Simplified MVP Version
 * Handles proactive token refresh and app resume
 */

import { AppState, AppStateStatus } from 'react-native';
import { AuthHelper, AuthTokens } from './authHelper';
import { sessionService } from './sessionService';

export class RefreshTokenManager {
    private static instance: RefreshTokenManager;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private isRefreshing = false;
    private appStateSubscription: any = null;

    private static readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    private static readonly MAX_RETRY_ATTEMPTS = 2; // Reduced from 3 to 2

    private constructor() {
        this.setupAppStateListener();
    }

    static getInstance(): RefreshTokenManager {
        if (!RefreshTokenManager.instance) {
            RefreshTokenManager.instance = new RefreshTokenManager();
        }
        return RefreshTokenManager.instance;
    }

    /**
     * Setup app state listener for resume refresh
     */
    private setupAppStateListener(): void {
        this.appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('📱 [RefreshTokenManager] App resumed - checking token refresh');
                await this.checkAndRefreshOnResume();
            }
        });
    }

    /**
     * Start token monitoring
     */
    async startMonitoring(): Promise<void> {
        // Prevent multiple monitoring starts
        if (this.refreshTimer !== null) {
            console.log('⏳ [RefreshTokenManager] Monitoring already active, skipping start...');
            return;
        }

        try {
            console.log('🚀 [RefreshTokenManager] Starting token monitoring...');

            // Check if user is authenticated
            const isAuthenticated = await AuthHelper.isAuthenticated();
            if (!isAuthenticated) {
                console.log('⚠️ [RefreshTokenManager] User not authenticated, skipping monitoring');
                return;
            }

            // Get current tokens
            const tokens = await AuthHelper.getTokens();
            if (!tokens) {
                console.log('⚠️ [RefreshTokenManager] No tokens found, skipping monitoring');
                return;
            }

            // Calculate time until refresh is needed
            const timeUntilRefresh = this.calculateTimeUntilRefresh(tokens);

            if (timeUntilRefresh <= 0) {
                // Token needs immediate refresh
                console.log('🚨 [RefreshTokenManager] Token needs immediate refresh');
                await this.performRefresh();
            } else {
                // Schedule proactive refresh
                console.log(`⏰ [RefreshTokenManager] Scheduling proactive refresh in ${Math.round(timeUntilRefresh / 1000)} seconds`);
                this.scheduleProactiveRefresh(timeUntilRefresh);
            }
        } catch (error: any) {
            console.error('❌ [RefreshTokenManager] Failed to start monitoring:', error);
        }
    }

    /**
     * Stop token monitoring
     */
    stopMonitoring(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
            console.log('🛑 [RefreshTokenManager] Token monitoring stopped');
        }


        this.isRefreshing = false;
    }

    /**
     * Calculate time until token should be refreshed
     */
    private calculateTimeUntilRefresh(tokens: AuthTokens): number {
        const currentTime = Date.now();
        const timeUntilExpiry = tokens.expiresAt - currentTime;

        // If token expires in less than REFRESH_BEFORE_EXPIRY, refresh now
        if (timeUntilExpiry <= RefreshTokenManager.REFRESH_BEFORE_EXPIRY) {
            return 0; // Refresh immediately
        }

        // Otherwise, refresh REFRESH_BEFORE_EXPIRY before expiry
        return timeUntilExpiry - RefreshTokenManager.REFRESH_BEFORE_EXPIRY;
    }

    /**
     * Schedule proactive token refresh
     */
    private scheduleProactiveRefresh(delay: number): void {
        this.refreshTimer = setTimeout(async () => {
            await this.performRefresh();
        }, delay);
    }

    /**
     * Perform token refresh with retry and store update
     */
    async performRefresh(updateStore: boolean = false): Promise<boolean> {
        if (this.isRefreshing) {
            console.log('🔄 [RefreshTokenManager] Refresh already in progress, waiting...');
            return false;
        }

        this.isRefreshing = true;

        try {
            // Check if refresh token exists
            const refreshToken = await AuthHelper.getRefreshToken();
            if (!refreshToken) {
                console.log('🔐 [RefreshTokenManager] No refresh token available');
                return false;
            }

            // Attempt refresh with retry
            let lastError: any;
            for (let attempt = 1; attempt <= RefreshTokenManager.MAX_RETRY_ATTEMPTS; attempt++) {
                try {
                    console.log(`🔄 [RefreshTokenManager] Refresh attempt ${attempt}/${RefreshTokenManager.MAX_RETRY_ATTEMPTS}...`);

                    const response = await sessionService.refreshToken(refreshToken);

                    // Save new tokens
                    await AuthHelper.saveTokens({
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        tokenType: response.data.tokenType,
                        expiresIn: response.data.expiresIn,
                        expiresAt: Date.now() + response.data.expiresIn,
                        role: response.data.role,
                    });

                    // Update store if requested
                    if (updateStore) {
                        await this.updateAuthStore({
                            accessToken: response.data.accessToken,
                            refreshToken: response.data.refreshToken,
                        });
                    }

                    console.log('✅ [RefreshTokenManager] Token refresh successful');

                    //Reinitialize WebSocket after token refresh
                    try {
                        const { initializationService } = await import('./initializationService');
                        await initializationService.reinitializeWebSocket();
                        console.log('✅ [RefreshTokenManager] WebSocket reinitialized after token refresh');
                    } catch (wsError) {
                        console.error('❌ [RefreshTokenManager] WebSocket reinitialization failed:', wsError);
                        // Don't block token refresh flow
                    }

                    // Schedule next refresh
                    await this.startMonitoring();
                    return true;
                } catch (error: any) {
                    lastError = error;
                    console.error(`❌ [RefreshTokenManager] Refresh attempt ${attempt} failed:`, error);

                    // 🚀 IMMEDIATE FAIL ON 401: Don't retry on 401 errors
                    if (error.response?.status === 401 || error.message?.includes('Invalid refresh token')) {
                        console.log('🔐 [RefreshTokenManager] 401/Invalid token error - refresh failed');
                        return false;
                    }

                    // Wait before retry (exponential backoff) - only for network errors
                    if (attempt < RefreshTokenManager.MAX_RETRY_ATTEMPTS) {
                        const delay = 1000 * Math.pow(2, attempt - 1);
                        console.log(`⏳ [RefreshTokenManager] Retrying in ${delay}ms`);
                        await this.delay(delay);
                    }
                }
            }

            console.error('❌ [RefreshTokenManager] All refresh attempts failed:', lastError);
            return false;
        } catch (error: any) {
            console.error('❌ [RefreshTokenManager] Unexpected error during refresh:', error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Update auth store with new tokens
     */
    private async updateAuthStore(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
        try {
            const { useAuthStore } = await import('../store/authStore');
            const authStore = useAuthStore.getState();

            // Update tokens in store - Zustand store doesn't have setState, use direct state update
            // This is a workaround since we can't directly access the store's set method from outside
            console.log('🔄 [RefreshTokenManager] Store update handled by AuthStore.refreshTokens()');
        } catch (error) {
            console.warn('⚠️ [RefreshTokenManager] Failed to update auth store:', error);
        }
    }

    /**
     * Check and refresh on app resume
     */
    async checkAndRefreshOnResume(): Promise<void> {
        try {
            console.log('📱 [RefreshTokenManager] Checking token on app resume...');


            const isAuthenticated = await AuthHelper.isAuthenticated();
            if (!isAuthenticated) {
                console.log('⚠️ [RefreshTokenManager] User not authenticated on resume');
                return;
            }

            const tokens = await AuthHelper.getTokens();
            if (!tokens) {
                console.log('⚠️ [RefreshTokenManager] No tokens found on resume');
                return;
            }

            const currentTime = Date.now();
            const timeUntilExpiry = tokens.expiresAt - currentTime;
            const shouldRefresh = timeUntilExpiry < 10 * 60 * 1000; // Less than 10 minutes

            if (shouldRefresh) {
                console.log('🔄 [RefreshTokenManager] Token expires soon, refreshing on resume...');
                await this.performRefresh();
            } else {
                console.log('✅ [RefreshTokenManager] Token still valid on resume');
            }
        } catch (error) {
            console.error('❌ [RefreshTokenManager] Error on app resume check:', error);
        }
    }



    /**
     * Utility function for delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get refresh status information
     */
    async getRefreshStatus(): Promise<{
        isMonitoring: boolean;
        isRefreshing: boolean;
        isAuthenticated: boolean;
        tokenExpiryTime: number;
    }> {
        const isMonitoring = this.refreshTimer !== null;
        const isAuthenticated = await AuthHelper.isAuthenticated();

        let tokenExpiryTime = 0;
        if (isAuthenticated) {
            const tokens = await AuthHelper.getTokens();
            if (tokens) {
                tokenExpiryTime = tokens.expiresAt;
            }
        }

        return {
            isMonitoring,
            isRefreshing: this.isRefreshing,
            isAuthenticated,
            tokenExpiryTime,
        };
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopMonitoring();
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
        console.log('🧹 [RefreshTokenManager] Resources cleaned up');
    }
}

// Export singleton instance
export const refreshTokenManager = RefreshTokenManager.getInstance();
