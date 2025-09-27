import * as SecureStore from 'expo-secure-store';
import { OnboardingService } from './onboardingService';
import { sessionService } from './sessionService';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number; // Duration in milliseconds from API (for backward compatibility)
    expiresAt: number; // ✅ ENTERPRISE BEST PRACTICE: Actual expiration timestamp
    role: string;
    onboardingComplete?: boolean; // Optional field from auth response
}

export interface StoredTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expirationTime: number; // Actual expiration timestamp
    role: string;
}

export class AuthHelper {
    private static readonly ACCESS_TOKEN_KEY = 'accessToken';
    private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
    private static readonly TOKEN_TYPE_KEY = 'tokenType';
    private static readonly EXPIRATION_TIME_KEY = 'expirationTime';
    private static readonly ROLE_KEY = 'role';

    /**
     * Save authentication tokens to secure storage
     */
    static async saveTokens(tokens: AuthTokens): Promise<void> {
        try {
            // Validate tokens before saving
            if (!tokens.accessToken || !tokens.refreshToken) {
                throw new Error('Missing required tokens');
            }

            // Ensure expiresIn is a valid number
            let expiresIn = typeof tokens.expiresIn === 'number' ? tokens.expiresIn : parseInt(tokens.expiresIn as any);
            if (isNaN(expiresIn) || expiresIn <= 0) {
                throw new Error('Invalid expiresIn value');
            }

            if (expiresIn < 100000) {
                expiresIn = expiresIn * 1000;
            }

            const currentTime = Date.now();
            const expiresAt = currentTime + expiresIn;


            // Ensure all values are strings and not null/undefined
            const accessToken = String(tokens.accessToken || '');
            const refreshToken = String(tokens.refreshToken || '');
            const tokenType = String(tokens.tokenType || 'Bearer');
            const expirationTimeStr = String(expiresAt);
            const role = String(tokens.role || '');

            if (!accessToken || !refreshToken) {
                throw new Error('Access token or refresh token is empty');
            }

            await Promise.all([
                SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, accessToken),
                SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, refreshToken),
                SecureStore.setItemAsync(this.TOKEN_TYPE_KEY, tokenType),
                SecureStore.setItemAsync(this.EXPIRATION_TIME_KEY, expiresAt.toString()),
                SecureStore.setItemAsync(this.ROLE_KEY, role),
            ]);


