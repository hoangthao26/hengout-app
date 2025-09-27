import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, View } from 'react-native';
import { User } from 'lucide-react-native';

interface AvatarGradientBorderProps {
    avatarUrl?: string;
    size?: number;
    iconSize?: number;
    iconColor?: string;
}

const GRADIENT_COLORS = ["#FAA307", "#F48C06", "#DC2F02", "#9D0208"] as [string, string, ...string[]];
const GRADIENT_LOCATIONS = [0, 0.31, 0.69, 1] as [number, number, ...number[]];
const GRADIENT_START = { x: 0, y: 1 };
const GRADIENT_END = { x: 1, y: 0 };

const AvatarGradientBorder: React.FC<AvatarGradientBorderProps> = ({
    avatarUrl,
    size = 48,
    iconSize = 24,
    iconColor = '#9CA3AF',
}) => {
    const borderRadius = size / 2;
    const borderWidth = 3;

    return (
        <View style={{ width: size, height: size }}>
            <LinearGradient
                colors={GRADIENT_COLORS}
                locations={GRADIENT_LOCATIONS}
                start={GRADIENT_START}
                end={GRADIENT_END}
                style={{
                    width: size,
                    height: size,
                    borderRadius: borderRadius,
                    padding: borderWidth,
                }}
            >
                <View
                    style={{
                        width: size - (borderWidth * 2),
                        height: size - (borderWidth * 2),
                        borderRadius: borderRadius - borderWidth,
                        backgroundColor: '#E5E7EB',
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}
                >
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={{
                                width: size - (borderWidth * 2),
                                height: size - (borderWidth * 2),
                                borderRadius: borderRadius - borderWidth,
                            }}
                        />
                    ) : (
                        <User
                            size={iconSize}
                            color={iconColor}
                        />
                    )}
                </View>
            </LinearGradient>
        </View>
    );
};

export default AvatarGradientBorder;

