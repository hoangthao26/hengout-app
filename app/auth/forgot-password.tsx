import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, useColorScheme } from 'react-native';
import AuthBackButton from '../../components/AuthBackButton';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import ForgotPasswordForm from '../../modules/auth/components/ForgotPasswordForm';
import { authService } from '../../services';
import NavigationService from '../../services/navigationService';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSendResetOTP = async (email: string) => {
        setLoading(true);
        try {
            const response = await authService.forgotPasswordSendOTP(email);

            showSuccess('Reset OTP sent to your email',);

            // Navigate to verify reset OTP screen with secure navigation
            NavigationService.goToResetPasswordOtp({
                email: email,
                sessionToken: response.data.sessionToken
            });
        } catch (error: any) {
            console.error('[ForgotPassword] Failed to send reset OTP:', error);
            showError(error.message || 'Failed to send reset OTP. Please try again.',);
        } finally {
            setLoading(false);
        }
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
                <ForgotPasswordForm
                    onSubmit={handleSendResetOTP}
                    loading={loading}
                />
            </View>
        </AuthErrorBoundary>
    );
}
