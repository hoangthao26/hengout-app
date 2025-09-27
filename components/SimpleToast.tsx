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
                    iconColor: '#059669', // Tăng contrast
                    backgroundColor: isDark ? '#064E3B' : '#ECFDF5', // Sáng hơn
                    borderColor: '#059669',
                };
            case 'error':
                return {
                    icon: XCircle,
                    iconColor: '#DC2626', // Tăng contrast
                    backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2', // Sáng hơn
                    borderColor: '#DC2626',
                };
            case 'warning':
                return {
                    icon: AlertCircle,
                    iconColor: '#D97706', // Tăng contrast
                    backgroundColor: isDark ? '#78350F' : '#FFFBEB', // Sáng hơn
                    borderColor: '#D97706',
                };
            case 'info':
                return {
                    icon: Info,
                    iconColor: '#2563EB', // Tăng contrast
                    backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', // Sáng hơn
                    borderColor: '#2563EB',
                };
            case 'loading':
                return {
                    icon: Info,
                    iconColor: '#4B5563', // Tăng contrast
                    backgroundColor: isDark ? '#374151' : '#F9FAFB', // Sáng hơn
                    borderColor: '#4B5563',
                };
            default:
                return {
                    icon: Info,
                    iconColor: '#4B5563',
                    backgroundColor: isDark ? '#374151' : '#F9FAFB',
                    borderColor: '#4B5563',
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
                    <config.icon
                        size={20}
                        color={config.iconColor}
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text
                        style={[
                            styles.title,
                            { color: isDark ? '#FFFFFF' : '#1F2937' }, // Tăng contrast
                        ]}
                        numberOfLines={1}
                    >
                        {toast.title}
                    </Text>
                    {toast.message && (
                        <Text
                            style={[
                                styles.message,
                                { color: isDark ? '#E5E7EB' : '#4B5563' }, // Tăng contrast
                            ]}
                            numberOfLines={2}
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
                            color={isDark ? '#D1D5DB' : '#6B7280'}
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
        marginVertical: 4, // Giảm margin
        borderRadius: 12, // Giảm border radius
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1, // Shadow nhẹ hơn
        },
        shadowOpacity: 0.05, // Shadow rất nhẹ
        shadowRadius: 4, // Shadow nhỏ gọn
        elevation: 2, // Elevation nhẹ
        maxWidth: screenWidth - 32,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14, // Giảm padding
        minHeight: 56, // Giảm min height
    },
    iconContainer: {
        marginRight: 12, // Giảm margin
        alignItems: 'center',
        justifyContent: 'center',
        width: 28, // Giảm icon size
        height: 28,
    },
    textContainer: {
        flex: 1,
        marginRight: 8, // Giảm margin
    },
    title: {
        fontSize: 16, // Giảm font size
        fontWeight: '600', // Giảm font weight
        lineHeight: 20, // Giảm line height
        marginBottom: 2,
        letterSpacing: -0.1,
    },
    message: {
        fontSize: 14, // Giảm font size
        lineHeight: 18, // Giảm line height
        opacity: 0.9,
        letterSpacing: -0.05,
    },
    actionButton: {
        paddingHorizontal: 12, // Giảm padding
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        minHeight: 32, // Giảm touch target
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14, // Giảm font size
        fontWeight: '600',
        letterSpacing: -0.05,
    },
    closeButton: {
        padding: 6, // Giảm padding
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        minWidth: 28, // Giảm touch target
        minHeight: 28,
    },
});

export default SimpleToast;
