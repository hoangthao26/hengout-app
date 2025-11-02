import React, { useState } from 'react';
import { View, useColorScheme } from 'react-native';
import AuthBackButton from '../../components/AuthBackButton';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services';
import GradientText from '../../components/GradientText';
import NavigationService from '../../services/navigationService';
import ChangePasswordForm from '../../modules/auth/components/ChangePasswordForm';

export default function ChangePasswordScreen() {
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error } = useToast();
    const handleSubmit = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
        setLoading(true);
        try {
            const response = await authService.changePassword(currentPassword, newPassword, confirmPassword);
            const message = (response as any)?.message || 'Đổi mật khẩu thành công';
            success(message);
            NavigationService.goBack();
        } catch (e: any) {
            const message = e?.response?.data?.message || e?.message || 'Đổi mật khẩu thất bại';
            error(message);
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
                        style={{ fontSize: 72, fontWeight: 'bold', textAlign: 'left' }}
                    >
                        Đổi mật khẩu
                    </GradientText>
                    <ChangePasswordForm onSubmit={handleSubmit} loading={loading} />
                </View>
            </View>
        </AuthErrorBoundary>
    );
}


