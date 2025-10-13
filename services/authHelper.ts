import * as SecureStore from 'expo-secure-store';
import { OnboardingService } from './onboardingService';
import { sessionService } from './sessionService';
import { Alert } from 'react-native';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    expiresAt: number;
    role: string;
    onboardingComplete?: boolean;
}

export interface StoredTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expirationTime: number;
    role: string;
}

export class AuthHelper {
    private static readonly ACCESS_TOKEN_KEY = 'accessToken';
    private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
    private static readonly TOKEN_TYPE_KEY = 'tokenType';
    private static readonly EXPIRATION_TIME_KEY = 'expirationTime';
    private static readonly ROLE_KEY = 'role';


    static async saveTokens(tokens: AuthTokens): Promise<void> {
        try {
            if (!tokens.accessToken || !tokens.refreshToken) {
                throw new Error('Missing required tokens');
            }

            let expiresIn = typeof tokens.expiresIn === 'number' ? tokens.expiresIn : parseInt(tokens.expiresIn as any);
            if (isNaN(expiresIn) || expiresIn <= 0) {
                throw new Error('Invalid expiresIn value');
            }

            if (expiresIn < 100000) {
                expiresIn = expiresIn * 1000;
            }

            const currentTime = Date.now();
            const expiresAt = currentTime + expiresIn;


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


            if (tokens.onboardingComplete !== undefined) {
                await OnboardingService.setOnboardingStatus(tokens.onboardingComplete);
            }

        } catch (error) {
            console.error('Failed to save tokens:', error);
            throw new Error('Failed to save authentication tokens');
        }
    }

