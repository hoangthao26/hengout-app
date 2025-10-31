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
            console.log('Login successful:', response);
            console.log('Response data structure:', {
                accessToken: typeof response.data.accessToken,
                refreshToken: typeof response.data.refreshToken,
                tokenType: typeof response.data.tokenType,
                expiresIn: typeof response.data.expiresIn,
                role: typeof response.data.role,
                expiresInValue: response.data.expiresIn,
            });

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
                console.error('Failed to save tokens:', saveError);
                throw new Error(`Failed to save authentication tokens: ${saveError.message}`);
            }

            showSuccess('Login successful!',);

            // Centralized lightweight init after login (MVP)
            initializationService.initAfterLogin();

            // Check onboarding status from auth response
            if (response.data.onboardingComplete === false) {
                console.log('Onboarding not complete, redirecting to wizard');
                NavigationService.goToOnboardingWizard();
            } else {
                console.log('Onboarding complete, navigating to tabs');
                // Get current location before navigating
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        console.log('📍 [Login] GPS location obtained:', {
                            lat: location.coords.latitude,
                            lng: location.coords.longitude,
                            accuracy: location.coords.accuracy
                        });
                        NavigationService.secureNavigateToDiscover({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy || 0
                        });
                    } else {
                        console.log('📍 [Login] Location permission denied, using fallback');
                        NavigationService.secureNavigateToDiscover();
                    }
                } catch (error) {
                    console.log('📍 [Login] GPS error, using fallback:', error);
                    NavigationService.secureNavigateToDiscover();
                }
            }
        } catch (error: any) {
            console.log('Login failed:', error);
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
                    <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
                        <GradientText
                            style={{
                                fontSize: 120,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                fontFamily: 'Dongle',
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
