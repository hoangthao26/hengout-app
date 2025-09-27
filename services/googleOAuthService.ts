import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AuthHelper } from './authHelper';

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
    idToken: string;
}

export class GoogleOAuthService {
    private static instance: GoogleOAuthService;

    // Google OAuth Configuration
    private readonly GOOGLE_CLIENT_ID = '';
    private readonly GOOGLE_CLIENT_SECRET = '';
    private readonly GOOGLE_SCOPES = ['openid', 'profile', 'email'];

    private discovery: AuthSession.DiscoveryDocument;

    constructor() {
        this.discovery = {
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
            revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
        };
    }

    /**
     * Get Google OAuth configuration for useAuthRequest hook
     */
    getAuthConfig() {
        // Use different redirect URI based on platform
        const redirectUri = Platform.OS === 'web'
            ? 'http://localhost:8081' // For web development
            : 'https://auth.expo.io/@trendslade/project-exe101'; // For Expo Go

        const config = {
            clientId: this.GOOGLE_CLIENT_ID,
            scopes: this.GOOGLE_SCOPES,
            redirectUri: redirectUri,
            responseType: AuthSession.ResponseType.Code,
            extraParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        };

        console.log('🔧 Google OAuth Config:', {
            clientId: config.clientId,
            scopes: config.scopes,
            redirectUri: config.redirectUri,
            responseType: config.responseType,
            extraParams: config.extraParams,
        });

        return config;
    }

    /**
     * Get discovery document
     */
    getDiscovery() {
        return this.discovery;
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(code: string, redirectUri: string): Promise<any> {
        try {
            console.log('🔄 Exchanging authorization code for tokens...');
            console.log('Code:', code);
            console.log('Redirect URI:', redirectUri);

            // Use direct fetch instead of AuthSession.exchangeCodeAsync for better web compatibility
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.GOOGLE_CLIENT_ID,
                    client_secret: this.GOOGLE_CLIENT_SECRET,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Token exchange failed:', response.status, errorText);
                throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
            }

            const tokenResult = await response.json();
            console.log('✅ Tokens received successfully:', tokenResult);
            return tokenResult;
        } catch (error: any) {
            console.error('❌ Failed to exchange code for tokens:', error);
            throw new Error(`Token exchange failed: ${error.message}`);
        }
    }

