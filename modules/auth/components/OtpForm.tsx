import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, useColorScheme } from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import GradientButton from '../../../components/GradientButton';

interface OtpFormProps {
    onSubmit: (otp: string) => void;
    loading?: boolean;
}

const OtpForm: React.FC<OtpFormProps> = ({ onSubmit, loading }) => {
    const { t } = useTranslation();
    const [otp, setOtp] = useState('');
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className="flex-1 bg-white dark:bg-black px-6 justify-center items-center">
            {/* Tiêu đề */}
            <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 8,
                color: isDark ? '#FFFFFF' : '#000000'
            }}>
                {t('verify_otp')}
            </Text>
            {/* Mô tả */}
            <Text style={{
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 32,
                color: isDark ? '#FFFFFF' : '#000000'
            }}>
                {t('otp_sent')}
            </Text>

            {/* OTP Entry */}
            <View className="mb-6">
                <OtpInput
                    numberOfDigits={6}
                    onTextChange={setOtp}
                    onFilled={(text) => onSubmit(text)}
                    focusColor="#F48C06"
                    autoFocus={true}
                    blurOnFilled={false}
                    type="numeric"
                    secureTextEntry={false}
                    theme={{
                        containerStyle: {
                            width: 'auto',
                            gap: 4, // Tăng khoảng cách giữa các ô
                        },
                        pinCodeContainerStyle: {
                            width: 50,
                            height: 50,
                            borderRadius: 12,
                            borderWidth: 2,
                            backgroundColor: isDark ? '#374151' : '#F9FAFB',
                            borderColor: isDark ? '#6B7280' : '#D1D5DB',
                            marginHorizontal: 6, // Thêm margin ngang
                        },
                        pinCodeTextStyle: {
                            fontSize: 24,
                            fontWeight: '600',
                            color: isDark ? '#FFFFFF' : '#000000',
                        },
                        focusedPinCodeContainerStyle: {
                            borderColor: '#F48C06',
                            backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        },
                        filledPinCodeContainerStyle: {
                            borderColor: '#10B981',
                            backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        },
                    }}
                />
            </View>

            {/* Nút xác nhận */}
            <GradientButton
                title={t('verify')}
                disabled={otp.length !== 6 || loading}
                onPress={() => onSubmit(otp)}
                className="mt-4"
                textFontSize={18}
            />

            {/* Gợi ý resend */}
            <Text className="text-base text-center mt-8  text-gray-500 dark:text-gray-400">
                {t('resend_in', { s: 60 })}
            </Text>
        </View>
    );
};

export default OtpForm; 