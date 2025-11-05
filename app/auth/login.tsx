import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, useColorScheme, View } from 'react-native';
import * as Location from 'expo-location';
// import AuthBackButton from '../../components/AuthBackButton'; // REMOVED: No back button on login screen
import GradientText from '../../components/GradientText';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import EmailLoginForm from '../../modules/auth/components/EmailLoginForm';
import { AuthHelper, authService } from '../../services';
import NavigationService from '../../services/navigationService';
import { initializationService } from '../../services/initializationService';

export default function LoginScreen() {
    const router = useRouter();
    // const { t } = useTranslation();
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleLogin = async (email: string, password: string) => {
        setLoading(true);
        try {
            const response = await authService.loginUser(email, password);

            // Validate response structure
            if (!response.data || !response.data.accessToken || !response.data.refreshToken) {
                throw new Error('Invalid response structure from server');
            }

            // Save tokens to secure storage (including onboardingComplete)
            try {
                await AuthHelper.saveTokens({
                    accessToken: response.data.accessToken,
                    refreshToken: response.data.refreshToken,
                    tokenType: response.data.tokenType || 'Bearer',
                    expiresIn: response.data.expiresIn,
                    expiresAt: Date.now() + response.data.expiresIn,
                    role: response.data.role || '',
                    onboardingComplete: response.data.onboardingComplete, // Save onboarding status
                });
            } catch (saveError: any) {
                console.error('[Login] Failed to save tokens:', saveError);
                throw new Error(`Failed to save authentication tokens: ${saveError.message}`);
            }

            showSuccess('Login successful!',);

            // Centralized lightweight init after login (MVP)
            initializationService.initAfterLogin();

            // Check onboarding status from auth response
            if (response.data.onboardingComplete === false) {
                NavigationService.goToOnboardingWizard();
            } else {
                // Best Practice: Don't request location permission after login
                // Let user request it when they need it in Discover screen
                // Just check if permission already exists, if yes try to get location
                try {
                    const { status } = await Location.getForegroundPermissionsAsync();
                    if (status === 'granted') {
                        // Permission already granted, try to get location (no request)
                        try {
                            const location = await Location.getCurrentPositionAsync({
                                accuracy: Location.Accuracy.Balanced,
                            });
                            NavigationService.secureNavigateToDiscover({
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                                accuracy: location.coords.accuracy || 0
                            });
                            return;
                        } catch (locationError) {
                            // Location unavailable, navigate without location
                        }
                    }
                    // No permission or location unavailable - navigate without location
                    NavigationService.secureNavigateToDiscover();
                } catch (error) {
                    // Navigate without location
                    NavigationService.secureNavigateToDiscover();
                }
            }
        } catch (error: any) {
            console.error('[Login] Login failed:', error);
            showError('Đăng nhập thất bại', error.message || 'Vui lòng kiểm tra thông tin đăng nhập và thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Google login is now handled by LoginWithGoogle component
    // No need for separate function

    const handleForgotPassword = () => {
        // Navigate to forgot password screen
        NavigationService.goToForgotPassword();
    };

    const handleSignUp = () => {
        // Navigate to signup screen
        NavigationService.goToSignup();
    };

    return (
        <AuthErrorBoundary>
            <KeyboardAvoidingView
                style={{
                    flex: 1,
                    backgroundColor: isDark ? '#000000' : '#FFFFFF'
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={{
                    flex: 1,
                    paddingHorizontal: 24,
                    paddingTop: 60,
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    maxWidth: 500,
                    alignSelf: 'center',
                    width: '100%'
                }}>
                    {/* REMOVED: No back button on login screen */}

                    {/* Logo Section - Reduced spacing */}
                    <View style={{ alignItems: 'center', marginTop: 64, marginBottom: 32 }}>
                        <GradientText
                            style={{
                                fontSize: 90,
                                fontWeight: 'bold',
                                textAlign: 'center',
                            }}
                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                        >
                            Hengout
                        </GradientText>
                    </View>

                    {/* Login Form Section */}
                    <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 20 }}>
                        <EmailLoginForm
                            onSubmit={handleLogin}
                            onForgotPassword={handleForgotPassword}
                            onSignUp={handleSignUp}
                            loading={loading}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </AuthErrorBoundary>
    );
}
