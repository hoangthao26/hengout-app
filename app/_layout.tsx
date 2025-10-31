

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import ToastContainer from '../components/ToastContainer';
import { ToastProvider } from '../contexts/ToastContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ErrorCategory, ErrorSeverity } from '../types/error';
import NotificationInitializer from '../components/NotificationInitializer';
import '../global.css';
import '../localizations/i18n';
import { AuthHelper } from '../services/authHelper';
import { globalErrorHandler, networkErrorHandler } from '../services/globalErrorHandler';
import { paymentFlowManager } from '../services/paymentFlowManager';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Dongle': require('../assets/fonts/Dongle-Regular.ttf'),
        'Dongle-Bold': require('../assets/fonts/Dongle-Bold.ttf'),
        'Dongle-Light': require('../assets/fonts/Dongle-Light.ttf'),
    });

    // Complete OAuth session when app returns from browser
    React.useEffect(() => {
        WebBrowser.maybeCompleteAuthSession();
        // Note: Authentication initialization is now handled in app/index.tsx (SplashScreen)
    }, []);

    // Handle deep linking for payment redirects (PaymentScreen handles payment deep links)
    React.useEffect(() => {
        const handleDeepLink = async (url: string) => {
            console.log('🔗 [DeepLink] Received URL:', url);

            // Payment deep links are handled by dedicated pages:
            // - hengout://payment-success -> payment-success.tsx
            // - hengout://payment-cancel -> payment-cancel.tsx
            // - hengout://payment-callback -> payment-callback.tsx
            // No need to handle them here as they have their own routes
            console.log('🔗 [DeepLink] Deep link received, letting router handle it');
        };

        // Handle initial URL if app was opened via deep link
        Linking.getInitialURL().then(async (url) => {
            if (url) {
                await handleDeepLink(url);
            }
        });

        // Handle URL changes while app is running
        const subscription = Linking.addEventListener('url', async ({ url }) => {
            await handleDeepLink(url);
        });

        return () => {
            subscription?.remove();
        };
    }, []);

    // Global error handler for authentication issues
    React.useEffect(() => {
        let tokenMonitoringInterval: NodeJS.Timeout | null = null;

        // Initialize app lifecycle manager for WebSocket handling
        const initializeAppLifecycle = async () => {
            try {
                const { appLifecycleManager } = await import('../services/appLifecycleManager');
                appLifecycleManager.initialize();
                console.log('[RootLayout] App lifecycle manager initialized');
            } catch (error) {
                console.error('❌ [RootLayout] Failed to initialize app lifecycle manager:', error);
            }
        };

        // Initialize notification manager
        const initializeNotificationManager = async () => {
            try {
                const { notificationManager } = await import('../services/notificationManager');
                // Note: Toast context and navigation will be initialized later when available
                console.log('🔔 [RootLayout] Notification manager imported');
            } catch (error) {
                console.error('❌ [RootLayout] Failed to import notification manager:', error);
            }
        };

        initializeAppLifecycle();
        initializeNotificationManager();

        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // Check authentication status when app becomes active
                try {
                    const isAuthenticated = await AuthHelper.isAuthenticated();
                    if (!isAuthenticated) {
                        console.log('🔐 User not authenticated, redirecting to login');
                        // AuthHelper will handle navigation automatically
                    } else {
                        // Start token monitoring if user is authenticated
                        if (!tokenMonitoringInterval) {
                            tokenMonitoringInterval = AuthHelper.startTokenMonitoring();
                        }

                        // ✅ OPTIMIZED: WebSocket reconnection is now handled by appLifecycleManager
                        // No need to handle WebSocket here to avoid conflicts
                    }
                } catch (error) {
                    console.error('❌ Auth check failed:', error);
                    // Report auth error to global handler
                    globalErrorHandler.reportError(
                        error as Error,
                        ErrorCategory.AUTH,
                        ErrorSeverity.HIGH,
                        {
                            component: 'RootLayout',
                            action: 'authCheck',
                            appState: nextAppState
                        }
                    );
                    // If auth check fails, assume user needs to login
                    await AuthHelper.logoutAndNavigate();
                }
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                // Stop token monitoring when app goes to background
                if (tokenMonitoringInterval) {
                    AuthHelper.stopTokenMonitoring(tokenMonitoringInterval);
                    tokenMonitoringInterval = null;
                }

                // ✅ OPTIMIZED: WebSocket disconnection is now handled by appLifecycleManager
                // No need to handle WebSocket here to avoid conflicts
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Start token monitoring on app launch if user is authenticated
        const initializeTokenMonitoring = async () => {
            try {
                const isAuthenticated = await AuthHelper.isAuthenticated();
                if (isAuthenticated && !tokenMonitoringInterval) {
                    tokenMonitoringInterval = AuthHelper.startTokenMonitoring();
                }
            } catch (error) {
                console.error('❌ Failed to initialize token monitoring:', error);
                // Report initialization error
                globalErrorHandler.reportError(
                    error as Error,
                    ErrorCategory.SYSTEM,
                    ErrorSeverity.MEDIUM,
                    {
                        component: 'RootLayout',
                        action: 'initializeTokenMonitoring'
                    }
                );
            }
        };

        initializeTokenMonitoring();

        return () => {
            subscription?.remove();
            if (tokenMonitoringInterval) {
                AuthHelper.stopTokenMonitoring(tokenMonitoringInterval);
            }
        };
    }, []);

    if (!fontsLoaded) return null;

    return (
        <ToastProvider>
            <NotificationInitializer>
                <ErrorBoundary
                    category={ErrorCategory.SYSTEM}
                    severity={ErrorSeverity.CRITICAL}
                    enableRecovery={true}
                    maxRetries={3}
                    onError={(error) => {
                        console.error('🚨 Root ErrorBoundary caught error:', error);
                        globalErrorHandler.reportError(
                            error.originalError || new Error(error.message),
                            error.category,
                            error.severity,
                            error.context
                        );
                    }}
                >
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <Stack screenOptions={{
                            headerShown: false,
                            gestureEnabled: true, // Enable swipe back by default
                            animation: 'slide_from_right'
                        }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="auth/login" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="auth/signup" />
                            <Stack.Screen name="auth/verify-otp" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="auth/forgot-password" />
                            <Stack.Screen name="auth/reset-password-otp" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="auth/reset-password" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="auth/initialize-profile" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="auth/onboarding-wizard" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="profile/edit-profile" />
                            <Stack.Screen name="profile/edit-name" />
                            <Stack.Screen name="profile/edit-bio" />
                            <Stack.Screen name="profile/edit-gender" />
                            <Stack.Screen name="profile/edit-date-of-birth" />
                            <Stack.Screen name="profile/view-avatar" />
                            <Stack.Screen name="friends/friend-request" />
                            <Stack.Screen name="friends/friends-list" />
                            <Stack.Screen name="friends/sent-requests" />
                            <Stack.Screen name="collections/collections" />
                            <Stack.Screen name="collections/collection-detail" />
                            <Stack.Screen name="settings/settings" />
                            <Stack.Screen name="settings/preferences" />
                            <Stack.Screen name="settings/gesture-test" />
                            <Stack.Screen name="settings/simple-gesture-test" />
                            <Stack.Screen name="settings/ultra-simple-test" />
                            <Stack.Screen name="payment-success" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="payment-cancel" options={{ gestureEnabled: false }} />
                            <Stack.Screen name="payment-callback" options={{ gestureEnabled: false }} />
                        </Stack>
                        <ToastContainer />
                    </GestureHandlerRootView>
                </ErrorBoundary>
            </NotificationInitializer>
        </ToastProvider>
    );
}



