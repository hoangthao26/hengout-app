import React, { useState } from 'react';
import { View, useColorScheme } from 'react-native';
import AuthBackButton from '../../components/AuthBackButton';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services';
import GradientText from '../../components/GradientText';
import NavigationService from '../../services/navigationService';
import SetPasswordForm from '../../modules/auth/components/SetPasswordForm';

export default function SetPasswordScreen() {
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error } = useToast();

    const handleSubmit = async (password: string, confirmPassword: string) => {
        setLoading(true);
        try {
            const resp = await authService.setPassword(password, confirmPassword);
            success(resp?.message || 'Đặt mật khẩu thành công');
            // After setting password, go to onboarding wizard if needed
            NavigationService.goToOnboardingWizard();
        } catch (e: any) {
            error(e?.response?.data?.message || e?.message || 'Đặt mật khẩu thất bại');
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
                <AuthBackButton onPress={() => NavigationService.goBack()} />

                <View style={{ width: '100%', marginTop: 86, paddingHorizontal: 10 }}>
                    <GradientText
                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                        style={{ fontSize: 44, fontWeight: 'bold', textAlign: 'left' }}
                    >
                        Đặt mật khẩu
                    </GradientText>

                    <SetPasswordForm onSubmit={handleSubmit} loading={loading} />
                </View>
            </View>
        </AuthErrorBoundary>
    );
}



