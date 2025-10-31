import { Platform } from 'react-native';
import { auth, googleProvider } from '../config/firebase';
import { AuthHelper } from './authHelper';

export interface FirebaseUserInfo {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    idToken: string;
}

export class FirebaseAuthService {
    private static instance: FirebaseAuthService;

    constructor() {
        console.log('Firebase Auth Service initialized');
    }

    /**
     * Sign in with Google using Firebase - Simple approach
     */
    async signInWithGoogle(): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            console.log('Starting Firebase Google sign-in...');

            if (Platform.OS === 'web') {
                // For web, use popup
                const { signInWithPopup } = await import('firebase/auth');
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;

                console.log('Firebase sign-in successful:', user.email);

                // Get ID token
                const idToken = await user.getIdToken();

                // Create user info object
                const userInfo: FirebaseUserInfo = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    idToken: idToken
                };

                // Authenticate with backend
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
                // For mobile, use redirect
                const { signInWithRedirect } = await import('firebase/auth');
                await signInWithRedirect(auth, googleProvider);
                // This will redirect user to Google, then back to app
                return {
                    success: false,
                    error: 'Redirecting to Google... Please wait.'
                };
            }

        } catch (error: any) {
            console.error('Firebase sign-in error:', error);
            return {
                success: false,
                error: error.message || 'Firebase authentication failed'
            };
        }
    }

    /**
     * Sign out from Firebase
     */
    async signOut(): Promise<void> {
        try {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
            console.log('Firebase sign-out successful');
        } catch (error: any) {
            console.error('Firebase sign-out error:', error);
            throw new Error(`Firebase sign-out failed: ${error.message}`);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return auth.currentUser;
    }

    /**
     * Check if user is signed in
     */
    isSignedIn(): boolean {
        return auth.currentUser !== null;
    }

    /**
     * Get current user info
     */
    async getCurrentUserInfo(): Promise<FirebaseUserInfo | null> {
        try {
            const user = auth.currentUser;
            if (!user) return null;

            const idToken = await user.getIdToken();
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                idToken: idToken
            };
        } catch (error) {
            console.error('Failed to get user info:', error);
            return null;
        }
    }

    /**
     * Authenticate with backend using Firebase user info
     */
    private async authenticateWithBackend(userInfo: FirebaseUserInfo): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            console.log('[FirebaseAuth] Authenticating with backend using Firebase...');

            const apiBaseUrl = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
            const apiUrl = `${apiBaseUrl}/api/v1/auth/user/oauth/google`;

            console.log('[FirebaseAuth] API URL:', apiUrl);
            console.log('[FirebaseAuth] Request payload:', { idToken: userInfo.idToken });

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
            console.log('[FirebaseAuth] Backend response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('[FirebaseAuth] Backend response JSON:', data);
            } catch (parseError) {
                console.error('[FirebaseAuth] Failed to parse JSON response:', parseError);
                console.error('[FirebaseAuth] Response was:', responseText);
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
            console.error('[FirebaseAuth] Backend authentication error:', error);
            return {
                success: false,
                error: error.message || 'Backend authentication failed'
            };
        }
    }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();


