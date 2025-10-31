import React, { useState } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'react-native';
import SignupPasswordInput from './SignupPasswordInput';
import ErrorMessage from './ErrorMessage';
import GradientButton from '../../../components/GradientButton';

interface ChangePasswordFormProps {
    onSubmit: (currentPassword: string, newPassword: string, confirmPassword: string) => void;
    loading?: boolean;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSubmit, loading = false }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [currentError, setCurrentError] = useState('');
    const [newError, setNewError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    const [focusCurrent, setFocusCurrent] = useState(false);
    const [focusNew, setFocusNew] = useState(false);
    const [focusConfirm, setFocusConfirm] = useState(false);

    const handleSubmit = () => {
        let valid = true;
        if (!currentPassword) { setCurrentError('Vui lòng nhập mật khẩu hiện tại'); valid = false; } else { setCurrentError(''); }
        if (!newPassword || newPassword.length < 8) { setNewError('Mật khẩu mới không hợp lệ'); valid = false; } else { setNewError(''); }
        if (!confirmPassword || confirmPassword !== newPassword) { setConfirmError('Xác nhận mật khẩu không khớp'); valid = false; } else { setConfirmError(''); }
        if (!valid) return;
        onSubmit(currentPassword, newPassword, confirmPassword);
    };

    return (
        <View style={{ width: '100%', paddingHorizontal: 10 }}>
            <View style={{ marginTop: 8 }}>
                <SignupPasswordInput
                    password={currentPassword}
                    onPasswordChange={(t) => { setCurrentPassword(t); if (currentError) setCurrentError(''); }}
                    onFocus={() => setFocusCurrent(true)}
                    onBlur={() => setFocusCurrent(false)}
                    isInputFocused={focusCurrent}
                    error={currentError}
                    placeholder={'Mật khẩu hiện tại'}
                />
                {currentError && !focusCurrent && <ErrorMessage>{currentError}</ErrorMessage>}
            </View>

            <View style={{ marginTop: 16 }}>
                <SignupPasswordInput
                    password={newPassword}
                    onPasswordChange={(t) => { setNewPassword(t); if (newError) setNewError(''); }}
                    onFocus={() => setFocusNew(true)}
                    onBlur={() => setFocusNew(false)}
                    isInputFocused={focusNew}
                    error={newError}
                    placeholder={'Mật khẩu mới'}
                />
                {newError && !focusNew && <ErrorMessage>{newError}</ErrorMessage>}
            </View>

            <View style={{ marginTop: 16 }}>
                <SignupPasswordInput
                    password={confirmPassword}
                    onPasswordChange={(t) => { setConfirmPassword(t); if (confirmError) setConfirmError(''); }}
                    onFocus={() => setFocusConfirm(true)}
                    onBlur={() => setFocusConfirm(false)}
                    isInputFocused={focusConfirm}
                    error={confirmError}
                    placeholder={'Xác nhận mật khẩu mới'}
                />
                {confirmError && !focusConfirm && <ErrorMessage>{confirmError}</ErrorMessage>}
            </View>

            <GradientButton
                title={loading ? 'Đang gửi...' : 'Đổi mật khẩu'}
                onPress={handleSubmit}
                disabled={!currentPassword || !newPassword || !confirmPassword || loading}
                className='mt-6'
                textFontSize={18}
            />
        </View>
    );
};

export default ChangePasswordForm;



