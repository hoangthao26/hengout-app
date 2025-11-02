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

    /**
     * Send message with validation and error handling
     * 
     * Message sending flow:
     * 1. Validates message can be sent (non-empty, not already sending)
     * 2. Trims whitespace from message content (cleans user input)
     * 3. Sets sending state (prevents duplicate sends)
     * 4. Calls parent's send handler (onSendMessage)
     * 5. On success: Clears input field (ready for next message)
     * 6. On failure: Shows error alert (user feedback)
     * 7. Always resets sending state (ensures UI unblocks)
     * 
     * Validation checks:
     * - canSend: Combines messageText.trim().length > 0 AND !isSending
     * - Prevents sending empty messages or duplicate sends
     * 
     * Error handling:
     * - Catches and logs errors for debugging
     * - Shows user-friendly Vietnamese error message
     * - Does not clear message text on error (allows retry)
     * - Always resets isSending state (ensures UI unblocks)
     * 
     * State management:
     * - Clearing message on success provides clean slate for next message
     * - Preserving message on error allows user to retry without retyping
     * 
     * @throws Error if onSendMessage throws (error is caught and shown to user)
     */
    const sendMessage = useCallback(async () => {
        // Guard: Early exit if validation fails
        if (!canSend) return;

        const content = messageText.trim(); // Clean whitespace
        setIsSending(true); // Block duplicate sends

        try {
            const success = await onSendMessage(content);
            
            // Success: Clear input for next message
            if (success) {
                setMessageText('');
            }
        } catch (error) {
            // Error: Log for debugging and show user-friendly message
            console.error('[useChatInput] Failed to send message:', error);
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
            // Note: Message text preserved on error (allows retry)
        } finally {
            // Always reset sending state (ensures UI unblocks even on error)
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
