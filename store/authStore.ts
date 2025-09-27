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
    scheduleProactiveRefresh: (timeUntilExpiry: number) => void;
    performProactiveRefresh: () => Promise<boolean>;
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

                    // Fetch user profile after successful login
                    await get().fetchUserProfile();
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

                    // Fetch user profile after successful OTP verification
                    await get().fetchUserProfile();
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

                    // Fetch user profile after successful Google sign in
                    await get().fetchUserProfile();
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

                    // 🚀 STOP REFRESH TOKEN MANAGER: Stop monitoring before logout
                    refreshTokenManager.stopMonitoring();

                    // Get refresh token from SecureStore instead of Zustand store
                    const storedTokens = await AuthHelper.getTokens();
                    if (storedTokens && storedTokens.refreshToken) {
                        await sessionService.logoutUser(storedTokens.refreshToken);
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

            refreshTokens: async () => {
                console.log('🔄 [AuthStore] Starting token refresh...');

                // 🚀 USE REFRESH TOKEN MANAGER: Delegate to consolidated service
                const success = await refreshTokenManager.performRefresh();

                if (success) {
                    console.log('✅ [AuthStore] Token refresh successful via RefreshTokenManager');

                    // Update Zustand store with new tokens
                    const newTokens = await AuthHelper.getTokens();
                    if (newTokens) {
                        set({
                            tokens: {
                                accessToken: newTokens.accessToken,
                                refreshToken: newTokens.refreshToken,
                            }
                        });
                    }
                } else {
                    console.log('❌ [AuthStore] Token refresh failed via RefreshTokenManager');
                    throw new Error('Token refresh failed');
                }
            },

            // 🚀 OPTIMIZED PROACTIVE REFRESH: Smart scheduling with retry logic
            scheduleProactiveRefresh: (timeUntilExpiry: number) => {
                const REFRESH_BEFORE_EXPIRY = 7 * 60 * 1000; // 7 minutes before expiry
                const scheduleTime = Math.max(0, timeUntilExpiry - REFRESH_BEFORE_EXPIRY);

                console.log('⏰ [AuthStore] Scheduling proactive refresh:', {
                    timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + ' seconds',
                    scheduleTime: Math.round(scheduleTime / 1000) + ' seconds',
                    refreshBeforeExpiry: Math.round(REFRESH_BEFORE_EXPIRY / 1000) + ' seconds'
                });

                setTimeout(async () => {
                    console.log('🔄 [AuthStore] Executing scheduled proactive refresh...');
                    const success = await get().performProactiveRefresh();

                    if (!success) {
                        console.log('⚠️ [AuthStore] Proactive refresh failed, will fallback to lazy refresh');
                        // Fallback: Schedule another attempt closer to expiry
                        const fallbackTime = Math.max(0, timeUntilExpiry - (2 * 60 * 1000)); // 2 minutes before
                        setTimeout(() => {
                            get().performProactiveRefresh().catch(error => {
                                console.log('❌ [AuthStore] Fallback proactive refresh also failed:', error);
                            });
                        }, fallbackTime);
                    }
                }, scheduleTime);
            },

            // 🚀 ENHANCED PROACTIVE REFRESH: With retry logic and fallback
            performProactiveRefresh: async (): Promise<boolean> => {
                try {
                    console.log('🔄 [AuthStore] Performing proactive token refresh...');

                    // Check if token still needs refresh
                    const storedTokens = await AuthHelper.getTokens();
                    if (!storedTokens || !storedTokens.refreshToken) {
                        console.log('❌ [AuthStore] No tokens available for proactive refresh');
                        return false;
                    }

                    // Check if token is still close to expiry
                    if (storedTokens.expiresIn > 10 * 60 * 1000) { // More than 10 minutes left
                        console.log('✅ [AuthStore] Token still has plenty of time, skipping proactive refresh');
                        return true;
                    }

                    // Perform refresh with retry logic
                    const maxRetries = 2; // Fewer retries for proactive refresh
                    let lastError: any;

                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            console.log(`🔄 [AuthStore] Proactive refresh attempt ${attempt}/${maxRetries}...`);

                            const response = await sessionService.refreshToken(storedTokens.refreshToken);

                            // Save new tokens
                            await AuthHelper.saveTokens({
                                accessToken: response.data.accessToken,
                                refreshToken: response.data.refreshToken,
                                tokenType: response.data.tokenType,
                                expiresIn: response.data.expiresIn,
                                expiresAt: Date.now() + response.data.expiresIn,
                                role: response.data.role,
                            });

                            // Update store
                            set({
                                tokens: {
                                    accessToken: response.data.accessToken,
                                    refreshToken: response.data.refreshToken,
                                },
                            });

                            console.log('✅ [AuthStore] Proactive refresh successful');

                            // Schedule next proactive refresh
                            get().scheduleProactiveRefresh(response.data.expiresIn);

                            return true;
                        } catch (error: any) {
                            lastError = error;
                            console.log(`❌ [AuthStore] Proactive refresh attempt ${attempt} failed:`, error.message);

                            if (attempt < maxRetries) {
                                const waitTime = attempt * 2000; // 2s, 4s
                                console.log(`⏳ [AuthStore] Waiting ${waitTime / 1000} seconds before retry...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                            }
                        }
                    }

                    console.log('❌ [AuthStore] Proactive refresh failed after all retries:', lastError);
                    return false;
                } catch (error: any) {
                    console.error('❌ [AuthStore] Proactive refresh error:', error);
                    return false;
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
                try {
                    console.log('🔐 [AuthStore] Starting auth initialization...');
                    set({ isLoading: true });

                    const storedTokens = await AuthHelper.getTokens();
                    console.log('🔑 [AuthStore] Stored tokens from SecureStore:', {
                        hasAccessToken: !!storedTokens?.accessToken,
                        hasRefreshToken: !!storedTokens?.refreshToken,
                        accessTokenLength: storedTokens?.accessToken?.length || 0,
                        refreshTokenLength: storedTokens?.refreshToken?.length || 0,
                    });

                    if (storedTokens && storedTokens.accessToken) {
                        console.log('✅ [AuthStore] Found stored tokens, checking validity...');

                        // 🔥 ENTERPRISE FEATURE: Smart Token Validation with Optimized Timing
                        const isTokenExpired = storedTokens.expiresIn <= 0;
                        const timeUntilExpiry = storedTokens.expiresIn;

                        // 🚀 OPTIMIZED TIMING: More flexible refresh windows
                        const CRITICAL_THRESHOLD = 2 * 60 * 1000; // 2 minutes - critical
                        const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes - warning
                        const PROACTIVE_THRESHOLD = 10 * 60 * 1000; // 10 minutes - proactive

                        if (isTokenExpired) {
                            console.log('⏰ [AuthStore] Token expired, attempting immediate refresh...');
                        } else if (timeUntilExpiry < CRITICAL_THRESHOLD) {
                            console.log('🚨 [AuthStore] Token expires in <2 minutes, refreshing immediately...');
                        } else if (timeUntilExpiry < WARNING_THRESHOLD) {
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
                    set({
                        user: {
                            id: '', // Profile doesn't have id
                            email: '', // Profile doesn't have email
                            displayName: profileData.displayName,
                            avatarUrl: profileData.avatarUrl,
                            role: get().user?.role || 'USER',
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