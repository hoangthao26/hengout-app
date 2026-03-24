import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Info, Loader, XCircle, AlertTriangle } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View, ScrollView } from 'react-native';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';

export default function ToastTestScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error, info, warning, loading, hideLoading } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSuccessToast = () => {
        success('Thành công! Đây là toast success');
    };

    const handleErrorToast = () => {
        error('Lỗi! Đây là toast error');
    };

    const handleInfoToast = () => {
        info('Thông tin! Đây là toast info');
    };

    const handleWarningToast = () => {
        warning('Cảnh báo! Đây là toast warning');
    };

    const handleLoadingToast = () => {
        setIsLoading(true);
        loading('Đang tải...');

        // Auto hide after 3 seconds
        setTimeout(() => {
            hideLoading();
            setIsLoading(false);
            success('Hoàn thành!');
        }, 3000);
    };

    const handleMultipleToasts = () => {
        success('Toast 1: Thành công!');
        setTimeout(() => info('Toast 2: Thông tin!'), 500);
        setTimeout(() => warning('Toast 3: Cảnh báo!'), 1000);
        setTimeout(() => error('Toast 4: Lỗi!'), 1500);
    };

    const handleLongMessage = () => {
        success('Đây là một tin nhắn rất dài để test xem toast có hiển thị đúng không khi có nhiều text. Toast này sẽ wrap text và hiển thị trên nhiều dòng.');
    };

    const handleShortMessage = () => {
        success('OK');
    };

    const handleEmojiToast = () => {
        success('Test emoji toast');
    };

    const handleSpecialChars = () => {
        info('Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?');
    };

    const handleTransparencyTest = () => {
        success('Test độ trong suốt - Background giờ đã semi-transparent!');
    };

    const handleBlurEffectTest = () => {
        warning('Test blur effect - Shadow và elevation đã được tăng cường!');
    };

    const handleGlassLiquidTest = () => {
        success('Glass Liquid Effect - Blur + Gradient + Shimmer + Animation!');
    };

    const handleLiquidAnimationTest = () => {
        info('Liquid Animation - Spring entrance + Shimmer loop!');
    };

    const TestButton = ({
        title,
        onPress,
        icon: Icon,
        color = '#F48C06',
        disabled = false
    }: {
        title: string;
        onPress: () => void;
        icon: any;
        color?: string;
        disabled?: boolean;
    }) => (
        <TouchableOpacity
            style={[
                styles.testButton,
                {
                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                    borderColor: color,
                    opacity: disabled ? 0.5 : 1
                }
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <Icon size={20} color={color} />
            <Text style={[styles.testButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Header */}
            <Header
                title="Toast Test"
                onBackPress={() => router.back()}
                variant="settings"
            />

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    🧪 Toast Testing Center
                </Text>

                <Text style={[styles.description, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    Test các loại toast khác nhau để đảm bảo hệ thống hoạt động đúng
                </Text>

                {/* Basic Toast Types */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Basic Toast Types
                    </Text>

                    <TestButton
                        title="Success Toast"
                        onPress={handleSuccessToast}
                        icon={CheckCircle}
                        color="#10B981"
                    />

                    <TestButton
                        title="Error Toast"
                        onPress={handleErrorToast}
                        icon={XCircle}
                        color="#EF4444"
                    />

                    <TestButton
                        title="Info Toast"
                        onPress={handleInfoToast}
                        icon={Info}
                        color="#3B82F6"
                    />

                    <TestButton
                        title="Warning Toast"
                        onPress={handleWarningToast}
                        icon={AlertTriangle}
                        color="#F59E0B"
                    />
                </View>

                {/* Loading Toast */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Loading Toast
                    </Text>

                    <TestButton
                        title="Loading Toast (3s)"
                        onPress={handleLoadingToast}
                        icon={Loader}
                        color="#8B5CF6"
                        disabled={isLoading}
                    />
                </View>

                {/* Message Length Tests */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Message Length Tests
                    </Text>

                    <TestButton
                        title="Short Message"
                        onPress={handleShortMessage}
                        icon={CheckCircle}
                        color="#10B981"
                    />

                    <TestButton
                        title="Long Message"
                        onPress={handleLongMessage}
                        icon={Info}
                        color="#3B82F6"
                    />
                </View>

                {/* Special Content Tests */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Special Content
                    </Text>

                    <TestButton
                        title="Emoji Toast"
                        onPress={handleEmojiToast}
                        icon={CheckCircle}
                        color="#F59E0B"
                    />

                    <TestButton
                        title="Special Characters"
                        onPress={handleSpecialChars}
                        icon={Info}
                        color="#8B5CF6"
                    />
                </View>

                {/* Glass Liquid Effects */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Glass Liquid Effects
                    </Text>

                    <TestButton
                        title="Glass Liquid Effect"
                        onPress={handleGlassLiquidTest}
                        icon={CheckCircle}
                        color="#10B981"
                    />

                    <TestButton
                        title="Liquid Animation"
                        onPress={handleLiquidAnimationTest}
                        icon={Info}
                        color="#3B82F6"
                    />

                    <TestButton
                        title="Test Transparency"
                        onPress={handleTransparencyTest}
                        icon={CheckCircle}
                        color="#10B981"
                    />

                    <TestButton
                        title="Test Blur Effect"
                        onPress={handleBlurEffectTest}
                        icon={AlertTriangle}
                        color="#F59E0B"
                    />
                </View>

                {/* Multiple Toasts */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Multiple Toasts
                    </Text>

                    <TestButton
                        title="Multiple Toasts (4x)"
                        onPress={handleMultipleToasts}
                        icon={Loader}
                        color="#EC4899"
                    />
                </View>

                {/* Instructions */}
                <View style={[styles.instructions, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                    <Text style={[styles.instructionsTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Test Instructions
                    </Text>
                    <Text style={[styles.instructionsText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        • Tap các button để test từng loại toast{'\n'}
                        • Kiểm tra màu sắc, icon, và animation{'\n'}
                        • Test multiple toasts để xem stacking{'\n'}
                        • Kiểm tra responsive với text dài{'\n'}
                        • Test loading toast với auto-hide
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    testButtonText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
    instructions: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 30,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    instructionsText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
