import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AuthHelper } from '../services/authHelper';
import { authService } from '../services/authService';
import { OnboardingService } from '../services/onboardingService';
import { profileService } from '../services/profileService';
import { refreshTokenManager } from '../services/refreshTokenManager';
import { sessionService } from '../services/sessionService';

// Types
export interface User {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    role: string;
}

export interface AuthState {
    // State
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    tokens: {
        accessToken: string | null;
        refreshToken: string | null;
    };
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, confirmPassword: string) => Promise<void>;
    verifyOTP: (sessionToken: string, otp: string) => Promise<void>;
    resendOTP: (sessionToken: string) => Promise<void>;
    googleSignIn: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshTokens: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (sessionToken: string, otp: string, newPassword: string) => Promise<void>;
    clearError: () => void;
    initializeAuth: () => Promise<void>;
    fetchUserProfile: () => Promise<void>;
    initializeUserServices: () => Promise<void>;
    fastLogout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            isAuthenticated: false,
            isLoading: false,
            user: null,
            tokens: {
                accessToken: null,
                refreshToken: null,
            },
            error: null,

            // Actions
            login: async (email: string, password: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await authService.loginUser(email, password);

                    // Store tokens
                    await AuthHelper.saveTokens({
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        tokenType: response.data.tokenType,
                        expiresIn: response.data.expiresIn,
                        expiresAt: Date.now() + response.data.expiresIn,
                        role: response.data.role,
                        onboardingComplete: response.data.onboardingComplete,
                    });

                    // Store onboarding status separately
                    await OnboardingService.setOnboardingStatus(response.data.onboardingComplete);

                    set({
                        isAuthenticated: true,
                        user: {
                            id: '', // Will be fetched from profile
                            email: '', // Will be fetched from profile
                            displayName: undefined,
                            avatarUrl: undefined,
                            role: response.data.role,
                        },
                        tokens: {
                            accessToken: response.data.accessToken,
                            refreshToken: response.data.refreshToken,
                        },
                        isLoading: false,
                    });

                    // 🚀 RESET LOGOUT FLAGS: Enable axios interceptor for new session
                    const { setLogoutMode, setUserLoggedOut, resetRefreshState } = await import('../config/axios');
                    setLogoutMode(false);
                    setUserLoggedOut(false);
                    resetRefreshState();

                    // Fetch user profile after successful login
                    await get().fetchUserProfile();

                    // 🚀 INITIALIZE SERVICES: Preload data for new user
                    await get().initializeUserServices();
                } catch (error: any) {
                    set({
                        error: error.message || 'Login failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            register: async (email: string, password: string, confirmPassword: string) => {
                try {
                    set({ isLoading: true, error: null });

                    await authService.registerSendOTP(email, password, confirmPassword);

                    set({ isLoading: false });
                } catch (error: any) {
                    set({
                        error: error.message || 'Registration failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            verifyOTP: async (sessionToken: string, otp: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await authService.registerVerifyOTP(sessionToken, otp);

                    // Store tokens
                    await AuthHelper.saveTokens({
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        tokenType: response.data.tokenType,
                        expiresIn: response.data.expiresIn,
                        expiresAt: Date.now() + response.data.expiresIn,
                        role: response.data.role,
                        onboardingComplete: response.data.onboardingComplete,
                    });

                    // Store onboarding status separately
                    await OnboardingService.setOnboardingStatus(response.data.onboardingComplete);

                    set({
                        isAuthenticated: true,
                        user: {
                            id: '', // Will be fetched from profile
                            email: '', // Will be fetched from profile
                            displayName: undefined,
                            avatarUrl: undefined,
                            role: response.data.role,
                        },
                        tokens: {
                            accessToken: response.data.accessToken,
                            refreshToken: response.data.refreshToken,
                        },
                        isLoading: false,
                    });

                    // 🚀 RESET LOGOUT FLAGS: Enable axios interceptor for new session
                    const { setLogoutMode, setUserLoggedOut, resetRefreshState } = await import('../config/axios');
                    setLogoutMode(false);
                    setUserLoggedOut(false);
                    resetRefreshState();

                    // Fetch user profile after successful OTP verification
                    await get().fetchUserProfile();

                    // 🚀 INITIALIZE SERVICES: Preload data for new user
                    await get().initializeUserServices();
                } catch (error: any) {
                    set({
                        error: error.message || 'OTP verification failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            resendOTP: async (sessionToken: string) => {
                try {
                    set({ isLoading: true, error: null });

                    await authService.registerResendOTP(sessionToken);

                    set({ isLoading: false });
                } catch (error: any) {
                    set({
                        error: error.message || 'Failed to resend OTP',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            googleSignIn: async (idToken: string) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await authService.googleOAuthLogin(idToken);

                    // Store tokens
                    await AuthHelper.saveTokens({
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken,
                        tokenType: response.data.tokenType,
                        expiresIn: response.data.expiresIn,
                        expiresAt: Date.now() + response.data.expiresIn,
                        role: response.data.role,
                        onboardingComplete: response.data.onboardingComplete,
                    });

                    // Store onboarding status separately
                    await OnboardingService.setOnboardingStatus(response.data.onboardingComplete);

                    set({
                        isAuthenticated: true,
                        user: {
                            id: '', // Will be fetched from profile
                            email: '', // Will be fetched from profile
                            displayName: undefined,
                            avatarUrl: undefined,
                            role: response.data.role,
                        },
                        tokens: {
                            accessToken: response.data.accessToken,
                            refreshToken: response.data.refreshToken,
                        },
                        isLoading: false,
                    });

                    // 🚀 RESET LOGOUT FLAGS: Enable axios interceptor for new session
                    const { setLogoutMode, setUserLoggedOut, resetRefreshState } = await import('../config/axios');
                    setLogoutMode(false);
                    setUserLoggedOut(false);
                    resetRefreshState();

                    // Fetch user profile after successful Google sign in
                    await get().fetchUserProfile();

                    // 🚀 INITIALIZE SERVICES: Preload data for new user
                    await get().initializeUserServices();
                } catch (error: any) {
                    set({
                        error: error.message || 'Google sign in failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    set({ isLoading: true, error: null });

                    // 🚀 SET LOGOUT FLAGS: Prevent infinite 401 loops
                    const { setLogoutMode, setUserLoggedOut, resetRefreshState } = await import('../config/axios');
                    setLogoutMode(true);
                    setUserLoggedOut(true);
                    resetRefreshState();

                    // 🚀 STOP REFRESH TOKEN MANAGER: Stop monitoring before logout
                    refreshTokenManager.stopMonitoring();

                    // 🚀 STOP CHAT SYNC SERVICE: Stop background sync to prevent 401 errors
                    const { chatSyncService } = await import('../services/chatSyncService');
                    chatSyncService.stopSync();

                    // 🚀 DISCONNECT WEBSOCKET: Disconnect WebSocket connection on logout
                    const { useChatStore: useChatStoreForDisconnect } = await import('./chatStore');
                    const chatStoreForDisconnect = useChatStoreForDisconnect.getState();
                    await chatStoreForDisconnect.disconnectWebSocket();

                    // Get refresh token from current store state (not SecureStore)
                    const currentState = get();
                    if (currentState.tokens.refreshToken) {
                        await sessionService.logoutUser(currentState.tokens.refreshToken);
                    }

                    // Clear stored tokens
                    await AuthHelper.clearTokens();

                    // Clear onboarding status
                    await OnboardingService.clearOnboardingStatus();

                    // Clear ProfileStore
                    const { useProfileStore } = await import('./profileStore');
                    const profileStore = useProfileStore.getState();
                    profileStore.clearProfile();

                    // Clear PreferencesStore
                    const { usePreferencesStore } = await import('./preferencesStore');
                    const preferencesStore = usePreferencesStore.getState();
                    preferencesStore.clearPreferences();

                    // 🚀 CLEAR CHAT DATA: Prevent showing old user's chat data
                    const { useChatStore: useChatStoreForReset } = await import('./chatStore');
                    const chatStoreForReset = useChatStoreForReset.getState();
                    chatStoreForReset.reset();

                    // 🚀 CLEAR FRIEND DATA: Prevent showing old user's friends
                    const { useFriendStore } = await import('./friendStore');
                    const friendStore = useFriendStore.getState();
                    friendStore.reset();

                    // 🚀 CLEAR COLLECTION DATA: Prevent showing old user's collections
                    const { useCollectionStore } = await import('./collectionStore');
                    const collectionStore = useCollectionStore.getState();
                    collectionStore.resetCollections();
                    collectionStore.resetCurrentCollection();

                    // 🚀 CLEAR SEARCH DATA: Prevent showing old user's search history
                    const { useSearchStore } = await import('./searchStore');
                    const searchStore = useSearchStore.getState();
                    searchStore.clearSearch();

                    // 🚀 CLEAR DATABASE: Clear all local database data (like WhatsApp/Telegram)
                    try {
                        const { databaseService } = await import('../services/databaseService');
                        await databaseService.clearAllData();
                        // Database cleared successfully
                    } catch (dbError) {
                        console.error('❌ [AuthStore] Failed to clear database:', dbError);
                        // Don't throw - database clear failure shouldn't block logout
                    }

                    // 🚀 RESET APP STORE: Reset initialization state for fresh start
                    const { useAppStore } = await import('./appStore');
                    const appStore = useAppStore.getState();
                    appStore.setDatabaseReady(false);
                    appStore.setAuthReady(false);
                    appStore.setLocationReady(false);
                    appStore.setServicesReady(false);
                    appStore.setChatDataPreloaded(false);
                    appStore.setAppReady(false);
                    appStore.setInitializationError(null);

                    set({
                        isAuthenticated: false,
                        user: null,
                        tokens: {
                            accessToken: null,
                            refreshToken: null,
                        },
                        isLoading: false,
                    });
                } catch (error: any) {
                    set({
                        error: error.message || 'Logout failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            // 🚀 OPTIMISTIC LOGOUT: Fast logout for better UX
            fastLogout: async () => {
                try {
                    // Starting fast logout

                    // 🚀 IMMEDIATE STATE CLEAR: Clear UI state first
                    set({
                        isAuthenticated: false,
                        user: null,
                        tokens: {
                            accessToken: null,
                            refreshToken: null,
                        },
                        isLoading: false,
                        error: null,
                    });

                    // 🚀 BACKGROUND CLEANUP: Clear data without blocking UI
                    setTimeout(async () => {
                        try {
                            // Set logout flags
                            const { setLogoutMode, setUserLoggedOut, resetRefreshState } = await import('../config/axios');
                            setLogoutMode(true);
                            setUserLoggedOut(true);
                            resetRefreshState();

                            // Stop services
                            refreshTokenManager.stopMonitoring();
                            const { chatSyncService } = await import('../services/chatSyncService');
                            chatSyncService.stopSync();

                            // 🚀 DISCONNECT WEBSOCKET: Disconnect WebSocket connection on fast logout
                            const { useChatStore: useChatStoreForFastDisconnect } = await import('./chatStore');
                            const chatStoreForFastDisconnect = useChatStoreForFastDisconnect.getState();
                            await chatStoreForFastDisconnect.disconnectWebSocket();

                            // Clear tokens and data
                            await AuthHelper.clearTokens();
                            await OnboardingService.clearOnboardingStatus();

                            // Clear all stores
                            const { useProfileStore } = await import('./profileStore');
                            const { usePreferencesStore } = await import('./preferencesStore');
                            const { useChatStore: useChatStoreForFastReset } = await import('./chatStore');
                            const { useFriendStore } = await import('./friendStore');
                            const { useCollectionStore } = await import('./collectionStore');
                            const { useSearchStore } = await import('./searchStore');
                            const { useAppStore } = await import('./appStore');

                            useProfileStore.getState().clearProfile();
                            usePreferencesStore.getState().clearPreferences();
                            useChatStoreForFastReset.getState().reset();
                            useFriendStore.getState().reset();
                            useCollectionStore.getState().resetCollections();
                            useCollectionStore.getState().resetCurrentCollection();
                            useSearchStore.getState().clearSearch();

                            // CLEAR DATABASE: Clear all local database data 
                            try {
                                const { databaseService } = await import('../services/databaseService');
                                await databaseService.clearAllData();
                                // Database cleared successfully (fast logout)
                            } catch (dbError) {
                                console.error('❌ [AuthStore] Failed to clear database (fast logout):', dbError);
                                // Don't throw - database clear failure shouldn't block logout
                            }

                            const appStore = useAppStore.getState();
                            appStore.setDatabaseReady(false);
                            appStore.setAuthReady(false);
                            appStore.setLocationReady(false);
                            appStore.setServicesReady(false);
                            appStore.setChatDataPreloaded(false);
                            appStore.setAppReady(false);
                            appStore.setInitializationError(null);

                            // Fast logout completed
                        } catch (error: any) {
                            console.error('❌ [AuthStore] Background logout cleanup failed:', error);
                        }
                    }, 100);

                } catch (error: any) {
                    console.error('❌ [AuthStore] Fast logout failed:', error);
                    throw error;
                }
            },

            refreshTokens: async () => {
                // Starting token refresh

                // 🚀 DELEGATE TO REFRESH TOKEN MANAGER: With store update
                const success = await refreshTokenManager.performRefresh(true);

                if (success) {
                    console.log('✅ [AuthStore] Token refresh successful via RefreshTokenManager');
                } else {
                    console.log('❌ [AuthStore] Token refresh failed via RefreshTokenManager');
                    // Don't throw error - let RefreshTokenManager handle logout
                }
            },



            forgotPassword: async (email: string) => {
                try {
                    set({ isLoading: true, error: null });

                    await authService.forgotPasswordSendOTP(email);

                    set({ isLoading: false });
                } catch (error: any) {
                    set({
                        error: error.message || 'Failed to send reset email',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            resetPassword: async (sessionToken: string, otp: string, newPassword: string) => {
                try {
                    set({ isLoading: true, error: null });

                    await authService.forgotPasswordReset(sessionToken, newPassword, newPassword);

                    set({ isLoading: false });
                } catch (error: any) {
                    set({
                        error: error.message || 'Password reset failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            clearError: () => {
                set({ error: null });
            },

            initializeAuth: async () => {
                // ✅ GUARD: Prevent multiple initialization calls
                const currentState = get();
                if (currentState.isLoading) {
                    console.log('⏳ [AuthStore] Auth initialization already in progress, skipping...');
                    return;
                }

                try {
                    console.log('🔐 [AuthStore] Starting auth initialization...');
                    set({ isLoading: true });

                    const storedTokens = await AuthHelper.getTokens();
                    // Stored tokens from SecureStore

                    if (storedTokens && storedTokens.accessToken) {
                        console.log('✅ [AuthStore] Found stored tokens, checking validity...');

                        // 🔥 ENTERPRISE FEATURE: Smart Token Validation with Optimized Timing
                        const isTokenExpired = storedTokens.expiresIn <= 0;
                        const timeUntilExpiry = storedTokens.expiresIn;

                        // 🚀 STANDARDIZED TIMING: Consistent 5-minute proactive refresh
                        const CRITICAL_THRESHOLD = 2 * 60 * 1000; // 2 minutes - critical
                        const PROACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes - proactive refresh

                        if (isTokenExpired) {
                            console.log('⏰ [AuthStore] Token expired, attempting immediate refresh...');
                        } else if (timeUntilExpiry < CRITICAL_THRESHOLD) {
                            console.log('🚨 [AuthStore] Token expires in <2 minutes, refreshing immediately...');
                        } else if (timeUntilExpiry < PROACTIVE_THRESHOLD) {
                            console.log('⚠️ [AuthStore] Token expires in <5 minutes, refreshing proactively...');
                        } else {
                            console.log('✅ [AuthStore] Token still valid, using fast path');
                            // Token is still valid, set authenticated immediately
                            set({
                                isAuthenticated: true,
                                tokens: {
                                    accessToken: storedTokens.accessToken,
                                    refreshToken: storedTokens.refreshToken,
                                }
                            });
                            set({ isLoading: false });

                            get().fetchUserProfile().catch(error => {
                                console.log('⚠️ [AuthStore] Background profile fetch failed:', error);
                            });

                            await refreshTokenManager.startMonitoring();
                            return;
                        }

                        // Verify token is still valid by trying to refresh
                        try {
                            await get().refreshTokens();
                            await get().fetchUserProfile();
                            set({ isAuthenticated: true });

                            await refreshTokenManager.startMonitoring();
                        } catch (error) {
                            console.log('❌ [AuthStore] Token refresh failed:', error);
                            if ((error as any)?.response?.status === 401 || (error as any)?.message?.includes('401')) {
                                await AuthHelper.clearTokens();
                                set({
                                    isAuthenticated: false,
                                    user: null,
                                    tokens: {
                                        accessToken: null,
                                        refreshToken: null,
                                    },
                                });
                            } else {
                                console.log('🌐 [AuthStore] Network error - keeping tokens, will retry later');
                                // Keep user logged in for network errors
                                set({
                                    isAuthenticated: true,
                                    tokens: {
                                        accessToken: storedTokens.accessToken,
                                        refreshToken: storedTokens.refreshToken,
                                    }
                                });
                            }
                        }
                    } else {
                        console.log('❌ [AuthStore] No stored tokens found, user needs to login');
                        set({ isAuthenticated: false });
                    }

                    set({ isLoading: false });
                    console.log('🏁 [AuthStore] Auth initialization completed');
                } catch (error: any) {
                    console.log('💥 [AuthStore] Auth initialization error:', error);
                    set({
                        error: error.message || 'Auth initialization failed',
                        isLoading: false,
                    });
                }
            },

            fetchUserProfile: async () => {
                try {
                    const response = await profileService.getUserProfile();
                    const profileData = response.data;

                    // Update user data with profile information
                    const currentUser = get().user;
                    set({
                        user: {
                            id: currentUser?.id || '', // Keep existing id
                            email: currentUser?.email || '', // Keep existing email
                            displayName: profileData.displayName,
                            avatarUrl: profileData.avatarUrl,
                            role: currentUser?.role || 'USER',
                        },
                    });

                    // Also update ProfileStore to keep both stores in sync
                    // This ensures ProfileStore has the latest data without additional API calls
                    const { useProfileStore } = await import('./profileStore');
                    const profileStore = useProfileStore.getState();
                    profileStore.setProfile(profileData);
                } catch (error: any) {
                    console.error('Failed to fetch user profile:', error);
                    // Don't throw error here to avoid breaking auth flow
                }
            },

            initializeUserServices: async () => {
                try {
                    console.log('🚀 [AuthStore] Initializing services for new user...');

                    // Import initialization service
                    const { initializationService } = await import('../services/initializationService');

                    // Initialize services for the new user
                    await initializationService.initialize();

                    console.log('✅ [AuthStore] User services initialized successfully');
                } catch (error: any) {
                    console.error('❌ [AuthStore] Failed to initialize user services:', error);
                    // Don't throw error here to avoid breaking auth flow
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                tokens: state.tokens,
            }),
        }
    )
);

