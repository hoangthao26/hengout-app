import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Google OAuth Configuration
export const GOOGLE_CONFIG = {
    // Your Google Client ID for iOS
    CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',

    // iOS specific configuration
    IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
    WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com', // Required for iOS
};

// Initialize Google Sign-In for iOS
export const initializeGoogleSignIn = () => {
    GoogleSignin.configure({
        // iOS configuration
        webClientId: GOOGLE_CONFIG.WEB_CLIENT_ID, // Required for iOS to get idToken
        iosClientId: GOOGLE_CONFIG.IOS_CLIENT_ID, // iOS specific client ID
        offlineAccess: true, // Enable offline access for backend API calls
    });
};

// Google Sign-In function
export const googleSignIn = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        return userInfo;
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        throw error;
    }
};

// Google Sign-Out function
export const googleSignOut = async () => {
    try {
        await GoogleSignin.signOut();
        console.log('Google Sign-Out successful');
    } catch (error) {
        console.error('Google Sign-Out Error:', error);
        throw error;
    }
};

// Get current user
export const getCurrentUser = async () => {
    try {
        const userInfo = await GoogleSignin.getCurrentUser();
        return userInfo;
    } catch (error) {
        console.error('Get Current User Error:', error);
        throw error;
    }
};


