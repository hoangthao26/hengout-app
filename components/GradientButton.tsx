import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
// Nếu bạn dùng NativeWind, có thể import cn nếu muốn merge className
// import { cn } from 'nativewind';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    className?: string;
    textClassName?: string;
    textFontSize?: number;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    minWidth?: number;
}

const GRADIENT_COLORS = ["#FAA307", "#F48C06", "#DC2F02", "#9D0208"] as [string, string, ...string[]];
const GRADIENT_LOCATIONS = [0, 0.31, 0.69, 1] as [number, number, ...number[]];
const GRADIENT_START = { x: 0, y: 1 };
const GRADIENT_END = { x: 1, y: 0 };

const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    className = '',
    textClassName = '',
    textFontSize,
    disabled,
    size = 'large',
    fullWidth = true,
    minWidth,
}) => {
    // Size configurations
    const sizeConfig = {
        small: {
            containerClass: fullWidth ? 'w-full' : 'self-start',
            paddingClass: 'py-2 px-4',
            borderRadius: 8,
            fontSize: textFontSize || 14,
        },
        medium: {
            containerClass: fullWidth ? 'w-full max-w-[200px]' : 'self-start',
            paddingClass: 'py-3 px-5',
            borderRadius: 12,
            fontSize: textFontSize || 16,
        },
        large: {
            containerClass: fullWidth ? 'w-full max-w-[360px]' : 'self-start',
            paddingClass: 'py-5 px-6',
            borderRadius: 16,
            fontSize: textFontSize || 18,
        },
    };

    const config = sizeConfig[size];

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className={`${config.containerClass} self-center ${className}`}
            style={{
                opacity: disabled ? 0.5 : 1,
                minWidth: minWidth
            }}
        >
            <LinearGradient
                colors={GRADIENT_COLORS}
                locations={GRADIENT_LOCATIONS}
                start={GRADIENT_START}
                end={GRADIENT_END}
                style={{ borderRadius: config.borderRadius }}
            >
                <View className={`${config.paddingClass} items-center`}>
                    <Text
                        style={{
                            fontSize: config.fontSize,
                            fontFamily: 'System',
                            fontWeight: '600',
                            color: '#FFFFFF'
                        }}
                    >
                        {title}
                    </Text>
                </View>
            </LinearGradient>
        </Pressable>
    );
};

export default GradientButton; 