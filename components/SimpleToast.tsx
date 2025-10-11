import React, { useEffect, useRef } from 'react';
import {
    AccessibilityInfo,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, AlertCircle, XCircle, Info, X, LucideIcon } from 'lucide-react-native';
import { Toast as ToastType } from '../types/toast';

const { width: screenWidth } = Dimensions.get('window');

interface SimpleToastProps {
    toast: ToastType;
    onHide: (id: string) => void;
    onActionPress?: (action: ToastType['action']) => void;
}

const SimpleToast: React.FC<SimpleToastProps> = ({ toast, onHide, onActionPress }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Announce toast to screen readers
        const announceToast = () => {
            const message = toast.message ? `${toast.title}. ${toast.message}` : toast.title;
            AccessibilityInfo.announceForAccessibility(message);
        };

        // Announce after a short delay to ensure toast is rendered
        const announceTimeout = setTimeout(announceToast, 100);

        // Auto hide after duration (unless persistent)
        if (!toast.persistent && toast.duration && toast.duration > 0) {
            timeoutRef.current = setTimeout(() => {
                onHide(toast.id);
            }, toast.duration);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            clearTimeout(announceTimeout);
        };
    }, [toast.id, toast.duration, toast.persistent, onHide, toast.title, toast.message]);

    const handleHide = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onHide(toast.id);
    };

    const getToastConfig = () => {
        switch (toast.type) {
            case 'success':
                return {
                    icon: CheckCircle,
                    iconColor: '#FFFFFF',
                    iconBackgroundColor: '#10B981',
                    gradientColors: ['#00DF80', '#00ED51', '#00ED7B'],
                    backgroundColor: '#242C32', // Dark background như Figma
                    borderColor: 'transparent',
                };
            case 'error':
                return {
                    icon: XCircle,
                    iconColor: '#FFFFFF',
                    iconBackgroundColor: '#DC2626',
                    gradientColors: ['#FF6B6B', '#FF5252', '#FF1744'],
                    backgroundColor: '#242C32', // Dark background như Figma
                    borderColor: 'transparent',
                };
            case 'warning':
                return {
                    icon: AlertCircle,
                    iconColor: '#FFFFFF',
                    iconBackgroundColor: '#D97706',
                    gradientColors: ['#FFB800', '#FFA000', '#FF8F00'],
                    backgroundColor: '#242C32', // Dark background như Figma
                    borderColor: 'transparent',
                };
            case 'info':
                return {
                    icon: Info,
                    iconColor: '#FFFFFF',
                    iconBackgroundColor: '#2563EB',
                    gradientColors: ['#00B4DB', '#0080FF', '#0066CC'],
                    backgroundColor: '#242C32', // Dark background như Figma
                    borderColor: 'transparent',
                };
            case 'loading':
                return {
                    icon: Info,
                    iconColor: '#FFFFFF',
                    iconBackgroundColor: '#4B5563',
                    gradientColors: ['#6B7280', '#4B5563', '#374151'],
                    backgroundColor: '#242C32', // Dark background như Figma
                    borderColor: 'transparent',
                };
            default:
                return {
                    icon: Info,
                    iconColor: '#FFFFFF',
                    iconBackgroundColor: '#4B5563',
                    gradientColors: ['#6B7280', '#4B5563', '#374151'],
                    backgroundColor: '#242C32',
                    borderColor: 'transparent',
                };
        }
    };

    const config = getToastConfig();

    return (
        <View
            style={[
                styles.toast,
                {
                    backgroundColor: config.backgroundColor,
                    borderColor: config.borderColor,
                },
            ]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={`${toast.type} notification: ${toast.title}${toast.message ? `. ${toast.message}` : ''}`}
            accessibilityHint={toast.action ? `Double tap to ${toast.action.label.toLowerCase()}` : 'Double tap to dismiss'}
        >
            <Pressable
                style={styles.toastContent}
                onPress={toast.action ? () => onActionPress?.(toast.action) : undefined}
            >
                <View style={styles.iconContainer}>
                    {/* Radial gradient effect - chỉ 1 layer nhỏ nhất */}
                    <View style={styles.radialBackground}>
                        <LinearGradient
                            colors={[config.gradientColors[0] + '20', config.gradientColors[0] + '08', config.gradientColors[0] + '00']}
                            style={styles.radialLayer1}
                            start={{ x: 0.5, y: 0.5 }}
                            end={{ x: 1, y: 1 }}
                        />
                    </View>
                    {/* Main icon container */}
                    <View style={[
                        styles.iconInnerContainer,
                        { backgroundColor: config.iconBackgroundColor }
                    ]}>
                        <config.icon
                            size={20}
                            color={config.iconColor}
                        />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text
                        style={[
                            styles.title,
                            { color: '#FFFFFF' }, // White text như Figma
                        ]}
                        numberOfLines={2}
                    >
                        {toast.title}
                    </Text>
                    {toast.message && (
                        <Text
                            style={[
                                styles.message,
                                { color: '#C8C5C5' }, // Gray text như Figma
                            ]}
                            numberOfLines={3}
                        >
                            {toast.message}
                        </Text>
                    )}
                </View>

                {toast.action && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onActionPress?.(toast.action)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={toast.action.label}
                        accessibilityHint={`Double tap to ${toast.action.label.toLowerCase()}`}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                        <Text
                            style={[
                                styles.actionText,
                                { color: config.iconColor },
                            ]}
                        >
                            {toast.action.label}
                        </Text>
                    </TouchableOpacity>
                )}

                {!toast.persistent && (
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleHide}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss notification"
                        accessibilityHint="Double tap to close this notification"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <X
                            size={16}
                            color="#C8C5C5" // Gray color như Figma
                        />
                    </TouchableOpacity>
                )}
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    toast: {
        marginHorizontal: Math.min(16, screenWidth * 0.04),
        marginVertical: 4,
        borderRadius: 16, // Tăng border radius theo Figma
        borderWidth: 0, // Bỏ border
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        maxWidth: screenWidth - 32,
        overflow: 'visible', // Cho phép gradient tràn ra ngoài toast
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12, // Tăng padding một chút
        minHeight: 60, // Tăng min height để chứa text
    },
    iconContainer: {
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: 65, // Giảm size
        height: 64,
        position: 'relative',
    },
    radialBackground: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'visible', // Cho phép gradient tràn ra ngoài
    },
    radialLayer1: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    iconInnerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 14, // Giảm font size để text không bị cắt
        fontWeight: '600', // Semibold như Figma
        lineHeight: 18, // Giảm line height
        marginBottom: 2,
        letterSpacing: -0.2, // Giảm letter spacing
    },
    message: {
        fontSize: 12, // Giảm font size
        lineHeight: 16, // Giảm line height
        letterSpacing: -0.05, // Giảm letter spacing
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        minHeight: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.05,
    },
    closeButton: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        minWidth: 28,
        minHeight: 28,
    },
});

export default SimpleToast;
