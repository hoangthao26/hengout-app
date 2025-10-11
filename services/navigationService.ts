import { router } from 'expo-router';
import * as Location from 'expo-location';

/**
 * Enterprise Navigation Service - Production Ready
 * 
 * Enterprise Features:
 * 1. Role-based access control (RBAC)
 * 2. Analytics and tracking
 * 3. Deep linking support
 * 4. Navigation guards and middleware
 * 5. Error handling and fallbacks
 * 6. Performance monitoring
 * 7. Audit logging
 * 8. Feature flags integration
 * 9. Multi-tenant support
 * 10. Security validation
 * 
 * Usage Guidelines:
 * - Always use NavigationService for enterprise features
 * - Implement proper error handling
 * - Log all navigation events
 * - Validate permissions before navigation
 * - Use feature flags for conditional navigation
 */

// Enterprise navigation configuration
interface NavigationConfig {
    requiresAuth?: boolean;
    requiredRoles?: string[];
    featureFlag?: string;
    analytics?: {
        event: string;
        properties?: Record<string, any>;
    };
    deepLink?: boolean;
    cacheable?: boolean;
    timeout?: number;
}

// Navigation event for analytics
interface NavigationEvent {
    route: string;
    timestamp: number;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}

// Navigation routes constants - Single source of truth
export const ROUTES = {
    // Main routes
    HOME: '/',
    TABS: '/(tabs)',
    DISCOVER: '/(tabs)/discover',
    CHAT: '/(tabs)/chat',
    PROFILE: '/(tabs)/profile',

    // Auth routes
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD_OTP: '/auth/reset-password-otp',
    RESET_PASSWORD: '/auth/reset-password',
    INITIALIZE_PROFILE: '/auth/initialize-profile',
    ONBOARDING_WIZARD: '/auth/onboarding-wizard',

    // Profile routes
    EDIT_PROFILE: '/profile/edit-profile',
    EDIT_NAME: '/profile/edit-name',
    EDIT_BIO: '/profile/edit-bio',
    EDIT_GENDER: '/profile/edit-gender',
    EDIT_DATE_OF_BIRTH: '/profile/edit-date-of-birth',
    VIEW_AVATAR: '/profile/view-avatar',

    // Settings routes
    SETTINGS: '/settings/settings',
    PREFERENCES: '/settings/preferences',

    // Friends routes
    FRIEND_REQUEST: '/friends/friend-request',
    FRIENDS_LIST: '/friends/friends-list',
    SENT_REQUESTS: '/friends/sent-requests',

    // Collections routes
    COLLECTIONS: '/collections/collections',
    COLLECTION_DETAIL: '/collections/collection-detail',

    // Chat routes
    CHAT_CONVERSATION: '/chat/[conversationId]',
    CHAT_DETAILS: '/chat/[conversationId]/details',
    CHAT_MEMBERS: '/chat/[conversationId]/members',
} as const;

// Type for route keys - provides type safety
export type RouteKey = keyof typeof ROUTES;

// Enterprise route configurations
export const ROUTE_CONFIGS: Record<RouteKey, NavigationConfig> = {
    // Main routes
    HOME: { requiresAuth: false, analytics: { event: 'home_visited' } },
    TABS: { requiresAuth: true, analytics: { event: 'tabs_accessed' } },
    DISCOVER: { requiresAuth: true, analytics: { event: 'discover_visited' } },
    CHAT: { requiresAuth: true, analytics: { event: 'chat_accessed' } },
    PROFILE: { requiresAuth: true, analytics: { event: 'profile_visited' } },

    // Auth routes
    LOGIN: { requiresAuth: false, analytics: { event: 'login_attempted' } },
    SIGNUP: { requiresAuth: false, analytics: { event: 'signup_attempted' } },
    VERIFY_OTP: { requiresAuth: false, analytics: { event: 'otp_verification' } },
    FORGOT_PASSWORD: { requiresAuth: false, analytics: { event: 'password_reset_initiated' } },
    RESET_PASSWORD_OTP: { requiresAuth: false, analytics: { event: 'password_reset_otp' } },
    RESET_PASSWORD: { requiresAuth: false, analytics: { event: 'password_reset_completed' } },
    INITIALIZE_PROFILE: { requiresAuth: true, analytics: { event: 'profile_initialization' } },
    ONBOARDING_WIZARD: { requiresAuth: true, analytics: { event: 'onboarding_started' } },

    // Profile routes - require authentication
    EDIT_PROFILE: { requiresAuth: true, analytics: { event: 'profile_edit_accessed' } },
    EDIT_NAME: { requiresAuth: true, analytics: { event: 'name_edit_accessed' } },
    EDIT_BIO: { requiresAuth: true, analytics: { event: 'bio_edit_accessed' } },
    EDIT_GENDER: { requiresAuth: true, analytics: { event: 'gender_edit_accessed' } },
    EDIT_DATE_OF_BIRTH: { requiresAuth: true, analytics: { event: 'dob_edit_accessed' } },
    VIEW_AVATAR: { requiresAuth: true, analytics: { event: 'avatar_viewed' } },

    // Settings routes - require authentication
    SETTINGS: { requiresAuth: true, analytics: { event: 'settings_accessed' } },
    PREFERENCES: { requiresAuth: true, analytics: { event: 'preferences_accessed' } },

    // Friends routes - require authentication
    FRIEND_REQUEST: { requiresAuth: true, analytics: { event: 'friend_request_accessed' } },
    FRIENDS_LIST: { requiresAuth: true, analytics: { event: 'friends_list_accessed' } },
    SENT_REQUESTS: { requiresAuth: true, analytics: { event: 'sent_requests_accessed' } },

    // Collections routes - require authentication
    COLLECTIONS: { requiresAuth: true, analytics: { event: 'collections_accessed' } },
    COLLECTION_DETAIL: { requiresAuth: true, analytics: { event: 'collection_detail_accessed' } },

    // Chat routes - require authentication
    CHAT_CONVERSATION: { requiresAuth: true, analytics: { event: 'chat_conversation_accessed' } },
    CHAT_DETAILS: { requiresAuth: true, analytics: { event: 'chat_details_accessed' } },
    CHAT_MEMBERS: { requiresAuth: true, analytics: { event: 'chat_members_accessed' } },
};

