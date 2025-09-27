import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, useColorScheme, View } from 'react-native';
import AuthBackButton from '../../components/AuthBackButton';
import GradientText from '../../components/GradientText';
import { useToast } from '../../contexts/ToastContext';
import EmailLoginForm from '../../modules/auth/components/EmailLoginForm';
import { AuthHelper, authService } from '../../services';
import { googleOAuthService } from '../../services/googleOAuthService';
import NavigationService from '../../services/navigationService';

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

            // Check onboarding status from auth response
            if (response.data.onboardingComplete === false) {
                console.log('Onboarding not complete, redirecting to wizard');
                NavigationService.goToOnboardingWizard();
            } else {
                console.log('Onboarding complete, navigating to tabs');
                NavigationService.secureNavigateToDiscover();
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            showError('Đăng nhập thất bại', error.message || 'Vui lòng kiểm tra thông tin đăng nhập và thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            console.log('🚀 Starting Google OAuth...');
            showInfo('Opening Google OAuth...',);

            // Start Google OAuth flow
            const result = await googleOAuthService.signIn();

            if (result.success && result.data) {
                console.log('✅ Google OAuth successful:', result.data);
                showSuccess('Google login successful!',);

                // Check onboarding status from auth response
                if (result.data.onboardingComplete === false) {
                    console.log('Onboarding not complete, redirecting to wizard');
                    NavigationService.goToOnboardingWizard();
                } else {
                    console.log('Onboarding complete, navigating to tabs');
                    NavigationService.secureNavigateToDiscover();
                }
            } else {
                console.log('❌ Google OAuth failed:', result.error);
                showError('Đăng nhập Google thất bại', result.error || 'Không thể đăng nhập bằng Google');
            }
        } catch (error: any) {
            console.error('❌ Google OAuth error:', error);
            showError('Lỗi Google OAuth', `Đăng nhập Google thất bại: ${error.message}`);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleForgotPassword = () => {
        // Navigate to forgot password screen
        NavigationService.goToForgotPassword();
    };

    const handleSignUp = () => {
        // Navigate to signup screen
        NavigationService.goToSignup();
    };

    return (
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
                <AuthBackButton onPress={() => NavigationService.goToHome()} />

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
                        onGoogleSignIn={handleGoogleSignIn}
                        onForgotPassword={handleForgotPassword}
                        onSignUp={handleSignUp}
                        loading={loading}
                        googleLoading={googleLoading}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
