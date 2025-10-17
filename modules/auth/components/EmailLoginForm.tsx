import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import GradientButton from '../../../components/GradientButton';
import { validateEmail, validatePassword } from '../validations/authSchema';
import EmailInput from './EmailInput';
import ErrorMessage from './ErrorMessage';
import GoogleButton from './GoogleButton';
import LoginPasswordInput from './LoginPasswordInput';

interface EmailLoginFormProps {
    onSubmit: (email: string, password: string) => void;
    onGoogleSignIn: () => void;
    onForgotPassword: () => void;
    onSignUp: () => void;
    loading?: boolean;
    googleLoading?: boolean;
}

const EmailLoginForm: React.FC<EmailLoginFormProps> = ({
    onSubmit,
    onGoogleSignIn,
    onForgotPassword,
    onSignUp,
    loading = false,
    googleLoading = false
}) => {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [emailError, setEmailError] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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
        } else if (!validatePassword(password)) {
            setPasswordError(t('invalid_password'));
            isValid = false;
        } else {
            setPasswordError('');
        }

        return isValid;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(email, password);
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
                <LoginPasswordInput
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

            {/* Forgot Password Link */}
            <TouchableOpacity onPress={onForgotPassword} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
                <Text style={{
                    color: '#F48C06',
                    fontSize: 16,
                    fontFamily: 'System',
                    fontWeight: '500',
                    textDecorationLine: 'underline'
                }}>
                    {t('forgot_password')}
                </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <GradientButton
                title={loading ? t('sending') : t('login')}
                onPress={handleSubmit}
                disabled={!email || !password || loading}
                className='mt-6'
                textFontSize={18}
            />

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#374151' : '#E5E7EB' }} />
                <Text style={{
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    fontSize: 16,
                    fontFamily: 'System',
                    fontWeight: '400',
                    marginHorizontal: 16
                }}>
                    {t('or')}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#374151' : '#E5E7EB' }} />
            </View>

            {/* Google Sign In Button */}
            <GoogleButton
                title={t('google_signin')}
                onPress={onGoogleSignIn}
                loading={googleLoading}
                disabled={loading}
            />

            {/* Sign Up Link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
                <Text style={{
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    fontSize: 16,
                    fontFamily: 'System',
                    fontWeight: '400'
                }}>
                    {t('dont_have_account')}
                </Text>
                <TouchableOpacity onPress={onSignUp} style={{ marginLeft: 4 }}>
                    <Text style={{
                        color: '#F48C06',
                        fontSize: 16,
                        fontFamily: 'System',
                        fontWeight: '600'
                    }}>
                        {t('sign_up')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Dev Quick Login Buttons */}
            {__DEV__ && (
                <View style={{ marginTop: 24, paddingHorizontal: 20 }}>


                    <TouchableOpacity
                        style={{
                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: isDark ? '#4B5563' : '#D1D5DB'
                        }}
                        onPress={() => onSubmit('hoangthao2222@gmail.com', '0908475945')}
                        disabled={loading}
                    >
                        <Text style={{
                            color: isDark ? '#FFFFFF' : '#000000',
                            fontSize: 14,
                            fontWeight: '500',
                            textAlign: 'center'
                        }}>
                            👤 hoangthao2222@gmail.com
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            borderWidth: 1,
                            marginBottom: 8,
                            borderColor: isDark ? '#4B5563' : '#D1D5DB'
                        }}
                        onPress={() => onSubmit('trendslade@gmail.com', '0908475945')}
                        disabled={loading}
                    >
                        <Text style={{
                            color: isDark ? '#FFFFFF' : '#000000',
                            fontSize: 14,
                            fontWeight: '500',
                            textAlign: 'center'
                        }}>
                            👤 trendslade@gmail.com
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 8,

                            borderWidth: 1,
                            borderColor: isDark ? '#4B5563' : '#D1D5DB'
                        }}
                        onPress={() => onSubmit('hoangthao3313@gmail.com', '0908475945')}
                        disabled={loading}
                    >
                        <Text style={{
                            color: isDark ? '#FFFFFF' : '#000000',
                            fontSize: 14,
                            fontWeight: '500',
                            textAlign: 'center'
                        }}>
                            👤 hoangthao3313@gmail.com
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default EmailLoginForm;