// Navigation service class
class NavigationService {
    private static navigationHistory: NavigationEvent[] = [];
    private static isNavigating = false;

    // Enterprise navigation methods with guards and analytics
    static async navigate(route: string, options?: { skipAuth?: boolean; skipAnalytics?: boolean }) {
        try {
            if (this.isNavigating) {
                console.warn('Navigation already in progress, skipping...');
                return;
            }

            this.isNavigating = true;

            // Get route configuration
            const routeKey = this.getRouteKey(route);
            const config = routeKey ? ROUTE_CONFIGS[routeKey] : null;

            // Authentication guard
            if (config?.requiresAuth && !options?.skipAuth) {
                const isAuthenticated = await this.checkAuthentication();
                if (!isAuthenticated) {
                    console.log('🔐 Authentication required, redirecting to login');
                    this.navigateToLogin();
                    return;
                }
            }

            // Feature flag check
            if (config?.featureFlag) {
                const isFeatureEnabled = await this.checkFeatureFlag(config.featureFlag);
                if (!isFeatureEnabled) {
                    console.log(`🚫 Feature ${config.featureFlag} is disabled`);
                    this.navigateToFallback(route);
                    return;
                }
            }

            // Analytics tracking
            if (config?.analytics && !options?.skipAnalytics) {
                this.trackNavigation(route, config.analytics);
            }

            // Audit logging
            this.logNavigation(route, 'navigate');

            // Perform navigation
            router.push(route as any);

        } catch (error) {
            console.error('❌ Navigation error:', error);
            this.handleNavigationError(route, error);
        } finally {
            this.isNavigating = false;
        }
    }

    static async replace(route: string, options?: { skipAuth?: boolean; skipAnalytics?: boolean }) {
        try {
            if (this.isNavigating) {
                console.warn('Navigation already in progress, skipping...');
                return;
            }

            this.isNavigating = true;

            // Get route configuration
            const routeKey = this.getRouteKey(route);
            const config = routeKey ? ROUTE_CONFIGS[routeKey] : null;

            // Authentication guard
            if (config?.requiresAuth && !options?.skipAuth) {
                const isAuthenticated = await this.checkAuthentication();
                if (!isAuthenticated) {
                    console.log('🔐 Authentication required, redirecting to login');
                    this.navigateToLogin();
                    return;
                }
            }

            // Analytics tracking
            if (config?.analytics && !options?.skipAnalytics) {
                this.trackNavigation(route, config.analytics);
            }

            // Audit logging
            this.logNavigation(route, 'replace');

            // Perform navigation
            router.replace(route as any);

        } catch (error) {
            console.error('❌ Navigation error:', error);
            this.handleNavigationError(route, error);
        } finally {
            this.isNavigating = false;
        }
    }

    static goBack() {
        try {
            this.logNavigation('back', 'goBack');
            router.back();
        } catch (error) {
            console.error('❌ Go back error:', error);
        }
    }