            // Save onboarding status if provided
            if (tokens.onboardingComplete !== undefined) {
                await OnboardingService.setOnboardingStatus(tokens.onboardingComplete);
            }

        } catch (error) {
            console.error('Failed to save tokens:', error);
            throw new Error('Failed to save authentication tokens');
        }
    }

    /**
     * Get access token from secure storage
     */
    static async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get access token:', error);
            return null;
        }
    }

    /**
     * Get refresh token from secure storage
     */
    static async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    }

    /**
     * Get all stored tokens
     */
    static async getTokens(): Promise<AuthTokens | null> {
        try {
            console.log('🔍 [AuthHelper] Reading tokens from SecureStore...');

            const [accessToken, refreshToken, tokenType, expirationTime, role] = await Promise.all([
                SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY),
                SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY),
                SecureStore.getItemAsync(this.TOKEN_TYPE_KEY),
                SecureStore.getItemAsync(this.EXPIRATION_TIME_KEY),
                SecureStore.getItemAsync(this.ROLE_KEY),
            ]);

            console.log('📖 [AuthHelper] Raw tokens from SecureStore:', {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                hasTokenType: !!tokenType,
                hasExpirationTime: !!expirationTime,
                hasRole: !!role,
                accessTokenLength: accessToken?.length || 0,
                refreshTokenLength: refreshToken?.length || 0,
                expirationTime: expirationTime,
            });

            if (!accessToken || !refreshToken) {
                console.log('❌ [AuthHelper] Missing access or refresh token');
                return null;
            }

            // Parse expiration timestamp
            const expirationTimestamp = parseInt(expirationTime || '0');
            const currentTime = Date.now();

            // Calculate remaining duration
            const remainingDuration = Math.max(0, expirationTimestamp - currentTime);

            console.log('⏰ [AuthHelper] Token timing info:', {
                currentTime: new Date(currentTime).toLocaleString(),
                expirationTimestamp: new Date(expirationTimestamp).toLocaleString(),
                remainingDuration: Math.round(remainingDuration / 1000) + ' seconds',
                isExpired: remainingDuration <= 0,
            });

            const tokens = {
                accessToken,
                refreshToken,
                tokenType: tokenType || 'Bearer',
                expiresIn: remainingDuration, // Return remaining duration (for backward compatibility)
                expiresAt: expirationTimestamp, // ✅ ENTERPRISE BEST PRACTICE: Return actual expiration timestamp
                role: role || '',
            };

            console.log('✅ [AuthHelper] Successfully retrieved tokens');
            return tokens;
        } catch (error) {
            console.error('❌ [AuthHelper] Failed to get tokens:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    static async isAuthenticated(): Promise<boolean> {
        try {
            const tokens = await this.getTokens();
            return tokens !== null && tokens.accessToken !== null;
        } catch (error) {
            console.error('Failed to check authentication status:', error);
            return false;
        }
    }

    /**
     * Check if access token is expired
     * Note: expiresIn from API is already in milliseconds
     */
    static async isTokenExpired(): Promise<boolean> {
        try {
            const tokens = await this.getTokens();
            if (!tokens) return true;

            // expiresIn now represents remaining duration
            return tokens.expiresIn <= 0;
        } catch (error) {
            console.error('Failed to check token expiration:', error);
            return true;
        }
    }

    /**
     * Refresh access token using refresh token - ENTERPRISE BEST PRACTICE
     * Supports refresh token rotation without requiring access token
     */
    static async refreshAccessToken(): Promise<boolean> {
        try {
            const refreshToken = await this.getRefreshToken();

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }


            const response = await sessionService.refreshToken(refreshToken);

            await this.saveTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
                tokenType: response.data.tokenType,
                expiresIn: response.data.expiresIn,
                expiresAt: Date.now() + response.data.expiresIn,
                role: response.data.role,
            });

            return true;
        } catch (error) {
            console.error('❌ [AuthHelper] Failed to refresh access token:', error);
            // If refresh fails, clear all tokens
            await this.clearTokens();
            return false;
        }
    }

    /**
     * Logout with smart API decision
     */
    static async logout(): Promise<void> {
        try {

            // Get current token status
            const refreshToken = await this.getRefreshToken();
            const isTokenValid = await this.isAuthenticated();
            const tokens = await this.getTokens();

            const shouldCallAPI = refreshToken &&
                isTokenValid &&
                tokens &&
                tokens.expiresIn > 5 * 60 * 1000; // 5 minutes

            if (shouldCallAPI) {
                console.log('📡 Calling logout API (token fresh)...');

                // 4. Call API with proper error handling
                try {
                    await this.callLogoutAPI(refreshToken);
                    console.log('✅ Logout API call successful');
                } catch (apiError) {
                    console.log('⚠️ Logout API call failed, continuing with local cleanup');
                }
            } else {
                console.log('⏭️ Skipping logout API call (token expired or close to expiry)');
            }

            // 5. Always clear local tokens and onboarding status
            await this.clearTokens();
            await OnboardingService.clearOnboardingStatus();
            console.log('✅ Local tokens and onboarding status cleared');

        } catch (error) {
            console.error('❌ Logout process failed:', error);
            // Ensure tokens are cleared even if process fails
            await this.clearTokens();
        }
    }

    /**
     * Call logout API without triggering token refresh
     */
    private static async callLogoutAPI(refreshToken: string): Promise<void> {
        const { API_CONFIG } = require('../config/api');
        const { API_ENDPOINTS } = require('../config/api');

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.SESSION.LOGOUT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'HengoutApp/1.0',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error(`Logout API failed: ${response.status}`);
        }
    }

    /**
     * Force logout without API call (for offline scenarios)
     */
    static async forceLogout(): Promise<void> {
        try {


            // Clear local tokens
            await this.clearTokens();
        } catch (error) {
            console.error('Force logout failed:', error);
            throw error;
        }
    }

    /**
     * Smart logout with network detection and fallback
     */
    static async smartLogout(): Promise<void> {
        try {
            // Check if we have valid tokens first
            const isAuthenticated = await this.isAuthenticated();

            if (!isAuthenticated) {
                // No valid tokens, just clear local data
                await this.forceLogout();
                return;
            }

            // Try normal logout with API call
            await this.logout();
        } catch (error) {
            console.error('Smart logout failed, falling back to force logout:', error);
            // Fallback to force logout if normal logout fails
            await this.forceLogout();
        }
    }

    /**
 * Complete logout with immediate navigation (for use in components)
 */
    static async logoutAndNavigate(): Promise<void> {
        try {
            // Import here to avoid circular dependency
            const { default: NavigationService } = await import('./navigationService');

            // Navigate immediately without waiting for logout process
            NavigationService.logoutToLogin();

            // Perform logout cleanup in background
            this.logout().catch(error => {
                console.error('Background logout failed:', error);
            });
        } catch (error) {
            console.error('Logout and navigate failed:', error);
            // Force navigation even if import fails
            try {
                const { default: NavigationService } = await import('./navigationService');
                NavigationService.logoutToLogin();
            } catch (navError) {
                console.error('Force navigation failed:', navError);
            }
        }
    }

    /**
     * Clear all stored tokens
     */
    static async clearTokens(): Promise<void> {
        try {

            await Promise.all([
                SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY),
                SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY),
                SecureStore.deleteItemAsync(this.TOKEN_TYPE_KEY),
                SecureStore.deleteItemAsync(this.EXPIRATION_TIME_KEY),
                SecureStore.deleteItemAsync(this.ROLE_KEY),
            ]);
        } catch (error) {
            console.error('Failed to clear tokens:', error);
            throw new Error('Failed to clear authentication tokens');
        }
    }

    /**
     * Get authorization header for API requests
     */
    static async getAuthHeader(): Promise<string | null> {
        try {
            const tokens = await this.getTokens();
            if (!tokens) return null;

            return `${tokens.tokenType} ${tokens.accessToken}`;
        } catch (error) {
            console.error('Failed to get auth header:', error);
            return null;
        }
    }

    /**
     * Get detailed token information for debugging
     */
    static async getTokenInfo(): Promise<{
        isAuthenticated: boolean;
        hasTokens: boolean;
        tokenExpired: boolean;
        remainingTime: number;
        expirationTime: string;
        refreshTime: string;
        timeUntilRefresh: number;
        tokenType: string;
        role: string;
    } | null> {
        try {
            const tokens = await this.getTokens();
            if (!tokens) {
                return {
                    isAuthenticated: false,
                    hasTokens: false,
                    tokenExpired: true,
                    remainingTime: 0,
                    expirationTime: 'N/A',
                    refreshTime: 'N/A',
                    timeUntilRefresh: 0,
                    tokenType: 'N/A',
                    role: 'N/A',
                };
            }

            // Get the actual expiration timestamp from storage
            const expirationTimeStr = await SecureStore.getItemAsync(this.EXPIRATION_TIME_KEY);
            const expirationTimestamp = parseInt(expirationTimeStr || '0');

            const currentTime = Date.now();
            const isExpired = tokens.expiresIn <= 0;

            // Calculate refresh time (5 minutes before expiration)
            const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutes
            const refreshTimestamp = expirationTimestamp - REFRESH_BEFORE_EXPIRY;
            const timeUntilRefresh = Math.max(0, refreshTimestamp - currentTime);

            console.log('🔍 Token Debug Info:');
            console.log('- Current Time:', new Date(currentTime).toLocaleString());
            console.log('- Expiration Timestamp:', expirationTimestamp);
            console.log('- Expiration Time:', new Date(expirationTimestamp).toLocaleString());
            console.log('- Refresh Time:', new Date(refreshTimestamp).toLocaleString());
            console.log('- Time Until Refresh:', Math.round(timeUntilRefresh / 1000), 'seconds');
            console.log('- Remaining Duration:', tokens.expiresIn);
            console.log('- Is Expired:', isExpired);

            return {
                isAuthenticated: true,
                hasTokens: true,
                tokenExpired: isExpired,
                remainingTime: Math.max(0, tokens.expiresIn),
                expirationTime: new Date(expirationTimestamp).toLocaleString(),
                refreshTime: new Date(refreshTimestamp).toLocaleString(),
                timeUntilRefresh: timeUntilRefresh,
                tokenType: tokens.tokenType,
                role: tokens.role,
            };
        } catch (error) {
            console.error('Failed to get token info:', error);
            return null;
        }
    }

    /**
     * Check if token needs pre-refresh (expires in less than 5 minutes)
     */
    static async shouldPreRefreshToken(): Promise<boolean> {
        try {
            const tokens = await this.getTokens();
            if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
                return false;
            }

            const expirationTimeStr = await SecureStore.getItemAsync(this.EXPIRATION_TIME_KEY);
            const expirationTimestamp = parseInt(expirationTimeStr || '0');
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTimestamp - currentTime;

            // Pre-refresh if token expires in less than 5 minutes (300,000 ms)
            return timeUntilExpiry < 300000 && timeUntilExpiry > 0;
        } catch (error) {
            console.error('Failed to check token pre-refresh status:', error);
            return false;
        }
    }

    /**
     * Pre-refresh token if it's about to expire
     */
    static async preRefreshTokenIfNeeded(): Promise<boolean> {
        try {
            const shouldRefresh = await this.shouldPreRefreshToken();
            if (shouldRefresh) {
                console.log('🔄 Pre-refreshing token (expires soon)');
                const success = await this.refreshAccessToken();
                if (success) {
                    console.log('✅ Token pre-refresh successful');
                    return true;
                } else {
                    console.warn('⚠️ Token pre-refresh failed');
                    return false;
                }
            }
            return true; // No refresh needed
        } catch (error) {
            console.error('❌ Token pre-refresh error:', error);
            return false;
        }
    }

    /**
     * Start token pre-refresh monitoring
     */
    static startTokenMonitoring(): NodeJS.Timeout {
        console.log('🕐 Starting token monitoring...');

        return setInterval(async () => {
            try {
                const isAuthenticated = await this.isAuthenticated();
                if (isAuthenticated) {
                    await this.preRefreshTokenIfNeeded();
                }
            } catch (error) {
                console.error('❌ Token monitoring error:', error);
            }
        }, 60000); // Check every minute
    }

    /**
     * Stop token pre-refresh monitoring
     */
    static stopTokenMonitoring(intervalId: NodeJS.Timeout): void {
        console.log('🛑 Stopping token monitoring...');
        clearInterval(intervalId);
    }
}
