import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, useColorScheme } from 'react-native';
import AuthBackButton from '../../components/AuthBackButton';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import SignupForm from '../../modules/auth/components/SignupForm';
import { authService } from '../../services';
import NavigationService from '../../services/navigationService';

export default function SignupScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();

    const handleSignup = async (email: string, password: string, confirmPassword: string) => {
        setLoading(true);
        try {
            const response = await authService.registerSendOTP(email, password, confirmPassword);

            showSuccess('OTP sent successfully! Please check your email.',);

            // Navigate to OTP verification screen with session token
            NavigationService.goToVerifyOtp({
                sessionToken: response.data.sessionToken,
                email: email,
                isRegistration: 'true'
            });
        } catch (error: any) {
            console.error('[Signup] Signup failed:', error);
            showError(error.message || 'Please check your information and try again.',);
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = () => {
        // Navigate to login screen
        NavigationService.goToLogin();
    };

    return (
        <AuthErrorBoundary>
            <View style={{
                flex: 1,
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
                paddingHorizontal: 24,
                paddingTop: 60,
                maxWidth: 500,
                alignSelf: 'center',
                width: '100%'
            }}>
                <AuthBackButton onPress={() => router.back()} />
                <SignupForm
                    onSubmit={handleSignup}
                    onSignIn={handleSignIn}
                    loading={loading}
                />
            </View>
        </AuthErrorBoundary>
    );
}
