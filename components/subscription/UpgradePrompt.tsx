import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Crown, X, AlertTriangle } from 'lucide-react-native';

interface UpgradePromptProps {
    message: string;
    feature?: string;
    currentLimit?: number;
    requiredLimit?: number;
    onUpgrade: () => void;
    onDismiss?: () => void;
    variant?: 'warning' | 'info' | 'urgent';
}

export default function UpgradePrompt({
    message,
    feature,
    currentLimit,
    requiredLimit,
    onUpgrade,
    onDismiss,
    variant = 'info'
}: UpgradePromptProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const getVariantStyles = () => {
        switch (variant) {
            case 'urgent':
                return {
                    container: [styles.urgentContainer, isDark && styles.urgentContainerDark],
                    icon: '#EF4444',
                    title: [styles.urgentTitle, isDark && styles.urgentTitleDark],
                    text: [styles.urgentText, isDark && styles.urgentTextDark],
                    button: styles.urgentButton,
                    buttonText: styles.urgentButtonText,
                };
            case 'warning':
                return {
                    container: [styles.warningContainer, isDark && styles.warningContainerDark],
                    icon: '#F59E0B',
                    title: [styles.warningTitle, isDark && styles.warningTitleDark],
                    text: [styles.warningText, isDark && styles.warningTextDark],
                    button: styles.warningButton,
                    buttonText: styles.warningButtonText,
                };
            default:
                return {
                    container: [styles.infoContainer, isDark && styles.infoContainerDark],
                    icon: '#3B82F6',
                    title: [styles.infoTitle, isDark && styles.infoTitleDark],
                    text: [styles.infoText, isDark && styles.infoTextDark],
                    button: styles.infoButton,
                    buttonText: styles.infoButtonText,
                };
        }
    };

    const variantStyles = getVariantStyles();

    return (
        <View style={[styles.container, variantStyles.container]}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {variant === 'urgent' ? (
                        <AlertTriangle size={20} color={variantStyles.icon} />
                    ) : (
                        <Crown size={20} color={variantStyles.icon} />
                    )}
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, variantStyles.title]}>
                        {variant === 'urgent' ? 'Đã Đạt Giới Hạn!' : 'Có Thể Nâng Cấp'}
                    </Text>
                    <Text style={[styles.message, variantStyles.text]}>
                        {message}
                    </Text>
                    {feature && (
                        <Text style={[styles.feature, variantStyles.text]}>
                            Tính năng: {feature}
                        </Text>
                    )}
                    {currentLimit && requiredLimit && (
                        <Text style={[styles.limits, variantStyles.text]}>
                            Hiện tại: {currentLimit} / Cần: {requiredLimit}
                        </Text>
                    )}
                </View>

                {onDismiss && (
                    <TouchableOpacity
                        onPress={onDismiss}
                        style={styles.dismissButton}
                        activeOpacity={0.7}
                    >
                        <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                style={[styles.upgradeButton, variantStyles.button]}
                onPress={onUpgrade}
                activeOpacity={0.8}
            >
                <Crown size={16} color="#FFFFFF" />
                <Text style={[styles.upgradeButtonText, variantStyles.buttonText]}>
                    Nâng Cấp Ngay
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 4,
    },
    feature: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    limits: {
        fontSize: 12,
        opacity: 0.8,
    },
    dismissButton: {
        padding: 4,
        marginLeft: 8,
    },
    upgradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    upgradeButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },

    // Info variant
    infoContainer: {
        backgroundColor: '#EBF8FF',
        borderColor: '#3B82F6',
        borderWidth: 1,
    },
    infoContainerDark: {
        backgroundColor: '#1E3A8A',
        borderColor: '#3B82F6',
    },
    infoTitle: {
        color: '#1E40AF',
    },
    infoTitleDark: {
        color: '#93C5FD',
    },
    infoText: {
        color: '#1E40AF',
    },
    infoTextDark: {
        color: '#93C5FD',
    },
    infoButton: {
        backgroundColor: '#3B82F6',
    },
    infoButtonText: {
        color: '#FFFFFF',
    },

    // Warning variant
    warningContainer: {
        backgroundColor: '#FFFBEB',
        borderColor: '#F59E0B',
        borderWidth: 1,
    },
    warningContainerDark: {
        backgroundColor: '#451A03',
        borderColor: '#F59E0B',
    },
    warningTitle: {
        color: '#D97706',
    },
    warningTitleDark: {
        color: '#FCD34D',
    },
    warningText: {
        color: '#D97706',
    },
    warningTextDark: {
        color: '#FCD34D',
    },
    warningButton: {
        backgroundColor: '#F59E0B',
    },
    warningButtonText: {
        color: '#FFFFFF',
    },

    // Urgent variant
    urgentContainer: {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
        borderWidth: 1,
    },
    urgentContainerDark: {
        backgroundColor: '#450A0A',
        borderColor: '#EF4444',
    },
    urgentTitle: {
        color: '#DC2626',
    },
    urgentTitleDark: {
        color: '#FCA5A5',
    },
    urgentText: {
        color: '#DC2626',
    },
    urgentTextDark: {
        color: '#FCA5A5',
    },
    urgentButton: {
        backgroundColor: '#EF4444',
    },
    urgentButtonText: {
        color: '#FFFFFF',
    },
});

