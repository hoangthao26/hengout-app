import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { paymentFlowManager } from '../services/paymentFlowManager';
import Header from '../components/Header';
import GradientButton from '../components/GradientButton';

export default function PaymentCallbackScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    useEffect(() => {
        const handlePaymentCallback = async () => {
            console.log('[PaymentCallback] Deep link screen loaded');

            // Close WebBrowser first
            WebBrowser.dismissBrowser();

            // Process payment callback
            await paymentFlowManager.completePaymentFromDeepLink();

            console.log('Payment callback processed successfully');
        };

        handlePaymentCallback();
    }, []);

    const handleBackToProfile = () => {
        router.replace('/(tabs)/profile');
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <Header
                title="Xử Lý Callback"
                onBackPress={handleBackToProfile}
            />

            <View style={styles.content}>
                <CheckCircle size={64} color="#10B981" />
                <Text style={[styles.title, isDark && styles.titleDark]}>
                    Xử Lý Callback Thành Công
                </Text>
                <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                    Callback đã được xử lý thành công
                </Text>

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
});

