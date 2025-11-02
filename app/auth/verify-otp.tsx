import AuthBackButton from '@/components/AuthBackButton';
import GradientButton from '@/components/GradientButton';
import GradientText from '@/components/GradientText';
import { AuthErrorBoundary } from '@/components/errorBoundaries';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { useToast } from '../../contexts/ToastContext';
import { AuthHelper, authService } from '../../services';
import NavigationService from '../../services/navigationService';

export default function VerifyOTPScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams();
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();

    const sessionToken = params.sessionToken as string;
    const isRegistration = params.isRegistration === 'true';

    const [otp, setOtp] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

    // 60-second resend countdown effect
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => {
                setResendCountdown(resendCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendCountdown]);

    const handleOtpComplete = (value: string) => {
        setOtp(value);
        setHasError(false); // Clear error when user types

        // Only auto-submit once when reaching 6 digits and not already submitted
        if (value.length === 6 && !hasAutoSubmitted && !loading) {
            setHasAutoSubmitted(true);
            // Use setTimeout to ensure state is updated before calling handleVerifyOTP
            setTimeout(() => {
                handleVerifyOTPWithValue(value); // Pass the value directly
            }, 100);
        }

        // Reset auto-submit flag when OTP length changes (user is editing)
        if (value.length < 6) {
            setHasAutoSubmitted(false);
        }
    };

    const handleVerifyOTPWithValue = async (otpValue: string) => {
        if (otpValue.length !== 6) {
            showError('Please enter a valid 6-digit OTP',);
            return;
        }

        // Prevent multiple submissions
        if (loading) return;

        setLoading(true);
        setHasError(false);
        try {
            const response = await authService.registerVerifyOTP(sessionToken, otpValue);

            // Save tokens to secure storage (including onboardingComplete)
            await AuthHelper.saveTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
                tokenType: response.data.tokenType,
                expiresIn: response.data.expiresIn,
                expiresAt: Date.now() + response.data.expiresIn,
                role: response.data.role,
                onboardingComplete: response.data.onboardingComplete, // Save onboarding status
            });

            showSuccess('Account created successfully!',);

            // Reinitialize WebSocket after register success
            try {
                const { initializationService } = await import('../../services/initializationService');
                await initializationService.reinitializeWebSocket();
            } catch (wsError) {
                console.error('[Register] WebSocket reinitialization failed:', wsError);
                // Don't block registration flow
            }

            // Check onboarding status from auth response
            if (response.data.onboardingComplete === false) {
                NavigationService.goToOnboardingWizard();
            } else {
                NavigationService.secureNavigateToDiscover();
            }
        } catch (error: any) {
            console.error('[Register] OTP verification failed:', error);
            showError(error.message || 'OTP verification failed. Please try again.',);
            setHasError(true); // Set error state to show red borders
            // DO NOT reset hasAutoSubmitted here - this prevents auto-submit loop
            // User must manually submit or change OTP to try again
        } finally {
            setLoading(false);
        }
    };

    // Keep original function for manual button submission
    const handleVerifyOTP = async () => {
        await handleVerifyOTPWithValue(otp);
    };

    const handleResendOTP = async () => {
        if (!canResend || loading) return;

        setLoading(true);
        try {
            await authService.registerResendOTP(sessionToken);
            showSuccess('OTP resent successfully!',);

            // Reset states for new OTP
            setOtp('');
            setHasError(false);
            setHasAutoSubmitted(false);

            // Start countdown
            setCanResend(false);
            setResendCountdown(60);
        } catch (error: any) {
            console.error('[VerifyOTP] Resend OTP failed:', error);
            showError(error.message || 'Failed to resend OTP. Please try again.',);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthErrorBoundary>
            <KeyboardAvoidingView
                style={{
                    flex: 1,
                    backgroundColor: isDark ? '#000000' : '#FFFFFF'
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={{
                    flex: 1,
                    paddingHorizontal: 24,
                    paddingTop: 60,
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    maxWidth: 500,
                    alignSelf: 'center',
                    width: '100%'
                }}>
                    {/* Header */}
                    <AuthBackButton onPress={() => router.back()} />

                    {/* Main Content - Moved higher up */}
                    <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 30 }}>
                        {/* Logo Section */}
                        <View style={{ alignItems: 'center', marginBottom: 40 }}>
                            <GradientText
                                style={{
                                    fontSize: 64,
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    fontFamily: 'Dongle',
                                }}
                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                            >
                                {isRegistration ? t('verify_otp') : 'Verify OTP'}
                            </GradientText>

                            <View style={{
                                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#E5E7EB'
                            }}>
                                <Text style={{
                                    fontSize: 16,
                                    color: isDark ? '#9CA3AF' : '#6B7280',
                                    textAlign: 'center',
                                    fontFamily: 'System',
                                    fontWeight: '400'
                                }}>
                                    {t('otp_sent')}
                                </Text>
                            </View>
                        </View>

                        {/* OTP Input Section */}
                        <View style={{ width: '100%', alignItems: 'center', marginBottom: 30 }}>
                            <OtpInput
                                numberOfDigits={6}
                                onTextChange={setOtp}
                                onFilled={handleOtpComplete}
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
                                        borderColor: hasError ? '#EF4444' : (isDark ? '#6B7280' : '#D1D5DB'),
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
                                        borderColor: hasError ? '#EF4444' : '#10B981',
                                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                    },
                                }}
                            />

                            {/* Error Message */}
                            {hasError && (
                                <View style={{
                                    backgroundColor: isDark ? '#991B1B' : '#FEF2F2',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    marginTop: 12,
                                    borderWidth: 1,
                                    borderColor: isDark ? '#DC2626' : '#FECACA'
                                }}>
                                    <Text style={{
                                        fontSize: 14,
                                        color: isDark ? '#FCA5A5' : '#DC2626',
                                        fontFamily: 'System',
                                        fontWeight: '500',
                                        textAlign: 'center'
                                    }}>
                                        Invalid OTP. Please try again.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            {/* Verify Button */}
                            <View style={{ width: '100%', marginBottom: 20 }}>
                                <GradientButton
                                    title={loading ? t('verifying') : t('verify_otp')}
                                    onPress={handleVerifyOTP}
                                    disabled={otp.length !== 6 || loading}
                                    textFontSize={18}
                                />
                            </View>

                            {/* Resend Section */}
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: isDark ? '#9CA3AF' : '#6B7280',
                                    fontFamily: 'System',
                                    fontWeight: '400',
                                    marginBottom: 8,
                                    textAlign: 'center'
                                }}>
                                    Didn&apos;t receive the code?
                                </Text>

                                <TouchableOpacity
                                    onPress={handleResendOTP}
                                    disabled={!canResend || resendLoading}
                                    style={{
                                        paddingVertical: 10,
                                        paddingHorizontal: 20,
                                        borderRadius: 20,
                                        backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                                        borderWidth: 1,
                                        borderColor: isDark ? '#374151' : '#E5E7EB',
                                        opacity: (!canResend || resendLoading) ? 0.5 : 1
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 16,
                                        color: isDark ? '#60A5FA' : '#3B82F6',
                                        fontFamily: 'System',
                                        fontWeight: '600',
                                        textAlign: 'center'
                                    }}>
                                        {resendLoading ? t('sending') : !canResend ? `Resend in ${resendCountdown}s` : t('resend_otp')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </AuthErrorBoundary>
    );
}
