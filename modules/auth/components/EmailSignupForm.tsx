import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import GradientButton from '../../../components/GradientButton';
import { useTranslation } from 'react-i18next';
import EmailInput from './EmailInput';
import SignupPasswordInput from './SignupPasswordInput';
import ErrorMessage from './ErrorMessage';
import { validateEmail, validatePassword, validatePasswordStrength } from '../validations/authSchema';

interface EmailSignupFormProps {
    onSubmit: (email: string, password: string, confirmPassword: string) => void;
    onSignIn: () => void;
    loading?: boolean;
}

const EmailSignupForm: React.FC<EmailSignupFormProps> = ({
    onSubmit,
    onSignIn,
    loading = false
}) => {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [emailError, setEmailError] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

    const validateForm = (): boolean => {
        let isValid = true;

        // Validate email
        if (!email) {
            setEmailError(t('invalid_email'));
            isValid = false;
        } else if (!validateEmail(email)) {
            setEmailError(t('invalid_email'));
            isValid = false;
        } else {
            setEmailError('');
        }

        // Validate password
        if (!password) {
            setPasswordError(t('invalid_password'));
            isValid = false;
        } else {
            const passwordValidation = validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                setPasswordError(passwordValidation.errors.join(', '));
                isValid = false;
            } else {
                setPasswordError('');
            }
        }

        // Validate confirm password
        if (!confirmPassword) {
            setConfirmPasswordError(t('password_mismatch'));
            isValid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError(t('password_mismatch'));
            isValid = false;
        } else {
            setConfirmPasswordError('');
        }

        return isValid;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(email, password, confirmPassword);
        }
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (emailError) {
            setEmailError('');
        }
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (passwordError) {
            setPasswordError('');
        }
    };

    const handleConfirmPasswordChange = (text: string) => {
        setConfirmPassword(text);
        if (confirmPasswordError) {
            setConfirmPasswordError('');
        }
    };

    return (
        <View style={{ width: '100%', paddingHorizontal: 16 }}>
            {/* Email Input */}
            <EmailInput
                email={email}
                onEmailChange={handleEmailChange}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                isInputFocused={isEmailFocused}
                error={emailError}
                placeholder={t('enter_email_placeholder')}
            />
            {emailError && !isEmailFocused && <ErrorMessage>{emailError}</ErrorMessage>}

            {/* Password Input */}
            <View style={{ marginTop: 16 }}>
                <SignupPasswordInput
                    password={password}
                    onPasswordChange={handlePasswordChange}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    isInputFocused={isPasswordFocused}
                    error={passwordError}
                    placeholder={t('enter_password_placeholder')}
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
                    placeholder={t('enter_confirm_password_placeholder')}
                />
                {confirmPasswordError && !isConfirmPasswordFocused && <ErrorMessage>{confirmPasswordError}</ErrorMessage>}
            </View>

            {/* Signup Button */}
            <GradientButton
                title={loading ? t('sending') : t('signup')}
                onPress={handleSubmit}
                disabled={!email || !password || !confirmPassword || loading}
                className='mt-6'
                textFontSize={18}
            />

            {/* Sign In Link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
                <Text style={{
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    fontSize: 16,
                    fontFamily: 'System',
                    fontWeight: '400'
                }}>
                    {t('already_have_account')}
                </Text>
                <TouchableOpacity onPress={onSignIn} style={{ marginLeft: 4 }}>
                    <Text style={{
                        color: '#F48C06',
                        fontSize: 16,
                        fontFamily: 'System',
                        fontWeight: '600'
                    }}>
                        {t('sign_in')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default EmailSignupForm;