    /**
     * Get user information from Google
     */
    async getUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.status}`);
            }

            const userData = await response.json();

            return {
                id: userData.id,
                email: userData.email,
                name: userData.name || '',
                picture: userData.picture,
                idToken: accessToken, // Using access token as idToken for now
            };
        } catch (error: any) {
            console.error('❌ Failed to get user info:', error);
            return null;
        }
    }

    /**
     * Sign out from Google
     */
    async signOut(): Promise<void> {
        try {
            // For web-based OAuth, we just clear local state
            // Google doesn't have a server-side logout endpoint for OAuth
            console.log('✅ Google Sign-Out completed');
        } catch (error: any) {
            console.error('❌ Google Sign-Out failed:', error);
            throw new Error(`Google Sign-Out failed: ${error.message}`);
        }
    }

    /**
     * Check if user is signed in
     */
    async isSignedIn(): Promise<boolean> {
        // For web-based OAuth, we can't easily check sign-in status
        // without storing tokens locally. For now, return false.
        return false;
    }

    /**
     * Get current user info
     */
    async getCurrentUser(): Promise<GoogleUserInfo | null> {
        // For web-based OAuth, we can't easily get current user
        // without storing tokens locally. For now, return null.
        return null;
    }

    /**
     * Main sign-in method that handles the complete OAuth flow
     */
    async signIn(): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            console.log('🚀 Starting Google OAuth sign-in...');

            // Create auth request
            const authConfig = this.getAuthConfig();
            const discovery = this.getDiscovery();

            // Start OAuth flow
            const result = await WebBrowser.openAuthSessionAsync(
                `${discovery.authorizationEndpoint}?` +
                `client_id=${authConfig.clientId}&` +
                `redirect_uri=${encodeURIComponent(authConfig.redirectUri)}&` +
                `response_type=${authConfig.responseType}&` +
                `scope=${authConfig.scopes.join(' ')}&` +
                `access_type=${authConfig.extraParams.access_type}&` +
                `prompt=${authConfig.extraParams.prompt}`,
                authConfig.redirectUri
            );

            console.log('📱 OAuth result:', result);

            if (result.type === 'success' && result.url) {
                // Parse the authorization code from the URL
                const url = new URL(result.url);
                const code = url.searchParams.get('code');

                if (code) {
                    // Exchange code for tokens
                    const tokenResponse = await this.exchangeCodeForTokens(
                        code,
                        authConfig.redirectUri
                    );

                    console.log('🎫 Token response:', tokenResponse);

                    if (tokenResponse.access_token) {
                        // Check if we have ID token (preferred for backend auth)
                        if (tokenResponse.id_token) {
                            console.log('🎫 Using ID token for backend authentication');
                            // Use ID token directly for backend authentication
                            const backendResponse = await this.authenticateWithBackend({
                                id: '',
                                email: '',
                                name: '',
                                idToken: tokenResponse.id_token
                            });

                            if (backendResponse.success) {
                                return {
                                    success: true,
                                    data: backendResponse.data
                                };
                            } else {
                                return {
                                    success: false,
                                    error: backendResponse.error || 'Backend authentication failed'
                                };
                            }
                        } else {
                            // Fallback: Get user info from access token
                            console.log('🎫 Using access token to get user info');
                            const userInfo = await this.getUserInfo(tokenResponse.access_token);

                            if (userInfo) {
                                // Send to backend for authentication
                                const backendResponse = await this.authenticateWithBackend(userInfo);

                                if (backendResponse.success) {
                                    return {
                                        success: true,
                                        data: backendResponse.data
                                    };
                                } else {
                                    return {
                                        success: false,
                                        error: backendResponse.error || 'Backend authentication failed'
                                    };
                                }
                            } else {
                                return {
                                    success: false,
                                    error: 'Failed to get user information from Google'
                                };
                            }
                        }
                    } else {
                        return {
                            success: false,
                            error: 'No access token received from Google'
                        };
                    }
                } else {
                    return {
                        success: false,
                        error: 'No authorization code received from Google'
                    };
                }
            } else if (result.type === 'cancel') {
                return {
                    success: false,
                    error: 'User cancelled Google OAuth'
                };
            } else {
                return {
                    success: false,
                    error: `OAuth failed: ${result.type}`
                };
            }
        } catch (error: any) {
            console.error('❌ Google OAuth sign-in error:', error);
            return {
                success: false,
                error: error.message || 'Google OAuth failed'
            };
        }
    }

    /**
     * Authenticate with backend using Google user info
     */
    private async authenticateWithBackend(userInfo: GoogleUserInfo): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            console.log('🔄 Authenticating with backend...');

            const apiBaseUrl = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
            const apiUrl = `${apiBaseUrl}/api/v1/auth/user/oauth/google`;

            console.log('🔧 Environment check:');
            console.log('  - API_BASE_URL:', process.env.API_BASE_URL);
            console.log('  - EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
            console.log('  - Final API Base URL:', apiBaseUrl);
            console.log('🌐 API URL:', apiUrl);
            console.log('📤 Request payload:', { idToken: userInfo.idToken });

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: userInfo.idToken
                })
            });

            const responseText = await response.text();
            console.log('📡 Backend response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('📡 Backend response JSON:', data);
            } catch (parseError) {
                console.error('❌ Failed to parse JSON response:', parseError);
                console.error('❌ Response was:', responseText);
                return {
                    success: false,
                    error: `Backend returned invalid JSON: ${responseText.substring(0, 100)}...`
                };
            }

            if (response.ok && data.status === 'success') {
                // Save tokens to secure storage
                await AuthHelper.saveTokens({
                    accessToken: data.data.accessToken,
                    refreshToken: data.data.refreshToken,
                    tokenType: data.data.tokenType || 'Bearer',
                    expiresIn: data.data.expiresIn,
                    expiresAt: Date.now() + data.data.expiresIn,
                    role: data.data.role || '',
                });

                return {
                    success: true,
                    data: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.message || 'Backend authentication failed'
                };
            }
        } catch (error: any) {
            console.error('❌ Backend authentication error:', error);
            return {
                success: false,
                error: error.message || 'Backend authentication failed'
            };
        }
    }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();




