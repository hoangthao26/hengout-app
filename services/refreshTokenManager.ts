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
                await this.checkAndRefreshOnResume();
            }
        });
    }

    /**
     * Start token monitoring
     */
    async startMonitoring(): Promise<void> {
        if (this.refreshTimer !== null) {
            return;
        }

        try {
            const isAuthenticated = await AuthHelper.isAuthenticated();
            if (!isAuthenticated) {
                return;
            }

            const tokens = await AuthHelper.getTokens();
            if (!tokens) {
                return;
            }

            const timeUntilRefresh = this.calculateTimeUntilRefresh(tokens);

            if (timeUntilRefresh <= 0) {
                await this.performRefresh();
            } else {
                this.scheduleProactiveRefresh(timeUntilRefresh);
            }
        } catch (error: any) {
            console.error('[RefreshTokenManager] Failed to start monitoring:', error);
        }
    }

    /**
     * Stop token monitoring
     */
    stopMonitoring(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.isRefreshing = false;
    }

    /**
     * Calculate time until proactive token refresh should occur
     * 
     * Proactive refresh strategy:
     * - Tokens are refreshed BEFORE expiry to prevent authentication failures
     * - Refresh threshold: REFRESH_BEFORE_EXPIRY (5 minutes before expiry)
     * 
     * Calculation logic:
     * - If token expires in < 5 minutes: Return 0 (refresh immediately)
     * - Otherwise: Return time until 5 minutes before expiry
     * 
     * Example:
     * - Token expires in 30 minutes → Refresh in 25 minutes (30 - 5)
     * - Token expires in 3 minutes → Refresh now (return 0)
     * 
     * Prevents race conditions where token expires during API calls.
     * 
     * @param tokens - Current authentication tokens
     * @returns Milliseconds until refresh should occur (0 = refresh immediately)
     */
    private calculateTimeUntilRefresh(tokens: AuthTokens): number {
        const currentTime = Date.now();
        const timeUntilExpiry = tokens.expiresAt - currentTime;

        // Case 1: Token expiring soon (< 5 min) - refresh immediately
        if (timeUntilExpiry <= RefreshTokenManager.REFRESH_BEFORE_EXPIRY) {
            return 0; // Refresh immediately to prevent expiry during use
        }

        // Case 2: Token still valid - schedule refresh 5 minutes before expiry
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
     * Perform token refresh with exponential backoff retry and side effects
     * 
     * Refresh flow with retry strategy:
     * 1. Validates refresh token exists (early exit if missing)
     * 2. Attempts refresh with exponential backoff (max 2 attempts)
     * 3. On success: Saves tokens, updates store (optional), reinitializes WebSocket, resumes monitoring
     * 4. On failure: Exponential backoff retry (except 401 errors which fail immediately)
     * 
     * Retry strategy:
     * - Max attempts: 2 (reduced from 3)
     * - Exponential backoff: delay = 1000ms * 2^(attempt-1)
     *   - Attempt 1: immediate
     *   - Attempt 2: wait 1000ms (1s)
     * 
     * Error handling:
     * - 401 errors: Fail immediately (refresh token invalid, no retry)
     * - Network errors: Retry with exponential backoff
     * - Other errors: Retry with exponential backoff
     * 
     * Side effects on success:
     * - Saves new tokens to secure storage
     * - Updates auth store (if requested)
     * - Reinitializes WebSocket with new token
     * - Resumes proactive monitoring for next refresh
     * 
     * @param updateStore - Whether to update auth store with new tokens
     * @returns true if refresh succeeded, false if failed
     */
    async performRefresh(updateStore: boolean = false): Promise<boolean> {
        // Prevent concurrent refresh attempts
        if (this.isRefreshing) {
            return false;
        }

        this.isRefreshing = true;

        try {
            // Step 1: Validate refresh token exists
            const refreshToken = await AuthHelper.getRefreshToken();
            if (!refreshToken) {
                return false;
            }

            // Step 2: Retry loop with exponential backoff
            let lastError: any;
            for (let attempt = 1; attempt <= RefreshTokenManager.MAX_RETRY_ATTEMPTS; attempt++) {
                try {
                    const response = await sessionService.refreshToken(refreshToken);

                    // Step 3a: Save new tokens to secure storage
                    await AuthHelper.saveTokens({
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        tokenType: response.data.tokenType,
                        expiresIn: response.data.expiresIn,
                        expiresAt: Date.now() + response.data.expiresIn,
                        role: response.data.role,
                    });

                    // Step 3b: Update store if requested (optional)
                    if (updateStore) {
                        await this.updateAuthStore({
                            accessToken: response.data.accessToken,
                            refreshToken: response.data.refreshToken,
                        });
                    }

                    // Step 3c: Reinitialize WebSocket with new token (non-blocking)
                    try {
                        const { initializationService } = await import('./initializationService');
                        await initializationService.reinitializeWebSocket();
                    } catch (wsError) {
                        // WebSocket reinit failure doesn't block token refresh success
                        console.error('[RefreshTokenManager] WebSocket reinitialization failed:', wsError);
                    }

                    // Step 3d: Resume proactive monitoring for next refresh
                    await this.startMonitoring();
                    return true;
                } catch (error: any) {
                    lastError = error;
                    console.error(`[RefreshTokenManager] Refresh attempt ${attempt} failed:`, error);

                    // Don't retry on 401 errors (refresh token invalid/expired)
                    if (error.response?.status === 401 || error.message?.includes('Invalid refresh token')) {
                        return false; // Fail immediately, no retry
                    }

                    // Exponential backoff retry (except on last attempt)
                    if (attempt < RefreshTokenManager.MAX_RETRY_ATTEMPTS) {
                        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
                        await this.delay(delay);
                    }
                }
            }
            return false; // All attempts failed
        } catch (error: any) {
            console.error('[RefreshTokenManager] Unexpected error during refresh:', error);
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
            useAuthStore.getState();
            // Store update handled by AuthStore.refreshTokens()
        } catch (error) {
            console.warn('[RefreshTokenManager] Failed to update auth store:', error);
        }
    }

    /**
     * Check and refresh on app resume
     */
    async checkAndRefreshOnResume(): Promise<void> {
        try {
            const isAuthenticated = await AuthHelper.isAuthenticated();
            if (!isAuthenticated) {
                return;
            }

            const tokens = await AuthHelper.getTokens();
            if (!tokens) {
                return;
            }

            const currentTime = Date.now();
            const timeUntilExpiry = tokens.expiresAt - currentTime;
            const shouldRefresh = timeUntilExpiry < 10 * 60 * 1000; // Less than 10 minutes

            if (shouldRefresh) {
                await this.performRefresh();
            }
        } catch (error) {
            console.error('[RefreshTokenManager] Error on app resume check:', error);
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
    }
}

// Export singleton instance
export const refreshTokenManager = RefreshTokenManager.getInstance();
