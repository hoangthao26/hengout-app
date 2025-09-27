import { router } from 'expo-router';

// Navigation routes constants
export const ROUTES = {
    // Main routes
    HOME: '/',
    TABS: '/(tabs)',
    DISCOVER: '/(tabs)/discover',

    // Auth routes
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD_OTP: '/auth/reset-password-otp',
    RESET_PASSWORD: '/auth/reset-password',
    INITIALIZE_PROFILE: '/auth/initialize-profile',
    ONBOARDING_WIZARD: '/auth/onboarding-wizard',

    // Settings
    SETTINGS: '/settings',

    // Friends
    FRIEND_REQUEST: '/friend-request',
    FRIENDS_LIST: '/friends-list',
    SENT_REQUESTS: '/sent-requests',
} as const;

// Navigation service class
class NavigationService {
    // Navigate to a route
    static navigate(route: string) {
        router.push(route as any);
    }

    // Replace current route
    static replace(route: string) {
        router.replace(route as any);
    }

    // Go back
    static goBack() {
        router.back();
    }

    // Navigate with parameters
    static navigateWithParams(route: string, params: Record<string, string | number | boolean>) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        const fullRoute = `${route}?${searchParams.toString()}`;
        router.push(fullRoute as any);
    }

    // Specific navigation methods
    static goToLogin() {
        this.navigate(ROUTES.LOGIN);
    }

    static goToSignup() {
        this.navigate(ROUTES.SIGNUP);
    }

    static goToVerifyOtp(params: { sessionToken?: string; email?: string; isRegistration?: string }) {
        this.navigateWithParams(ROUTES.VERIFY_OTP, params);
    }

    static goToForgotPassword() {
        this.navigate(ROUTES.FORGOT_PASSWORD);
    }

    static goToResetPasswordOtp(params: { sessionToken: string; email: string }) {
        this.navigateWithParams(ROUTES.RESET_PASSWORD_OTP, params);
    }

    static goToResetPassword(params: { sessionToken: string; email: string }) {
        this.navigateWithParams(ROUTES.RESET_PASSWORD, params);
    }

    static goToInitializeProfile() {
        this.navigate(ROUTES.INITIALIZE_PROFILE);
    }

    static goToOnboardingWizard() {
        this.navigate(ROUTES.ONBOARDING_WIZARD);
    }

    static goToSettings() {
        this.navigate(ROUTES.SETTINGS);
    }

    static goToFriendRequest() {
        this.navigate(ROUTES.FRIEND_REQUEST);
    }

    static goToFriendsList() {
        this.navigate(ROUTES.FRIENDS_LIST);
    }

    static goToSentRequests() {
        this.navigate(ROUTES.SENT_REQUESTS);
    }

    static goToTabs() {
        // Use replace to prevent back navigation to auth screens
        this.replace(ROUTES.TABS);
    }

    static goToDiscover() {
        // Navigate to Discover tab specifically
        this.replace(ROUTES.DISCOVER);
    }

    static goToHome() {
        this.replace(ROUTES.HOME);
    }

    // Secure navigation methods that prevent back navigation
    static secureNavigateToTabs() {
        // Replace entire stack to prevent back navigation to auth screens
        router.replace(ROUTES.TABS as any);
    }

    static secureNavigateToDiscover() {
        // Replace entire stack to prevent back navigation to auth screens
        router.replace(ROUTES.DISCOVER as any);
    }

    static secureNavigateToHome() {
        // Replace entire stack to prevent back navigation
        router.replace(ROUTES.HOME as any);
    }

    // Secure logout navigation - replaces entire stack to prevent back navigation
    static logoutToLogin() {
        // Replace entire navigation stack to prevent back navigation
        // This ensures user cannot swipe back to authenticated screens
        router.replace(ROUTES.LOGIN as any);
    }

    // Clear entire navigation stack and reset to login
    static resetToLogin() {
        // This method can be used for complete app reset
        router.replace(ROUTES.LOGIN as any);
    }
}

export default NavigationService;
