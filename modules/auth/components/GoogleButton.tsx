import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import { Chrome } from 'lucide-react-native';

interface GoogleButtonProps {
    onPress: () => void;
    title: string;
    loading?: boolean;
    disabled?: boolean;
}

const GoogleButton: React.FC<GoogleButtonProps> = ({
    onPress,
    title,
    loading = false,
    disabled = false
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            className={`flex-row items-center justify-center border rounded-2xl px-5 py-4 ${isDark
                ? 'border-gray-600 bg-gray-800'
                : 'border-gray-300 bg-white'
                } ${disabled || loading ? 'opacity-50' : ''}`}
        >
            <Chrome
                size={24}
                color="#4285F4"
                style={{ marginRight: 16 }}
            />
            <Text
                style={{
                    fontSize: 16,
                    fontFamily: 'System',
                    fontWeight: '500',
                    color: isDark ? '#FFFFFF' : '#000000',
                }}
            >
                {loading ? 'Loading...' : title}
            </Text>
        </TouchableOpacity>
    );
};

export default GoogleButton;
