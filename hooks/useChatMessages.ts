import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { chatService } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import { ChatConversation, ChatMessage } from '../types/chat';

interface UseChatMessagesOptions {
    conversationId: string;
    autoLoad?: boolean;
    pageSize?: number;
}

interface UseChatMessagesReturn {
    // Data
    messages: ChatMessage[];
    conversation: ChatConversation | null;

    // Loading states
    isLoading: boolean;
    isLoadingMore: boolean;
    isSending: boolean;

    // Error states
    error: string | null;

    // Actions
    loadMessages: (page?: number, append?: boolean) => Promise<void>;
    loadMoreMessages: () => Promise<void>;
    sendMessage: (content: string) => Promise<boolean>;
    refreshMessages: () => Promise<void>;

    // Pagination
    hasMoreMessages: boolean;
    currentPage: number;
}

export const useChatMessages = ({
    conversationId,
    autoLoad = true,
    pageSize = 20
}: UseChatMessagesOptions): UseChatMessagesReturn => {
    const { error: showError } = useToast();

    // Store hooks
    const {
        conversationMessages,
        currentConversation,
        messagesLoading,
        messagesError,
        setConversationMessages,
        addConversationMessage,
        setMessagesLoading,
        setMessagesError,
        setCurrentConversation,
        clearUnreadCount
    } = useChatStore();

    // Local state
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    // Get current conversation data
    const currentMessages = conversationMessages[conversationId] || [];
    const isLoading = messagesLoading[conversationId] || false;
    const error = messagesError[conversationId];

    // Load conversation details
    const loadConversation = useCallback(async () => {
        if (!conversationId) return;

        try {
            const response = await chatService.getConversation(conversationId);
            if (response.status === 'success') {
                setCurrentConversation(response.data);
            }
        } catch (err: any) {
            console.error('Failed to load conversation:', err);
            showError('Không thể tải thông tin cuộc trò chuyện');
        }
    }, [conversationId, setCurrentConversation, showError]);

    // Load messages with pagination
    const loadMessages = useCallback(async (page: number = 0, append: boolean = false) => {
        if (!conversationId) return;

        try {
            if (append) {
                setIsLoadingMore(true);
            } else {
                setMessagesLoading(conversationId, true);
            }
            setMessagesError(conversationId, null);

            const response = await chatService.getMessages(conversationId, page, pageSize);

            if (response.status === 'success') {
                const newMessages = response.data;

                if (append) {
                    // Prepend older messages
                    setConversationMessages(conversationId, [...newMessages, ...currentMessages]);
                } else {
                    // Replace with new messages (initial load)
                    setConversationMessages(conversationId, newMessages);
                }

                // Update pagination state
                setCurrentPage(page);
                setHasMoreMessages(newMessages.length === pageSize);
            } else {
                setMessagesError(conversationId, 'Không thể tải tin nhắn');
            }
        } catch (err: any) {
            console.error('Failed to load messages:', err);
            setMessagesError(conversationId, 'Lỗi khi tải tin nhắn');
        } finally {
            if (append) {
                setIsLoadingMore(false);
            } else {
                setMessagesLoading(conversationId, false);
            }
        }
    }, [
        conversationId,
        currentMessages,
        pageSize,
        setConversationMessages,
        setMessagesLoading,
        setMessagesError
    ]);

    // Load more messages (pagination)
    const loadMoreMessages = useCallback(async () => {
        if (!isLoadingMore && hasMoreMessages && currentMessages.length > 0) {
            const nextPage = currentPage + 1;
            await loadMessages(nextPage, true);
        }
    }, [isLoadingMore, hasMoreMessages, currentMessages.length, currentPage, loadMessages]);

    // Send message
    const sendMessage = useCallback(async (content: string): Promise<boolean> => {
        if (!content.trim() || !conversationId || isSending) return false;

        const messageContent = content.trim();
        setIsSending(true);

        try {
            const response = await chatService.sendMessage({
                conversationId,
                type: 'TEXT',
                content: { text: messageContent }
            });

            if (response.status === 'success') {
                // Add message to store
                addConversationMessage(conversationId, response.data);
                return true;
            } else {
                showError('Không thể gửi tin nhắn');
                return false;
            }
        } catch (err: any) {
            console.error('Failed to send message:', err);
            showError('Lỗi khi gửi tin nhắn');
            return false;
        } finally {
            setIsSending(false);
        }
    }, [conversationId, isSending, addConversationMessage, showError]);

    // Refresh messages
    const refreshMessages = useCallback(async () => {
        await loadMessages(0, false);
    }, [loadMessages]);

    // Auto load on mount
    useEffect(() => {
        if (autoLoad && conversationId) {
            loadConversation();
            loadMessages();
            clearUnreadCount(conversationId);
        }
    }, [autoLoad, conversationId, loadConversation, loadMessages, clearUnreadCount]);

    return {
        // Data
        messages: currentMessages,
        conversation: currentConversation,

        // Loading states
        isLoading,
        isLoadingMore,
        isSending,

        // Error states
        error,

        // Actions
        loadMessages,
        loadMoreMessages,
        sendMessage,
        refreshMessages,

        // Pagination
        hasMoreMessages,
        currentPage
    };
};
