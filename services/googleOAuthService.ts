import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AuthHelper } from './authHelper';

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
}

export interface GoogleOAuthResult {
    success: boolean;
    data?: any;
    error?: string;
}

export class GoogleOAuthService {
    private static instance: GoogleOAuthService;

    // Google OAuth Configuration
    private readonly GOOGLE_CLIENT_ID = '857718557597-aagu5po0i0s3k1n6ke1633m8n8n05hg4.apps.googleusercontent.com';
    private readonly GOOGLE_CLIENT_SECRET = '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';

    // Use standard OAuth scopes
    private readonly GOOGLE_SCOPES = [
        'openid',
        'profile',
        'email'
    ];

    // Discovery document for Google OAuth
    private readonly discovery: AuthSession.DiscoveryDocument = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    constructor() {
        console.log('🚀 Google OAuth Service initialized');
        console.log('🔧 Configuration:');
        console.log('  - Client ID:', this.GOOGLE_CLIENT_ID ? '✅ Loaded' : '❌ Empty');
        console.log('  - Client Secret:', this.GOOGLE_CLIENT_SECRET ? '✅ Loaded' : '❌ Empty');
        console.log('  - Scopes:', this.GOOGLE_SCOPES);
    }

    /**
     * Get redirect URI based on platform
     */
    private getRedirectUri(): string {
        if (Platform.OS === 'web') {
            return 'http://localhost:8081';
        }
        return 'https://auth.expo.io/@trendslade/project-exe101/redirect';
    }

    /**
     * Get Google OAuth configuration
     */
    private getAuthConfig() {
        const redirectUri = this.getRedirectUri();

        console.log('🔧 OAuth Config:');
        console.log('  - Platform:', Platform.OS);
        console.log('  - Redirect URI:', redirectUri);
        console.log('  - Client ID:', this.GOOGLE_CLIENT_ID);
        console.log('  - Scopes:', this.GOOGLE_SCOPES);

        return {
            clientId: this.GOOGLE_CLIENT_ID,
            scopes: this.GOOGLE_SCOPES,
            redirectUri: redirectUri,
            responseType: AuthSession.ResponseType.Code,
            extraParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        };
    }

    /**
     * Main sign-in method
     */
    async signIn(): Promise<GoogleOAuthResult> {
        try {
            console.log('🚀 Starting Google OAuth sign-in...');

            const config = this.getAuthConfig();

            // Create auth request
            const request = new AuthSession.AuthRequest(config);

            console.log('🔧 Auth Request created:', {
                clientId: request.clientId,
                redirectUri: request.redirectUri,
                scopes: request.scopes,
                responseType: request.responseType,
            });

            // Start authentication
            const result = await request.promptAsync(this.discovery);

            console.log('📱 OAuth result type:', result.type);
            console.log('📱 OAuth result:', result);

            // Handle different result types
            if (result.type === 'error') {
                console.error('❌ OAuth error:', result.error);
                return {
                    success: false,
                    error: `OAuth error: ${result.error?.message || 'Unknown error'}`
                };
            }

            if (result.type === 'cancel') {
                console.log('⚠️ OAuth cancelled by user');
                return {
                    success: false,
                    error: 'User cancelled the authentication'
                };
            }

            if (result.type === 'success' && result.params?.code) {
                console.log('✅ OAuth success, exchanging code for tokens...');

                // Exchange authorization code for tokens
                const tokenResult = await this.exchangeCodeForTokens(result.params.code);

                if (tokenResult.success) {
                    // Get user info
                    const userInfo = await this.getUserInfo(tokenResult.data.access_token);

                    if (userInfo.success && userInfo.data) {
                        // Authenticate with backend
                        const backendResult = await this.authenticateWithBackend(userInfo.data, tokenResult.data.id_token);

                        if (backendResult.success) {
                            return {
                                success: true,
                                data: backendResult.data
                            };
                        } else {
                            return {
                                success: false,
                                error: backendResult.error || 'Backend authentication failed'
                            };
                        }
                    } else {
                        return {
                            success: false,
                            error: userInfo.error || 'Failed to get user info'
                        };
                    }
                } else {
                    return {
                        success: false,
                        error: tokenResult.error || 'Failed to exchange code for tokens'
                    };
                }
            }

            return {
                success: false,
                error: 'Unexpected OAuth result'
            };

        } catch (error: any) {
            console.error('❌ Google OAuth sign-in error:', error);
            return {
                success: false,
                error: error.message || 'Google OAuth sign-in failed'
            };
        }
    }

