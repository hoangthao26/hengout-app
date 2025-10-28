import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

export interface GoogleUser {
    id: string;
    name: string;
    email: string;
    photo?: string;
    idToken: string;
    accessToken: string;
}

export interface GoogleSignInResult {
    success: boolean;
    data?: GoogleUser;
    error?: string;
}

class NativeGoogleSignInService {
    private isConfigured = false;

    constructor() {
        this.configure();
    }

    private configure() {
        if (this.isConfigured) return;

        try {
            GoogleSignin.configure({
                // iOS Client ID từ Google Console
                iosClientId: '857718557597-aagu5po0i0s3k1n6ke1633m8n8n05hg4.apps.googleusercontent.com',
                // Web Client ID (same as iOS for consistency)
                webClientId: '857718557597-aagu5po0i0s3k1n6ke1633m8n8n05hg4.apps.googleusercontent.com',
                // Scopes
                scopes: ['openid', 'profile', 'email'],
                // Offline access
                offlineAccess: true,
                // Hosted domain (optional)
                hostedDomain: '',
                // Force code for refresh token
                forceCodeForRefreshToken: true,
            });

            this.isConfigured = true;
            console.log('✅ Google Sign-In configured successfully');
        } catch (error) {
            console.error('❌ Google Sign-In configuration failed:', error);
        }
    }

    async signIn(): Promise<GoogleSignInResult> {
        try {
            console.log('Starting native Google Sign-In...');

            // Check if device supports Google Play Services (Android only)
            if (Platform.OS === 'android') {
                await GoogleSignin.hasPlayServices();
            }

            // Sign in
            const userInfo = await GoogleSignin.signIn();

            console.log('✅ Google Sign-In successful:', userInfo);

            // Transform to our interface
            const googleUser: GoogleUser = {
                id: (userInfo as any).user?.id || '',
                name: (userInfo as any).user?.name || '',
                email: (userInfo as any).user?.email || '',
                photo: (userInfo as any).user?.photo || undefined,
                idToken: (userInfo as any).idToken || '',
                accessToken: (userInfo as any).serverAuthCode || '',
            };

            // Authenticate with backend
            const backendResult = await this.authenticateWithBackend(googleUser);

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

        } catch (error: any) {
            console.error('❌ Google Sign-In error:', error);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                return {
                    success: false,
                    error: 'User cancelled Google Sign-In'
                };
            } else if (error.code === statusCodes.IN_PROGRESS) {
                return {
                    success: false,
                    error: 'Google Sign-In already in progress'
                };
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                return {
                    success: false,
                    error: 'Google Play Services not available'
                };
            } else {
                return {
                    success: false,
                    error: error.message || 'Google Sign-In failed'
                };
            }
        }
    }

    async signOut(): Promise<boolean> {
        try {
            await GoogleSignin.signOut();
            console.log('✅ Google Sign-Out successful');
            return true;
        } catch (error) {
            console.error('❌ Google Sign-Out error:', error);
            return false;
        }
    }

    async isSignedIn(): Promise<boolean> {
        try {
            const userInfo = await GoogleSignin.getCurrentUser();
            return userInfo !== null;
        } catch (error) {
            console.error('❌ Check sign-in status error:', error);
            return false;
        }
    }

    async getCurrentUser(): Promise<GoogleUser | null> {
        try {
            const userInfo = await GoogleSignin.getCurrentUser();

            if (userInfo) {
                return {
                    id: (userInfo as any).user?.id || '',
                    name: (userInfo as any).user?.name || '',
                    email: (userInfo as any).user?.email || '',
                    photo: (userInfo as any).user?.photo || undefined,
                    idToken: (userInfo as any).idToken || '',
                    accessToken: (userInfo as any).serverAuthCode || '',
                };
            }

            return null;
        } catch (error) {
            console.error('❌ Get current user error:', error);
            return null;
        }
    }

    private async authenticateWithBackend(user: GoogleUser): Promise<GoogleSignInResult> {
        try {
            console.log('🔄 Authenticating with backend...');

            // TODO: Replace with your actual backend endpoint
            const response = await fetch('YOUR_BACKEND_GOOGLE_AUTH_ENDPOINT', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: user.idToken,
                    accessToken: user.accessToken,
                    email: user.email,
                    name: user.name,
                    photo: user.photo,
                }),
            });

            if (!response.ok) {
                throw new Error(`Backend authentication failed: ${response.status}`);
            }

            const backendData = await response.json();

            return {
                success: true,
                data: backendData
            };
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
export const nativeGoogleSignInService = new NativeGoogleSignInService();
