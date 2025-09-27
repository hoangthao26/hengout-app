import React from 'react';
import { Pressable, StyleProp, ViewStyle, useColorScheme } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

interface AuthBackButtonProps {
    onPress: () => void;
    color?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

const AuthBackButton: React.FC<AuthBackButtonProps> = ({
    onPress,
    color,
    size = 32,
    style,
}) => {
    const isDark = useColorScheme() === 'dark';
    const buttonColor = color || (isDark ? '#FFFFFF' : '#000000');

    return (
        <Pressable
            onPress={onPress}
            style={[
                {
                    position: 'absolute',
                    top: 50,
                    left: 10,
                    zIndex: 10,
                    padding: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                style,
            ]}
            hitSlop={16}
        >
            <ChevronLeft size={size} color={buttonColor} />
        </Pressable>
    );
};

export default AuthBackButton;