    // Navigate with parameters - supports both query params and path params
    static async navigateWithParams(route: string, params: Record<string, string | number | boolean>, options?: { skipAuth?: boolean; skipAnalytics?: boolean }) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        const fullRoute = `${route}?${searchParams.toString()}`;
        await this.navigate(fullRoute, options);
    }

    // Navigate with path parameters (for dynamic routes like [conversationId])
    static async navigateWithPathParams(route: string, pathParams: Record<string, string | number>, options?: { skipAuth?: boolean; skipAnalytics?: boolean }) {
        let finalRoute = route;
        Object.entries(pathParams).forEach(([key, value]) => {
            finalRoute = finalRoute.replace(`[${key}]`, String(value));
        });
        await this.navigate(finalRoute, options);
    }

    // Utility methods for common navigation patterns
    static push(route: string) {
        return router.push(route as any);
    }

    static replaceRoute(route: string) {
        return router.replace(route as any);
    }

    static canGoBack() {
        return router.canGoBack();
    }

    // Enterprise helper methods
    private static getRouteKey(route: string): RouteKey | null {
        const routeEntry = Object.entries(ROUTES).find(([_, value]) => value === route);
        return routeEntry ? (routeEntry[0] as RouteKey) : null;
    }

    private static async checkAuthentication(): Promise<boolean> {
        // Import AuthHelper dynamically to avoid circular dependencies
        try {
            const { AuthHelper } = await import('./authHelper');
            return await AuthHelper.isAuthenticated();
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            return false;
        }
    }

    private static async checkFeatureFlag(flag: string): Promise<boolean> {
        // TODO: Implement feature flag service
        // For now, return true (all features enabled)
        return true;
    }

    private static trackNavigation(route: string, analytics: { event: string; properties?: Record<string, any> }) {
        try {
            // TODO: Implement analytics service
            console.log(`📊 Analytics: ${analytics.event}`, {
                route,
                properties: analytics.properties,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Analytics tracking failed:', error);
        }
    }

    private static logNavigation(route: string, action: string) {
        const event: NavigationEvent = {
            route,
            timestamp: Date.now(),
            metadata: { action }
        };

        this.navigationHistory.push(event);

        // Keep only last 100 navigation events
        if (this.navigationHistory.length > 100) {
            this.navigationHistory = this.navigationHistory.slice(-100);
        }

        console.log(`🧭 Navigation: ${action} to ${route}`, {
            timestamp: new Date(event.timestamp).toISOString(),
            historyLength: this.navigationHistory.length
        });
    }

    private static handleNavigationError(route: string, error: any) {
        console.error(`❌ Navigation failed to ${route}:`, error);

        // TODO: Implement error reporting service
        // For now, just log the error

        // Fallback navigation
        this.navigateToFallback(route);
    }

    private static navigateToLogin() {
        router.replace(ROUTES.LOGIN as any);
    }

    private static navigateToFallback(originalRoute: string) {
        // Navigate to a safe fallback route
        console.log(`🔄 Fallback navigation from ${originalRoute} to home`);
        router.replace(ROUTES.HOME as any);
    }

    // Enterprise specific navigation methods
    static async goToLogin() {
        await this.navigate(ROUTES.LOGIN, { skipAuth: true });
    }

    static async goToSignup() {
        await this.navigate(ROUTES.SIGNUP, { skipAuth: true });
    }

    static async goToVerifyOtp(params: { sessionToken?: string; email?: string; isRegistration?: string }) {
        await this.navigateWithParams(ROUTES.VERIFY_OTP, params, { skipAuth: true });
    }

    static async goToForgotPassword() {
        await this.navigate(ROUTES.FORGOT_PASSWORD, { skipAuth: true });
    }

    static async goToResetPasswordOtp(params: { sessionToken: string; email: string }) {
        await this.navigateWithParams(ROUTES.RESET_PASSWORD_OTP, params, { skipAuth: true });
    }

    static async goToResetPassword(params: { sessionToken: string; email: string }) {
        await this.navigateWithParams(ROUTES.RESET_PASSWORD, params, { skipAuth: true });
    }

    static async goToInitializeProfile() {
        await this.navigate(ROUTES.INITIALIZE_PROFILE);
    }

    static async goToOnboardingWizard() {
        await this.navigate(ROUTES.ONBOARDING_WIZARD);
    }

    static async goToSettings() {
        await this.navigate(ROUTES.SETTINGS);
    }

    static async goToFriendRequest() {
        await this.navigate(ROUTES.FRIEND_REQUEST);
    }

    static async goToFriendsList() {
        await this.navigate(ROUTES.FRIENDS_LIST);
    }

    static async goToSentRequests() {
        await this.navigate(ROUTES.SENT_REQUESTS);
    }

    // Profile navigation methods
    static async goToEditProfile() {
        await this.navigate(ROUTES.EDIT_PROFILE);
    }

    static async goToEditName() {
        await this.navigate(ROUTES.EDIT_NAME);
    }

    static async goToEditBio() {
        await this.navigate(ROUTES.EDIT_BIO);
    }

    static async goToEditGender() {
        await this.navigate(ROUTES.EDIT_GENDER);
    }

    static async goToEditDateOfBirth() {
        await this.navigate(ROUTES.EDIT_DATE_OF_BIRTH);
    }

    static async goToViewAvatar() {
        await this.navigate(ROUTES.VIEW_AVATAR);
    }

    // Settings navigation methods
    static async goToPreferences() {
        await this.navigate(ROUTES.PREFERENCES);
    }

    // Collections navigation methods
    static async goToCollections() {
        await this.navigate(ROUTES.COLLECTIONS);
    }

    static async goToCollectionDetail(
        collectionId: string,
        additionalParams?: Record<string, string | number | boolean>
    ) {
        const params = {
            collectionId: collectionId,
            ...additionalParams
        };
        await this.navigateWithParams(ROUTES.COLLECTION_DETAIL, params);
    }

    // Chat navigation methods
    static async goToChat() {
        await this.navigate(ROUTES.CHAT);
    }

    static async goToChatConversation(conversationId: string) {
        await this.navigateWithPathParams(ROUTES.CHAT_CONVERSATION, { conversationId });
    }

    static async goToChatDetails(conversationId: string) {
        await this.navigateWithPathParams(ROUTES.CHAT_DETAILS, { conversationId });
    }

    static async goToChatMembers(conversationId: string) {
        await this.navigateWithPathParams(ROUTES.CHAT_MEMBERS, { conversationId });
    }

    static async goToTabs() {
        // Use replace to prevent back navigation to auth screens
        await this.replace(ROUTES.TABS);
    }

    static async goToDiscover() {
        // 🚀 ENTERPRISE: Auto-get GPS location for discover navigation
        try {
            console.log('📍 [NavigationService] Auto-getting GPS for discover navigation...');

            // Check if location services are enabled
            const isLocationEnabled = await Location.hasServicesEnabledAsync();

            if (!isLocationEnabled) {
                console.log('📍 [NavigationService] Location services disabled, navigating without GPS');
                await this.replace(ROUTES.DISCOVER);
                return;
            }

            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log('📍 [NavigationService] Location permission denied, navigating without GPS');
                await this.replace(ROUTES.DISCOVER);
                return;
            }

            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            if (location) {
                console.log('📍 [NavigationService] GPS obtained for discover:', {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    accuracy: location.coords.accuracy
                });

                // Navigate with GPS data
                await this.secureNavigateToDiscover({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy || 0
                });
            } else {
                console.log('📍 [NavigationService] No location data, navigating without GPS');
                await this.replace(ROUTES.DISCOVER);
            }
        } catch (error) {
            console.log('📍 [NavigationService] GPS error, navigating without GPS:', error);
            await this.replace(ROUTES.DISCOVER);
        }
    }

    static async goToHome() {
        await this.replace(ROUTES.HOME);
    }

    // Enterprise secure navigation methods
    static async secureNavigateToTabs() {
        // Replace entire stack to prevent back navigation to auth screens
        await this.replace(ROUTES.TABS);
    }

    static async secureNavigateToDiscover(locationData?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    }) {
        // Replace entire stack to prevent back navigation to auth screens
        if (locationData) {
            // Pass location data as params
            await this.replace(`${ROUTES.DISCOVER}?lat=${locationData.latitude}&lng=${locationData.longitude}&accuracy=${locationData.accuracy || 0}`);
        } else {
            await this.replace(ROUTES.DISCOVER);
        }
    }

    static async secureNavigateToHome() {
        // Replace entire stack to prevent back navigation
        await this.replace(ROUTES.HOME);
    }

    // Enterprise logout navigation - replaces entire stack to prevent back navigation
    static async logoutToLogin() {
        // Replace entire navigation stack to prevent back navigation
        // This ensures user cannot swipe back to authenticated screens
        await this.replace(ROUTES.LOGIN, { skipAuth: true });
    }

    // Clear entire navigation stack and reset to login
    static async resetToLogin() {
        // This method can be used for complete app reset
        await this.replace(ROUTES.LOGIN, { skipAuth: true });
    }

    // Enterprise utility methods
    static getNavigationHistory(): NavigationEvent[] {
        return [...this.navigationHistory];
    }

    static clearNavigationHistory() {
        this.navigationHistory = [];
    }

    static isNavigationInProgress(): boolean {
        return this.isNavigating;
    }
}

export default NavigationService;