    static async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get access token:', error);
            return null;
        }
    }

    static async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    }

    static async getTokens(): Promise<AuthTokens | null> {
        try {
            const [accessToken, refreshToken, tokenType, expirationTime, role] = await Promise.all([
                SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY),
                SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY),
                SecureStore.getItemAsync(this.TOKEN_TYPE_KEY),
                SecureStore.getItemAsync(this.EXPIRATION_TIME_KEY),
                SecureStore.getItemAsync(this.ROLE_KEY),
            ]);

            if (!accessToken || !refreshToken) {
                return null;
            }

            const expirationTimestamp = parseInt(expirationTime || '0');
            const currentTime = Date.now();
            const remainingDuration = Math.max(0, expirationTimestamp - currentTime);

            const tokens = {
                accessToken,
                refreshToken,
                tokenType: tokenType || 'Bearer',
                expiresIn: remainingDuration,
                expiresAt: expirationTimestamp,
                role: role || '',
            };

            return tokens;
        } catch (error) {
            console.error('Failed to get tokens:', error);
            return null;
        }
    }

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

            return tokens.expiresIn <= 0;
        } catch (error) {
            console.error('Failed to check token expiration:', error);
            return true;
        }
    }


    static async logout(): Promise<void> {
        try {
            try {
                const { chatSyncService } = await import('./chatSyncService');
                chatSyncService.stopSync();
            } catch (error) {
                console.log('Failed to stop chat sync service:', error);
            }

            const refreshToken = await this.getRefreshToken();
            const isTokenValid = await this.isAuthenticated();
            const tokens = await this.getTokens();

            const shouldCallAPI = refreshToken &&
                isTokenValid &&
                tokens &&
                tokens.expiresIn > 5 * 60 * 1000;

            if (shouldCallAPI) {
                try {
                    await this.callLogoutAPI(refreshToken);
                } catch (apiError) {
                    console.log('Logout API call failed, continuing with local cleanup');
                }
            }
            await this.clearTokens();
            await OnboardingService.clearOnboardingStatus();
            console.log('✅ Local tokens and onboarding status cleared');

            // 🚀 CLEAR DATABASE: Clear all local database data (like WhatsApp/Telegram)
            try {
                const { databaseService } = await import('./databaseService');
                await databaseService.clearAllData();
                console.log('✅ [AuthHelper] Database cleared successfully');
            } catch (dbError) {
                console.error('❌ [AuthHelper] Failed to clear database:', dbError);
                // Don't throw - database clear failure shouldn't block logout
            }

            // 🚀 SET LOGOUT FLAGS: Prevent infinite 401 loops
            try {
                const { setLogoutMode, setUserLoggedOut } = await import('../config/axios');
                setLogoutMode(true);
                setUserLoggedOut(true);
            } catch (error) {
                console.log('Failed to set logout flags:', error);
            }

        } catch (error) {
            console.error('Logout process failed:', error);
            await this.clearTokens();
        }
    }

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

    static async forceLogout(): Promise<void> {
        try {
            try {
                const { chatSyncService } = await import('./chatSyncService');
                chatSyncService.stopSync();
            } catch (error) {
                console.log('Failed to stop chat sync service:', error);
            }

            // Clear local tokens
            await this.clearTokens();

            // 🚀 CLEAR DATABASE: Clear all local database data (like WhatsApp/Telegram)
            try {
                const { databaseService } = await import('./databaseService');
                await databaseService.clearAllData();
                console.log('✅ [AuthHelper] Database cleared successfully (force logout)');
            } catch (dbError) {
                console.error('Failed to clear database:', dbError);
            }
        } catch (error) {
            console.error('Force logout failed:', error);
            throw error;
        }
    }

    static async smartLogout(): Promise<void> {
        try {
            const isAuthenticated = await this.isAuthenticated();

            if (!isAuthenticated) {
                await this.forceLogout();
                return;
            }

            await this.logout();
        } catch (error) {
            console.error('Smart logout failed, falling back to force logout:', error);
            await this.forceLogout();
        }
    }

    static async logoutAndNavigate(): Promise<void> {
        try {
            // Import here to avoid circular dependency
            const { default: NavigationService } = await import('./navigationService');

            NavigationService.logoutToLogin();

            setTimeout(() => {
                Alert.alert(
                    'Phiên đăng nhập hết hạn',
                    'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.',
                    [
                        {
                            text: 'Đăng nhập lại',
                            style: 'default'
                        }
                    ]
                );
            }, 500); // Small delay to ensure navigation is complete

            // Perform logout cleanup in background
            this.logout().catch(error => {
                console.error('Background logout failed:', error);
            });
        } catch (error) {
            console.error('Logout and navigate failed:', error);
            try {
                const { default: NavigationService } = await import('./navigationService');
                NavigationService.logoutToLogin();

                setTimeout(() => {
                    Alert.alert(
                        'Phiên đăng nhập hết hạn',
                        'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.',
                        [
                            {
                                text: 'Đăng nhập lại',
                                style: 'default'
                            }
                        ]
                    );
                }, 500);
            } catch (navError) {
                console.error('Force navigation failed:', navError);
            }
        }
    }

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

            const expirationTimeStr = await SecureStore.getItemAsync(this.EXPIRATION_TIME_KEY);
            const expirationTimestamp = parseInt(expirationTimeStr || '0');

            const currentTime = Date.now();
            const isExpired = tokens.expiresIn <= 0;

            const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000;
            const refreshTimestamp = expirationTimestamp - REFRESH_BEFORE_EXPIRY;
            const timeUntilRefresh = Math.max(0, refreshTimestamp - currentTime);


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

            return timeUntilExpiry < 300000 && timeUntilExpiry > 0;
        } catch (error) {
            console.error('Failed to check token pre-refresh status:', error);
            return false;
        }
    }

    static async preRefreshTokenIfNeeded(): Promise<boolean> {
        try {
            const shouldRefresh = await this.shouldPreRefreshToken();
            if (shouldRefresh) {
                // Use RefreshTokenManager for consistent refresh logic
                const { refreshTokenManager } = await import('./refreshTokenManager');
                const success = await refreshTokenManager.performRefresh();
                return success;
            }
            return true;
        } catch (error) {
            console.log('🔄 Token pre-refresh error:', (error as any)?.message || 'Unknown error');
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
