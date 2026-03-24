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
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CheckCircle, AlertCircle, XCircle, Info, X, Crown } from 'lucide-react-native';
import { Toast as ToastType } from '../types/toast';

const { width: screenWidth } = Dimensions.get('window');

interface SimpleToastProps {
    toast: ToastType;
    onHide: (id: string) => void;
    onPress?: () => void;
    onActionPress?: (action: ToastType['action']) => void;
}

const SimpleToast: React.FC<SimpleToastProps> = ({ toast, onHide, onPress, onActionPress }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Animation values for glass liquid effect
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Glass liquid entrance animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Shimmer animation loop
        const shimmerLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );
        shimmerLoop.start();

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
            shimmerLoop.stop();
        };
    }, [toast.id, toast.duration, toast.persistent, onHide, toast.title, toast.message, scaleAnim, opacityAnim, shimmerAnim]);

    const handleHide = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onHide(toast.id);
    };

    const getToastConfig = () => {
        const baseConfig = {
            success: {
                icon: CheckCircle,
                iconColor: isDark ? '#FFFFFF' : '#FFFFFF',
                iconBackgroundColor: '#10B981',
                gradientColors: isDark ? ['#00DF80', '#00ED51', '#00ED7B'] : ['#059669', '#10B981', '#34D399'],
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.2)',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)',
                glassGradient: isDark
                    ? ['rgba(16, 185, 129, 0.1)', 'rgba(0, 223, 128, 0.05)', 'rgba(0, 237, 81, 0.1)']
                    : ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.15)', 'rgba(52, 211, 153, 0.2)'],
            },
            error: {
                icon: XCircle,
                iconColor: isDark ? '#FFFFFF' : '#FFFFFF',
                iconBackgroundColor: '#DC2626',
                gradientColors: isDark ? ['#FF6B6B', '#FF5252', '#FF1744'] : ['#EF4444', '#DC2626', '#B91C1C'],
                backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.2)',
                borderColor: isDark ? 'rgba(220, 38, 38, 0.3)' : 'rgba(220, 38, 38, 0.4)',
                glassGradient: isDark
                    ? ['rgba(220, 38, 38, 0.1)', 'rgba(255, 107, 107, 0.05)', 'rgba(255, 82, 82, 0.1)']
                    : ['rgba(220, 38, 38, 0.2)', 'rgba(239, 68, 68, 0.15)', 'rgba(185, 28, 28, 0.2)'],
            },
            warning: {
                icon: AlertCircle,
                iconColor: isDark ? '#FFFFFF' : '#FFFFFF',
                iconBackgroundColor: '#D97706',
                gradientColors: isDark ? ['#FFB800', '#FFA000', '#FF8F00'] : ['#F59E0B', '#D97706', '#B45309'],
                backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.2)',
                borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : 'rgba(217, 119, 6, 0.4)',
                glassGradient: isDark
                    ? ['rgba(217, 119, 6, 0.1)', 'rgba(255, 184, 0, 0.05)', 'rgba(255, 160, 0, 0.1)']
                    : ['rgba(217, 119, 6, 0.2)', 'rgba(245, 158, 11, 0.15)', 'rgba(180, 83, 9, 0.2)'],
            },
            info: {
                icon: Info,
                iconColor: isDark ? '#FFFFFF' : '#FFFFFF',
                iconBackgroundColor: '#2563EB',
                gradientColors: isDark ? ['#00B4DB', '#0080FF', '#0066CC'] : ['#3B82F6', '#2563EB', '#1D4ED8'],
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.2)',
                borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.4)',
                glassGradient: isDark
                    ? ['rgba(37, 99, 235, 0.1)', 'rgba(0, 180, 219, 0.05)', 'rgba(0, 128, 255, 0.1)']
                    : ['rgba(37, 99, 235, 0.2)', 'rgba(59, 130, 246, 0.15)', 'rgba(29, 78, 216, 0.2)'],
            },
            upgrade: {
                icon: Crown,
                iconColor: isDark ? '#FFFFFF' : '#FFFFFF',
                iconBackgroundColor: '#F59E0B',
                gradientColors: ['#FAA307', '#F48C06', '#DC2F02'],
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.18)',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.4)',
                glassGradient: isDark
                    ? ['rgba(245, 158, 11, 0.1)', 'rgba(220, 47, 2, 0.05)', 'rgba(250, 163, 7, 0.1)']
                    : ['rgba(250, 163, 7, 0.18)', 'rgba(244, 140, 6, 0.12)', 'rgba(220, 47, 2, 0.18)'],
            },
            loading: {
                icon: Info,
                iconColor: isDark ? '#FFFFFF' : '#FFFFFF',
                iconBackgroundColor: isDark ? '#4B5563' : '#6B7280',
                gradientColors: isDark ? ['#6B7280', '#4B5563', '#374151'] : ['#9CA3AF', '#6B7280', '#4B5563'],
                backgroundColor: isDark ? 'rgba(75, 85, 99, 0.15)' : 'rgba(107, 114, 128, 0.2)',
                borderColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(107, 114, 128, 0.4)',
                glassGradient: isDark
                    ? ['rgba(75, 85, 99, 0.1)', 'rgba(107, 114, 128, 0.05)', 'rgba(55, 65, 81, 0.1)']
                    : ['rgba(107, 114, 128, 0.2)', 'rgba(156, 163, 175, 0.15)', 'rgba(75, 85, 99, 0.2)'],
            },
        };

        // Handle message type by falling back to info
        const toastType = toast.type === 'message' ? 'info' : toast.type;
        return baseConfig[toastType] || baseConfig.info;
    };

    const config = getToastConfig();

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: config.backgroundColor,
                    borderColor: config.borderColor,
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                },
            ]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={`${toast.type} notification: ${toast.title}${toast.message ? `. ${toast.message}` : ''}`}
            accessibilityHint={toast.action ? `Double tap to ${toast.action.label.toLowerCase()}` : 'Double tap to dismiss'}
        >
            {/* Glass liquid background with blur */}
            <BlurView
                intensity={isDark ? 20 : 25}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Glass gradient overlay */}
            <LinearGradient
                colors={config.glassGradient as [string, string, string]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Shimmer effect */}
            <Animated.View
                style={[
                    styles.shimmerOverlay,
                    {
                        opacity: shimmerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.3],
                        }),
                        transform: [
                            {
                                translateX: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-100, 100],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.2)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </Animated.View>
            <Pressable
                style={styles.toastContent}
                onPress={() => {
                    if (onPress) {
                        onPress();
                    } else if (toast.action) {
                        onActionPress?.(toast.action);
                    }
                }}
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
                            size={18}
                            color={config.iconColor}
                        />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text
                        style={[
                            styles.title,
                            { color: isDark ? '#FFFFFF' : '#111827' }, // White in dark, very dark gray in light for better contrast
                        ]}
                        numberOfLines={2}
                    >
                        {toast.title}
                    </Text>
                    {toast.message && (
                        <Text
                            style={[
                                styles.message,
                                { color: isDark ? '#C8C5C5' : '#374151' }, // Light gray in dark, darker gray in light for better readability
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
                            color={isDark ? '#C8C5C5' : '#374151'} // Light gray in dark, darker gray in light for better visibility
                        />
                    </TouchableOpacity>
                )}
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toast: {
        marginHorizontal: Math.min(16, screenWidth * 0.04),
        marginVertical: 4,
        borderRadius: 24, // Tăng border radius theo Figma
        borderWidth: 1, // Glass border
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3, // Tăng shadow opacity cho glass effect
        shadowRadius: 16, // Tăng shadow radius
        elevation: 16, // Tăng elevation cho Android
        maxWidth: screenWidth - 32,
        overflow: 'hidden', // Clip content for glass effect
        position: 'relative',
    },
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '200%',
        height: '100%',
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8, // Tăng padding một chút
        minHeight: 60, // Tăng min height để chứa text
    },
    iconContainer: {
        marginRight: 4,
        alignItems: 'center',
        justifyContent: 'center',
        width: 55, // Giảm size
        height: 55,
        position: 'relative',
    },
    radialBackground: {
        position: 'absolute',
        width: 42,
        height: 42,
        borderRadius: 21,
        overflow: 'visible', // Cho phép gradient tràn ra ngoài
    },
    radialLayer1: {
        position: 'absolute',
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    iconInnerContainer: {
        width: 26,
        height: 26,
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
        marginRight: 8,
    },
});

export default SimpleToast;
