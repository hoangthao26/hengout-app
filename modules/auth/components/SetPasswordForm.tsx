import React, { useState } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'react-native';
import SignupPasswordInput from './SignupPasswordInput';
import ErrorMessage from './ErrorMessage';
import GradientButton from '../../../components/GradientButton';

interface SetPasswordFormProps {
    onSubmit: (password: string, confirmPassword: string) => void;
    loading?: boolean;
}

export const SetPasswordForm: React.FC<SetPasswordFormProps> = ({ onSubmit, loading = false }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [focusPassword, setFocusPassword] = useState(false);
    const [focusConfirm, setFocusConfirm] = useState(false);

    const handleSubmit = () => {
        let valid = true;
        if (!password || password.length < 8) { setPasswordError('Mật khẩu phải từ 8 ký tự'); valid = false; } else { setPasswordError(''); }
        if (!confirmPassword || confirmPassword !== password) { setConfirmError('Xác nhận mật khẩu không khớp'); valid = false; } else { setConfirmError(''); }
        if (!valid) return;
        onSubmit(password, confirmPassword);
    };

    return (
        <View style={{ width: '100%', paddingHorizontal: 10 }}>
            <View style={{ marginTop: 8 }}>
                <SignupPasswordInput
                    password={password}
                    onPasswordChange={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                    onFocus={() => setFocusPassword(true)}
                    onBlur={() => setFocusPassword(false)}
                    isInputFocused={focusPassword}
                    error={passwordError}
                    placeholder={'Mật khẩu mới'}
                />
                {passwordError && !focusPassword && <ErrorMessage>{passwordError}</ErrorMessage>}
            </View>

            <View style={{ marginTop: 16 }}>
                <SignupPasswordInput
                    password={confirmPassword}
                    onPasswordChange={(t) => { setConfirmPassword(t); if (confirmError) setConfirmError(''); }}
                    onFocus={() => setFocusConfirm(true)}
                    onBlur={() => setFocusConfirm(false)}
                    isInputFocused={focusConfirm}
                    error={confirmError}
                    placeholder={'Xác nhận mật khẩu'}
                />
                {confirmError && !focusConfirm && <ErrorMessage>{confirmError}</ErrorMessage>}
            </View>

            <GradientButton
                title={loading ? 'Đang gửi...' : 'Lưu mật khẩu'}
                onPress={handleSubmit}
                disabled={!password || !confirmPassword || loading}
                className='mt-6'
                textFontSize={18}
            />
        </View>
    );
};

export default SetPasswordForm;



