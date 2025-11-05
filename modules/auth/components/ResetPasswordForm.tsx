import React, { useState } from 'react';
import { View, Text, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import GradientButton from '../../../components/GradientButton';
import { useTranslation } from 'react-i18next';
import GradientText from '../../../components/GradientText';
import SignupPasswordInput from './SignupPasswordInput';
import ErrorMessage from './ErrorMessage';
import { validatePassword, validateConfirmPassword } from '../validations/authSchema';

interface ResetPasswordFormProps {
    onSubmit: (password: string, confirmPassword: string) => void;
    loading?: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
    onSubmit,
    loading = false
}) => {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

    const validateForm = (): boolean => {
        let isValid = true;

        // Validate password
        if (!password) {
            setPasswordError(t('invalid_password'));
            isValid = false;
        } else if (!validatePassword(password)) {
            setPasswordError(t('invalid_password'));
            isValid = false;
        } else {
            setPasswordError('');
        }

        // Validate confirm password
        if (!confirmPassword) {
            setConfirmPasswordError(t('password_mismatch'));
            isValid = false;
        } else if (!validateConfirmPassword(password, confirmPassword)) {
            setConfirmPasswordError(t('password_mismatch'));
            isValid = false;
        } else {
            setConfirmPasswordError('');
        }

        return isValid;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(password, confirmPassword);
        }
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (passwordError) {
            setPasswordError('');
        }
        // Re-validate confirm password if it exists
        if (confirmPassword && !validateConfirmPassword(text, confirmPassword)) {
            setConfirmPasswordError(t('password_mismatch'));
        } else if (confirmPasswordError) {
            setConfirmPasswordError('');
        }
    };

    const handleConfirmPasswordChange = (text: string) => {
        setConfirmPassword(text);
        if (confirmPasswordError) {
            setConfirmPasswordError('');
        }
        // Re-validate confirm password
        if (password && !validateConfirmPassword(password, text)) {
            setConfirmPasswordError(t('password_mismatch'));
        } else if (confirmPasswordError) {
            setConfirmPasswordError('');
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
                <View style={{ width: '100%', marginTop: 86, paddingHorizontal: 10 }}>
                    <GradientText
                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                        style={{ fontSize: 64, fontWeight: 'bold', textAlign: 'left', marginTop: 0 }}
                    >
                        {t('reset_password')}
                    </GradientText>
                    <Text
                        style={{
                            color: isDark ? '#FFFFFF' : '#000000',
                            fontSize: 18,
                            lineHeight: 36,
                            textAlign: 'left',
                            marginBottom: 32,
                            marginTop: 0
                        }}
                    >
                        {t('enter_new_password')}
                    </Text>

                    {/* Password Input */}
                    <View style={{ marginTop: 16 }}>
                        <SignupPasswordInput
                            password={password}
                            onPasswordChange={handlePasswordChange}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                            isInputFocused={isPasswordFocused}
                            error={passwordError}
                            placeholder={t('new_password')}
                        />
                        {passwordError && !isPasswordFocused && <ErrorMessage>{passwordError}</ErrorMessage>}
                    </View>

                    {/* Confirm Password Input */}
                    <View style={{ marginTop: 16 }}>
                        <SignupPasswordInput
                            password={confirmPassword}
                            onPasswordChange={handleConfirmPasswordChange}
                            onFocus={() => setIsConfirmPasswordFocused(true)}
                            onBlur={() => setIsConfirmPasswordFocused(false)}
                            isInputFocused={isConfirmPasswordFocused}
                            error={confirmPasswordError}
                            placeholder={t('confirm_new_password')}
                        />
                        {confirmPasswordError && !isConfirmPasswordFocused && <ErrorMessage>{confirmPasswordError}</ErrorMessage>}
                    </View>

                    {/* Reset Password Button */}
                    <GradientButton
                        title={loading ? t('resetting') : t('reset_password')}
                        onPress={handleSubmit}
                        disabled={!password || !confirmPassword || loading}
                        className='mt-6'
                        textFontSize={18}
                    />


                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default ResetPasswordForm;
