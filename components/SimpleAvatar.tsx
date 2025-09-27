import { User } from 'lucide-react-native';
import React from 'react';
import { Image, View } from 'react-native';

interface SimpleAvatarProps {
    avatarUrl?: string;
    size?: number;
    iconSize?: number;
    iconColor?: string;
}

const SimpleAvatar: React.FC<SimpleAvatarProps> = ({
    avatarUrl,
    size = 48,
    iconSize = 24,
    iconColor = '#9CA3AF',
}) => {
    const borderRadius = size / 2;

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: borderRadius,
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
                        width: size,
                        height: size,
                        borderRadius: borderRadius,
                    }}
                />
            ) : (
                <User
                    size={iconSize}
                    color={iconColor}
                />
            )}
        </View>
    );
};

export default SimpleAvatar;
