import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface UseChatInputOptions {
    onSendMessage: (content: string) => Promise<boolean>;
    maxLength?: number;
    placeholder?: string;
}

interface UseChatInputReturn {
    // State
    messageText: string;
    isSending: boolean;

    // Actions
    setMessageText: (text: string) => void;
    sendMessage: () => Promise<void>;
    clearMessage: () => void;

    // Validation
    canSend: boolean;
    characterCount: number;
    remainingCharacters: number;
}

export const useChatInput = ({
    onSendMessage,
    maxLength = 1000,
    placeholder = 'Nhập tin nhắn...'
}: UseChatInputOptions): UseChatInputReturn => {
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Validation
    const canSend = messageText.trim().length > 0 && !isSending;
    const characterCount = messageText.length;
    const remainingCharacters = maxLength - characterCount;

    // Send message
    const sendMessage = useCallback(async () => {
        if (!canSend) return;

        const content = messageText.trim();
        setIsSending(true);

        try {
            const success = await onSendMessage(content);
            if (success) {
                setMessageText('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
        } finally {
            setIsSending(false);
        }
    }, [canSend, messageText, onSendMessage]);

    // Clear message
    const clearMessage = useCallback(() => {
        setMessageText('');
    }, []);

    // Handle text change with length validation
    const handleTextChange = useCallback((text: string) => {
        if (text.length <= maxLength) {
            setMessageText(text);
        }
    }, [maxLength]);

    return {
        messageText,
        isSending,
        setMessageText: handleTextChange,
        sendMessage,
        clearMessage,
        canSend,
        characterCount,
        remainingCharacters
    };
};
