import { Eye, EyeOff, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import { TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

interface LoginPasswordInputProps {
    password: string;
    onPasswordChange: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    isInputFocused?: boolean;
    error?: string;
    placeholder?: string;
    showPasswordToggle?: boolean;
}

const LoginPasswordInput: React.FC<LoginPasswordInputProps> = ({
    password,
    onPasswordChange,
    onFocus,
    onBlur,
    isInputFocused = false,
    error,
    placeholder,
    showPasswordToggle = true
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <View className="w-full">
            <View
                className={`flex-row items-center border rounded-2xl px-5 py-4 ${error && !isInputFocused
                    ? 'border-red-500'
                    : isInputFocused
                        ? 'border-orange-500'
                        : isDark
                            ? 'border-gray-600 bg-gray-800'
                            : 'border-gray-300 bg-gray-50'
                    }`}
            >
                <Lock
                    size={24}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                    style={{ marginRight: 16 }}
                />
                <TextInput
                    value={password}
                    onChangeText={onPasswordChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    style={{
                        flex: 1,
                        fontSize: 17,
                        color: isDark ? '#FFFFFF' : '#000000',
                        fontFamily: 'System',
                        fontWeight: '400',
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="current-password"
                />
                {showPasswordToggle && (
                    <TouchableOpacity onPress={togglePasswordVisibility}>
                        {showPassword ? (
                            <EyeOff
                                size={24}
                                color={isDark ? '#9CA3AF' : '#6B7280'}
                            />
                        ) : (
                            <Eye
                                size={24}
                                color={isDark ? '#9CA3AF' : '#6B7280'}
                            />
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default LoginPasswordInput;
