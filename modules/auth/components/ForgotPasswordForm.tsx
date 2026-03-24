import React, { useState } from 'react';
import { View, Text, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import GradientButton from '../../../components/GradientButton';
import { useTranslation } from 'react-i18next';
import GradientText from '../../../components/GradientText';
import EmailInput from './EmailInput';
import ErrorMessage from './ErrorMessage';
import { validateEmail } from '../validations/authSchema';

interface ForgotPasswordFormProps {
    onSubmit: (email: string) => void;
    loading?: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
    onSubmit,
    loading = false
}) => {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [email, setEmail] = useState<string>('');
    const [emailError, setEmailError] = useState<string>('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);

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

        return isValid;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(email);
        }
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (emailError) {
            setEmailError('');
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
                <View style={{ width: '100%', marginTop: 86, paddingHorizontal: 10 }}>
                    <GradientText
                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                        style={{ fontSize: 44, fontWeight: 'bold', textAlign: 'left', marginTop: 0 }}
                    >
                        {t('forgot_password')}
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
                        {t('forgot_password_description')}
                    </Text>

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

                    {/* Send Reset Code Button */}
                    <GradientButton
                        title={loading ? t('sending') : t('send_reset_code')}
                        onPress={handleSubmit}
                        disabled={!email || loading}
                        className='mt-6'
                        textFontSize={18}
                    />
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default ForgotPasswordForm;
