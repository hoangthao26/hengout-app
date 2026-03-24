import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, BackHandler } from 'react-native';
import { XCircle, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { paymentFlowManager } from '../services/paymentFlowManager';
import Header from '../components/Header';
import GradientButton from '../components/GradientButton';

export default function PaymentCancelScreen() {
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

        const handlePaymentCancel = async () => {
            hasProcessedRef.current = true;

            try {
                // Close WebBrowser first
                WebBrowser.dismissBrowser();

                // Reset payment flow from deep link
                await paymentFlowManager.resetPaymentFlowFromDeepLink();
            } catch (error) {
                console.error('[PaymentCancel] Error:', error);
                hasProcessedRef.current = false; // Allow retry on error
            }
        };

        handlePaymentCancel();

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
                title="Thanh Toán Đã Hủy"
                onBackPress={handleBackToProfile}
            />

            <View style={styles.content}>
                <LinearGradient
                    colors={["#F43F5E", "#EF4444"]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.iconGradient}
                >
                    <XCircle size={64} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.title, isDark && styles.titleDark]}>Thanh Toán Đã Hủy</Text>
                <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>Bạn đã hủy thanh toán thành công</Text>

                {(orderCode?.length > 0) && (
                    <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
                        <Info size={16} color={isDark ? '#FCA5A5' : '#DC2626'} />
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
        shadowColor: '#EF4444',
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
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 12,
    },
    infoCardDark: {
        backgroundColor: '#1F0E12',
        borderColor: '#7F1D1D',
    },
    infoText: {
        color: '#1F2937',
        fontSize: 13,
        fontWeight: '600',
    },
    infoTextDark: {
        color: '#E5E7EB',
    },

});

