import AuthBackButton from '@/components/AuthBackButton';
import ResetPasswordForm from '@/modules/auth/components/ResetPasswordForm';
import { AuthErrorBoundary } from '@/components/errorBoundaries';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services';
import NavigationService from '../../services/navigationService';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams();
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();

    const sessionToken = params.sessionToken as string;

    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (password: string, confirmPassword: string) => {
        setLoading(true);
        try {
            const response = await authService.forgotPasswordReset(sessionToken, password, confirmPassword);
            console.log('Password reset successful:', response);

            showSuccess('Password reset successfully! Please login with your new password.',);

            // Navigate to login screen with secure navigation
            NavigationService.logoutToLogin();
        } catch (error: any) {
            console.error('Password reset failed:', error);
            showError(error.message || 'Failed to reset password. Please try again.',);
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
                <ResetPasswordForm
                    onSubmit={handleResetPassword}
                    loading={loading}
                />
            </View>
        </AuthErrorBoundary>
    );
}
