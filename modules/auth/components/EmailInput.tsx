import { Mail, XCircle } from 'lucide-react-native';
import React from 'react';
import { TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';

interface EmailInputProps {
    email: string;
    onEmailChange: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    isInputFocused?: boolean;
    error?: string;
    placeholder?: string;
}

const EmailInput: React.FC<EmailInputProps> = ({
    email,
    onEmailChange,
    onFocus,
    onBlur,
    isInputFocused = false,
    error,
    placeholder
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

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
                <Mail
                    size={24}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                    style={{ marginRight: 16 }}
                />
                <TextInput
                    value={email}
                    onChangeText={onEmailChange}
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
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {email.length > 0 && (
                    <TouchableOpacity onPress={() => onEmailChange('')}>
                        <XCircle
                            size={24}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default EmailInput;
