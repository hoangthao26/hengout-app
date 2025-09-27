import React, { useRef } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';

interface ChatInputProps {
    messageText: string;
    onMessageTextChange: (text: string) => void;
    onSendMessage: () => void;
    isSending?: boolean;
    canSend?: boolean;
    placeholder?: string;
    maxLength?: number;
    characterCount?: number;
    remainingCharacters?: number;
    showCharacterCount?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    messageText,
    onMessageTextChange,
    onSendMessage,
    isSending = false,
    canSend = false,
    placeholder = 'Nhập tin nhắn...',
    maxLength = 1000,
    characterCount = 0,
    remainingCharacters = 1000,
    showCharacterCount = false
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const inputRef = useRef<TextInput>(null);

    const handleSubmitEditing = () => {
        if (canSend && !isSending) {
            onSendMessage();
        }
    };

    const isNearLimit = remainingCharacters < 100;
    const isOverLimit = remainingCharacters < 0;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[
                styles.inputContainer,
                { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }
            ]}>
                {/* Character count indicator */}
                {showCharacterCount && (
                    <View style={styles.characterCountContainer}>
                        <Text style={[
                            styles.characterCount,
                            {
                                color: isOverLimit
                                    ? '#EF4444'
                                    : isNearLimit
                                        ? '#F59E0B'
                                        : isDark ? '#9CA3AF' : '#6B7280'
                            }
                        ]}>
                            {characterCount}/{maxLength}
                        </Text>
                    </View>
                )}

                {/* Input area */}
                <View style={styles.inputArea}>
                    <TextInput
                        ref={inputRef}
                        style={[
                            styles.messageInput,
                            {
                                color: isDark ? '#FFFFFF' : '#000000',
                                backgroundColor: isDark ? '#374151' : '#FFFFFF',
                                borderColor: isOverLimit
                                    ? '#EF4444'
                                    : isDark ? '#4B5563' : '#E5E7EB'
                            }
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={messageText}
                        onChangeText={onMessageTextChange}
                        multiline
                        maxLength={maxLength}
                        onSubmitEditing={handleSubmitEditing}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            {
                                backgroundColor: canSend && !isSending ? '#F48C06' : '#9CA3AF'
                            }
                        ]}
                        onPress={onSendMessage}
                        disabled={!canSend || isSending}
                        activeOpacity={0.7}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.sendButtonText}>Gửi</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Warning message for character limit */}
                {isOverLimit && (
                    <Text style={styles.warningText}>
                        Tin nhắn quá dài. Vui lòng rút gọn.
                    </Text>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    characterCountContainer: {
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    characterCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 12,
        maxHeight: 100,
        minHeight: 44,
        fontSize: 16,
        lineHeight: 20,
    },
    sendButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
        height: 44,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
});
