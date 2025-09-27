import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleSignInResult, GoogleUserInfo, GoogleTokens } from '../types/user';

// Helper function to get Google ID token
export const getGoogleIdToken = async () => {
    try {
        // Get current user info
        const userInfo = await GoogleSignin.getCurrentUser();
        if (!userInfo) {
            throw new Error('User not signed in');
        }

        // Get ID token
        const tokens = await GoogleSignin.getTokens();
        return tokens.idToken;
    } catch (error) {
        console.error('Error getting Google ID token:', error);
        throw error;
    }
};

// Helper function to perform Google Sign-In and get ID token
export const performGoogleSignIn = async () => {
    try {
        // Check Play Services
        await GoogleSignin.hasPlayServices();

        // Perform sign in
        const userInfo = await GoogleSignin.signIn();

        // Get ID token
        const tokens = await GoogleSignin.getTokens();

        return {
            userInfo,
            idToken: tokens.idToken
        };
    } catch (error) {
        console.error('Google Sign-In error:', error);
        throw error;
    }
};
