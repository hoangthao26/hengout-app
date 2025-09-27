import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleProp, ViewStyle, useColorScheme } from 'react-native';

interface BackButtonProps {
    onPress: () => void;
    color?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

const BackButton: React.FC<BackButtonProps> = ({
    onPress,
    color,
    size = 28,
    style,
}) => {
    const isDark = useColorScheme() === 'dark';
    const buttonColor = color || (isDark ? '#FFFFFF' : '#000000');

    return (
        <Pressable
            onPress={onPress}
            style={[
                {
                    padding: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                style,
            ]}
            hitSlop={8}
        >
            <ChevronLeft size={size} color={buttonColor} />
        </Pressable>
    );
};

export default BackButton;