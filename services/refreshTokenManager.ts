/**
 * Refresh Token Manager
 * Handles proactive, lazy, and app resume token refresh
 */

import { AppState, AppStateStatus } from 'react-native';
import { AuthHelper, AuthTokens } from './authHelper';
import { authMonitoringService } from './authMonitoringService';
import { failSafeService } from './failSafeService';

export class RefreshTokenManager {
    private static instance: RefreshTokenManager;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;
    private lastRefreshTime = 0;
    private appStateSubscription: any = null;

    private static readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000;
    private static readonly MIN_REFRESH_INTERVAL = 60 * 1000;
    private static readonly MAX_RETRY_ATTEMPTS = 3;
    private static readonly RETRY_BACKOFF_BASE = 1000;

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
     * Start comprehensive token monitoring with monitoring
     */
    async startMonitoring(): Promise<void> {
        // ✅ GUARD: Prevent multiple monitoring starts
        if (this.refreshTimer !== null) {
            console.log('⏳ [RefreshTokenManager] Monitoring already active, skipping start...');
            return;
        }

        try {
            console.log('🚀 [RefreshTokenManager] Starting token monitoring...');

            // ✅ ENTERPRISE BEST PRACTICE: Log monitoring start
            authMonitoringService.logEvent(
                'PERFORMANCE',
                'LOW',
                'Token monitoring started',
                true
            );

            // Clear any existing timer
            this.stopMonitoring();

            // Check if user is authenticated
            const isAuthenticated = await AuthHelper.isAuthenticated();
            if (!isAuthenticated) {
                console.log('⚠️ [RefreshTokenManager] User not authenticated, skipping monitoring');
                authMonitoringService.logEvent(
                    'PERFORMANCE',
                    'LOW',
                    'Token monitoring skipped - user not authenticated',
                    true
                );
                return;
            }

            // Get current tokens
            const tokens = await AuthHelper.getTokens();
            if (!tokens) {
                console.log('⚠️ [RefreshTokenManager] No tokens found, skipping monitoring');
                authMonitoringService.logEvent(
                    'PERFORMANCE',
                    'LOW',
                    'Token monitoring skipped - no tokens found',
                    true
                );
                return;
            }

            // Calculate time until refresh is needed
            const timeUntilRefresh = this.calculateTimeUntilRefresh(tokens);

            if (timeUntilRefresh <= 0) {
                // Token needs immediate refresh
                console.log('🚨 [RefreshTokenManager] Token needs immediate refresh');
                authMonitoringService.logEvent(
                    'REFRESH',
                    'HIGH',
                    'Token needs immediate refresh',
                    true,
                    { timeUntilRefresh }
                );
                await this.performRefresh();
            } else {
                // Schedule proactive refresh
                console.log(`⏰ [RefreshTokenManager] Scheduling proactive refresh in ${Math.round(timeUntilRefresh / 1000)} seconds`);
                authMonitoringService.logEvent(
                    'PERFORMANCE',
                    'LOW',
                    `Proactive refresh scheduled in ${Math.round(timeUntilRefresh / 1000)} seconds`,
                    true,
                    { timeUntilRefresh }
                );
                this.scheduleProactiveRefresh(timeUntilRefresh);
            }
        } catch (error: any) {
            console.error('❌ [RefreshTokenManager] Failed to start monitoring:', error);
            authMonitoringService.logEvent(
                'ERROR',
                'HIGH',
                `Failed to start token monitoring: ${error.message}`,
                false,
                { error: error.message }
            );
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
        // Ensure minimum interval between refreshes
        const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
        const actualDelay = Math.max(delay, RefreshTokenManager.MIN_REFRESH_INTERVAL - timeSinceLastRefresh);

        this.refreshTimer = setTimeout(async () => {
            await this.performRefresh();
        }, actualDelay);
    }

    /**
     * Perform token refresh with enterprise error handling
     */
    async performRefresh(): Promise<boolean> {
        if (this.isRefreshing) {
            console.log('🔄 [RefreshTokenManager] Refresh already in progress, waiting...');
            return this.refreshPromise || false;
        }

        this.isRefreshing = true;

        this.refreshPromise = this.executeRefreshWithRetry();

        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    /**
     * Execute refresh with exponential backoff retry
     */
    private async executeRefreshWithRetry(): Promise<boolean> {
        let lastError: any;

        for (let attempt = 1; attempt <= RefreshTokenManager.MAX_RETRY_ATTEMPTS; attempt++) {
            try {

                // Check if enough time has passed since last refresh
                const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
                if (timeSinceLastRefresh < RefreshTokenManager.MIN_REFRESH_INTERVAL) {
                    return true; // Consider it successful to avoid unnecessary retries
                }

                // Attempt to refresh token
                const refreshSuccess = await this.executeRefresh();

                if (refreshSuccess) {
                    this.lastRefreshTime = Date.now();

                    // Schedule next refresh
                    await this.startMonitoring();
                    return true;
                } else {
                    throw new Error('Refresh returned false');
                }
            } catch (error) {
                lastError = error;
                console.error(`❌ [RefreshTokenManager] Refresh attempt ${attempt} failed:`, error);

                // Classify error type
                const errorType = this.classifyError(error);
                console.log(`🔍 [RefreshTokenManager] Error classified as: ${errorType}`);

                if (errorType === 'AUTHENTICATION_ERROR') {
                    // Authentication error - don't retry, logout user
                    console.log('🔐 [RefreshTokenManager] Authentication error - logging out user');
                    await AuthHelper.logoutAndNavigate();
                    return false;
                } else if (errorType === 'NETWORK_ERROR' && attempt < RefreshTokenManager.MAX_RETRY_ATTEMPTS) {
                    // Network error - retry with exponential backoff
                    const backoffDelay = RefreshTokenManager.RETRY_BACKOFF_BASE * Math.pow(2, attempt - 1);
                    console.log(`⏳ [RefreshTokenManager] Network error - retrying in ${backoffDelay}ms`);
                    await this.delay(backoffDelay);
                } else {
                    // Unknown error or max retries reached
                    console.log('❓ [RefreshTokenManager] Unknown error or max retries reached');
                    break;
                }
            }
        }

        console.error('❌ [RefreshTokenManager] All refresh attempts failed:', lastError);
        return false;
    }

    /**
     * Execute the actual refresh API call with comprehensive monitoring
     */
    private async executeRefresh(): Promise<boolean> {
        const startTime = Date.now();
        let success = false;

        try {
            const refreshToken = await AuthHelper.getRefreshToken();

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }


            authMonitoringService.logEvent(
                'REFRESH',
                'MEDIUM',
                'Token refresh initiated',
                true,
                { startTime }
            );

            const failSafeResult = await failSafeService.performFailSafeRefresh();

            if (failSafeResult.success) {
                success = true;
                if (failSafeResult.usedFallback) {
                    authMonitoringService.logEvent(
                        'REFRESH',
                        'MEDIUM',
                        `Token refresh successful using ${failSafeResult.fallbackStrategy}`,
                        true,
                        {
                            fallbackStrategy: failSafeResult.fallbackStrategy,
                            recoveryAttempted: failSafeResult.recoveryAttempted
                        }
                    );
                } else {
                    authMonitoringService.logEvent(
                        'REFRESH',
                        'LOW',
                        'Primary token refresh successful',
                        true
                    );
                }
            } else {
                console.error(`❌ [RefreshTokenManager] Fail-safe refresh failed: ${failSafeResult.error}`);
                authMonitoringService.logEvent(
                    'ERROR',
                    'HIGH',
                    `Token refresh failed: ${failSafeResult.error}`,
                    false,
                    {
                        error: failSafeResult.error,
                        fallbackStrategy: failSafeResult.fallbackStrategy
                    }
                );
            }
        } catch (error: any) {
            console.error('❌ [RefreshTokenManager] Failed to execute monitored refresh:', error);
            authMonitoringService.logEvent(
                'ERROR',
                'HIGH',
                `Token refresh exception: ${error.message}`,
                false,
                { error: error.message }
            );
        } finally {
            const duration = Date.now() - startTime;
            authMonitoringService.trackRefreshPerformance(startTime, success);

            authMonitoringService.logEvent(
                'PERFORMANCE',
                'LOW',
                `Token refresh completed in ${duration}ms`,
                success,
                { duration, success }
            );
        }

        return success;
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
                await this.performRefresh();
            }
        } catch (error) {
            console.error('❌ [RefreshTokenManager] Error on app resume check:', error);
        }
    }

    /**
     * Force immediate refresh (for manual refresh or testing)
     */
    async forceRefresh(): Promise<boolean> {
        console.log('🚀 [RefreshTokenManager] Force refresh requested...');
        return await this.performRefresh();
    }

    /**
     * Classify error type for smart handling
     */
    private classifyError(error: any): 'AUTHENTICATION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR' {
        if (error.response?.status === 401 ||
            error.message?.includes('invalid_token') ||
            error.message?.includes('token_expired') ||
            error.message?.includes('unauthorized')) {
            return 'AUTHENTICATION_ERROR';
        }

        if (error.code === 'NETWORK_ERROR' ||
            error.message?.includes('network') ||
            error.message?.includes('timeout') ||
            error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('ENOTFOUND')) {
            return 'NETWORK_ERROR';
        }

        return 'UNKNOWN_ERROR';
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
        timeUntilRefresh: number;
        lastRefreshTime: number;
        isAuthenticated: boolean;
        tokenExpiryTime: number;
    }> {
        const isMonitoring = this.refreshTimer !== null;
        const isAuthenticated = await AuthHelper.isAuthenticated();

        let timeUntilRefresh = 0;
        let tokenExpiryTime = 0;

        if (isAuthenticated) {
            const tokens = await AuthHelper.getTokens();
            if (tokens) {
                tokenExpiryTime = tokens.expiresAt;
                timeUntilRefresh = this.calculateTimeUntilRefresh(tokens);
            }
        }

        return {
            isMonitoring,
            isRefreshing: this.isRefreshing,
            timeUntilRefresh,
            lastRefreshTime: this.lastRefreshTime,
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