import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, BackHandler } from 'react-native';
import { CheckCircle, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { paymentFlowManager } from '../services/paymentFlowManager';
import Header from '../components/Header';
import GradientButton from '../components/GradientButton';

export default function PaymentSuccessScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const params = useLocalSearchParams();
    const orderCode = (params?.orderCode as string) || (params?.ordercode as string) || '';

    const hasProcessedRef = useRef(false);

    const handleBackToProfile = React.useCallback(async () => {
        // Clear payment flow to prevent deeplink reload
        paymentFlowManager.clearAllPaymentData();
        router.replace('/(tabs)/profile');
    }, [router]);

    useEffect(() => {
        // Only process once when component mounts
        if (hasProcessedRef.current) {
            return;
        }

        const handlePaymentSuccess = async () => {
            hasProcessedRef.current = true;

            try {
                // Close WebBrowser first
                WebBrowser.dismissBrowser();

                // Complete payment from deep link
                await paymentFlowManager.completePaymentFromDeepLink();
            } catch (error) {
                console.error('[PaymentSuccess] Error:', error);
                hasProcessedRef.current = false; // Allow retry on error
            }
        };

        handlePaymentSuccess();

        // Cleanup: Clear payment data when component unmounts
        return () => {
            paymentFlowManager.clearAllPaymentData();
        };
    }, []);

    // Handle Android hardware back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBackToProfile();
            return true; // Prevent default back behavior
        });

        return () => backHandler.remove();
    }, [handleBackToProfile]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <Header
                title="Thanh Toán Thành Công"
                onBackPress={handleBackToProfile}
            />

            <View style={styles.content}>
                <LinearGradient
                    colors={["#22C55E", "#16A34A"]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.iconGradient}
                >
                    <CheckCircle size={64} color="#FFFFFF" />
                </LinearGradient>

                <Text style={[styles.title, isDark && styles.titleDark]}>Thanh Toán Thành Công!</Text>
                <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Gói đăng ký của bạn đã được kích hoạt</Text>

                {(orderCode?.length > 0) && (
                    <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
                        <Info size={16} color={isDark ? '#93C5FD' : '#2563EB'} />
                        <Text style={[styles.infoText, isDark && styles.infoTextDark]}>Mã đơn hàng: #{orderCode}</Text>
                    </View>
                )}

                <GradientButton
                    title="Quay Về Profile"
                    onPress={handleBackToProfile}
                    size="medium"
                    textFontSize={16}
                    className="mt-6"
                />

                {/* <TouchableOpacity onPress={handleBackToProfile} activeOpacity={0.8} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Xem Lịch Sử Thanh Toán</Text>
                </TouchableOpacity> */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconGradient: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#22C55E',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
        marginTop: 16,
        textAlign: 'center',
    },
    titleDark: {
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
        marginBottom: 32,
    },
    subtitleDark: {
        color: '#9CA3AF',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    infoCardDark: {
        backgroundColor: '#0B1220',
        borderColor: '#1D4ED8',
    },
    infoText: {
        color: '#1F2937',
        fontSize: 13,
        fontWeight: '600',
    },
    infoTextDark: {
        color: '#E5E7EB',
    },
    secondaryBtn: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    secondaryBtnText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
});