    /**
     * Exchange authorization code for access and ID tokens
     */
    private async exchangeCodeForTokens(code: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            console.log('🔄 Exchanging code for tokens...');

            const tokenUrl = 'https://oauth2.googleapis.com/token';
            const redirectUri = this.getRedirectUri();

            const response = await fetch(tokenUrl, {
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
                }).toString(),
            });

            const data = await response.json();
            console.log('🔄 Token exchange response:', data);

            if (response.ok && data.access_token) {
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('❌ Token exchange failed:', data);
                return {
                    success: false,
                    error: data.error_description || 'Token exchange failed'
                };
            }
        } catch (error: any) {
            console.error('❌ Token exchange error:', error);
            return {
                success: false,
                error: error.message || 'Token exchange failed'
            };
        }
    }

    /**
     * Get user information from Google
     */
    private async getUserInfo(accessToken: string): Promise<{ success: boolean; data?: GoogleUserInfo; error?: string }> {
        try {
            console.log('👤 Getting user info from Google...');

            const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

            const response = await fetch(userInfoUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            const userInfo: GoogleUserInfo = await response.json();
            console.log('👤 User info:', userInfo);

            if (response.ok && userInfo.id) {
                return {
                    success: true,
                    data: userInfo
                };
            } else {
                console.error('❌ Failed to get user info:', userInfo);
                return {
                    success: false,
                    error: 'Failed to get user information'
                };
            }
        } catch (error: any) {
            console.error('❌ Get user info error:', error);
            return {
                success: false,
                error: error.message || 'Failed to get user information'
            };
        }
    }

    /**
     * Authenticate with backend using Google user info and ID token
     */
    private async authenticateWithBackend(userInfo: GoogleUserInfo, idToken: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            console.log('🔄 Authenticating with backend...');

            const apiBaseUrl = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
            const apiUrl = `${apiBaseUrl}/api/v1/auth/user/oauth/google`;

            console.log('🌐 API URL:', apiUrl);
            console.log('📤 Request payload:', {
                idToken: idToken,
                userInfo: {
                    id: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name
                }
            });

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: idToken,
                    userInfo: {
                        id: userInfo.id,
                        email: userInfo.email,
                        name: userInfo.name,
                        picture: userInfo.picture,
                        given_name: userInfo.given_name,
                        family_name: userInfo.family_name,
                    }
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
                    onboardingComplete: data.data.onboardingComplete,
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

    /**
     * Sign out from Google
     */
    async signOut(): Promise<void> {
        try {
            console.log('🚪 Signing out from Google...');

            // Clear local tokens
            await AuthHelper.clearTokens();

            console.log('✅ Google sign-out successful');
        } catch (error: any) {
            console.error('❌ Google sign-out error:', error);
            throw new Error(`Google sign-out failed: ${error.message}`);
        }
    }

    /**
     * Check if user is signed in
     */
    async isSignedIn(): Promise<boolean> {
        try {
            const tokens = await AuthHelper.getTokens();
            return tokens !== null && tokens.accessToken !== '';
        } catch (error) {
            console.error('❌ Failed to check sign-in status:', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    async getCurrentUserInfo(): Promise<any> {
        try {
            const tokens = await AuthHelper.getTokens();
            if (!tokens) return null;

            // You can decode the ID token or make an API call to get user info
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                // Add more user info as needed
            };
        } catch (error) {
            console.error('❌ Failed to get user info:', error);
            return null;
        }
    }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();