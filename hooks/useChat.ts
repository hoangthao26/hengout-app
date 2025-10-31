import { useCallback, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { chatService } from '../services/chatService';
import { useChatStore } from '../store/chatStore';
import {
    ChatMember,
    ChatMessage,
    CreateGroupRequest,
    SendMessageRequest,
    UpdateConversationAvatarRequest,
    UpdateConversationNameRequest
} from '../types/chat';

export const useChat = () => {
    const { success: showSuccess, error: showError } = useToast();

    // Zustand store
    const {
        conversations,
        currentConversation,
        conversationsLoading,
        conversationsError,
        conversationMessages,
        messagesLoading,
        messagesError,
        members,
        membersLoading,
        membersError,
        selectedConversationId,
        isTyping,
        unreadCount,

        // Actions
        setConversations,
        addConversation,
        updateConversation,
        removeConversation,
        setCurrentConversation,
        setConversationsLoading,
        setConversationsError,
        setConversationMessages,
        addConversationMessage,
        setMessagesLoading,
        setMessagesError,
        setMembers,
        setMembersLoading,
        setMembersError,
        setSelectedConversationId,
        setIsTyping,
        setUnreadCount,
        incrementUnreadCount,
        clearUnreadCount,
        reset
    } = useChatStore();

    // ==================== CONVERSATIONS ====================

    const loadConversations = useCallback(async () => {
        try {
            setConversationsLoading(true);
            setConversationsError(null);

            const response = await chatService.getConversations();

            if (response.status === 'success') {
                setConversations(response.data);
            } else {
                setConversationsError(response.message || 'Không thể tải danh sách cuộc trò chuyện');
                showError(response.message || 'Không thể tải danh sách cuộc trò chuyện');
            }
        } catch (error: any) {
            // DEFENSIVE: Don't show error if user logged out
            if (error.message?.includes('User logged out')) {
                console.log('[useChat] User logged out, skipping conversation load');
                return;
            }
            console.error('Failed to load conversations:', error);
            const errorMessage = error.message || 'Không thể tải danh sách cuộc trò chuyện';
            setConversationsError(errorMessage);
            showError(errorMessage);
        } finally {
            setConversationsLoading(false);
        }
    }, [setConversations, setConversationsLoading, setConversationsError, showError]);

    const loadConversation = useCallback(async (conversationId: string) => {
        try {
            const response = await chatService.getConversation(conversationId);

            if (response.status === 'success') {
                setCurrentConversation(response.data);
                return response.data;
            } else {
                const errorMessage = response.message || 'Không thể tải thông tin cuộc trò chuyện';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to load conversation:', error);
            const errorMessage = error.message || 'Không thể tải thông tin cuộc trò chuyện';
            showError(errorMessage);
            throw error;
        }
    }, [setCurrentConversation, showError]);

    const createGroupConversation = useCallback(async (data: CreateGroupRequest) => {
        try {
            const response = await chatService.createGroupConversation(data);

            if (response.status === 'success') {
                addConversation(response.data);
                showSuccess('Tạo nhóm trò chuyện thành công');
                return response.data;
            } else {
                const errorMessage = response.message || 'Không thể tạo nhóm trò chuyện';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to create group conversation:', error);
            const errorMessage = error.message || 'Không thể tạo nhóm trò chuyện';
            showError(errorMessage);
            throw error;
        }
    }, [addConversation, showSuccess, showError]);

    const updateConversationName = useCallback(async (conversationId: string, data: UpdateConversationNameRequest) => {
        try {
            const response = await chatService.updateConversationName(conversationId, data);

            if (response.status === 'success') {
                updateConversation(conversationId, { name: data.name });
                showSuccess('Cập nhật tên cuộc trò chuyện thành công');
            } else {
                const errorMessage = response.message || 'Không thể cập nhật tên cuộc trò chuyện';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to update conversation name:', error);
            const errorMessage = error.message || 'Không thể cập nhật tên cuộc trò chuyện';
            showError(errorMessage);
            throw error;
        }
    }, [updateConversation, showSuccess, showError]);

    const updateConversationAvatar = useCallback(async (conversationId: string, data: UpdateConversationAvatarRequest) => {
        try {
            const response = await chatService.updateConversationAvatar(conversationId, data);

            if (response.status === 'success') {
                updateConversation(conversationId, { avatarUrl: data.avatarUrl });
                showSuccess('Cập nhật avatar cuộc trò chuyện thành công');
            } else {
                const errorMessage = response.message || 'Không thể cập nhật avatar cuộc trò chuyện';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to update conversation avatar:', error);
            const errorMessage = error.message || 'Không thể cập nhật avatar cuộc trò chuyện';
            showError(errorMessage);
            throw error;
        }
    }, [updateConversation, showSuccess, showError]);

    // ==================== MESSAGES ====================

    const loadMessages = useCallback(async (conversationId: string, page: number = 0, size: number = 20) => {
        try {
            setMessagesLoading(conversationId, true);
            setMessagesError(conversationId, null);

            const response = await chatService.getMessages(conversationId, page, size);

            if (response.status === 'success') {
                if (page === 0) {
                    // Replace messages for first page
                    setConversationMessages(conversationId, response.data);
                } else {
                    // Append messages for pagination
                    const currentMessages = conversationMessages[conversationId] || [];
                    setConversationMessages(conversationId, [...currentMessages, ...response.data]);
                }
                return response.data;
            } else {
                const errorMessage = response.message || 'Không thể tải tin nhắn';
                setMessagesError(conversationId, errorMessage);
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to load messages:', error);
            const errorMessage = error.message || 'Không thể tải tin nhắn';
            setMessagesError(conversationId, errorMessage);
            showError(errorMessage);
            throw error;
        } finally {
            setMessagesLoading(conversationId, false);
        }
    }, [conversationMessages, setConversationMessages, setMessagesLoading, setMessagesError, showError]);

    const sendMessage = useCallback(async (data: SendMessageRequest) => {
        try {
            const response = await chatService.sendMessage(data);

            if (response.status === 'success') {
                addConversationMessage(data.conversationId, response.data);

                // Update conversation's last message
                updateConversation(data.conversationId, {
                    lastMessage: response.data
                });

                return response.data;
            } else {
                const errorMessage = response.message || 'Không thể gửi tin nhắn';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to send message:', error);
            const errorMessage = error.message || 'Không thể gửi tin nhắn';
            showError(errorMessage);
            throw error;
        }
    }, [addConversationMessage, updateConversation, showError]);

    // ==================== MEMBERS ====================

    const loadGroupMembers = useCallback(async (conversationId: string) => {
        try {
            setMembersLoading(conversationId, true);
            setMembersError(conversationId, null);

            const response = await chatService.getGroupMembers(conversationId);

            if (response.status === 'success') {
                setMembers(conversationId, response.data);
                return response.data;
            } else {
                const errorMessage = response.message || 'Không thể tải danh sách thành viên';
                setMembersError(conversationId, errorMessage);
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to load group members:', error);
            const errorMessage = error.message || 'Không thể tải danh sách thành viên';
            setMembersError(conversationId, errorMessage);
            showError(errorMessage);
            throw error;
        } finally {
            setMembersLoading(conversationId, false);
        }
    }, [setMembers, setMembersLoading, setMembersError, showError]);

    const addMemberToGroup = useCallback(async (conversationId: string, memberId: string) => {
        try {
            const response = await chatService.addMember(conversationId, memberId);

            if (response.status === 'success') {
                showSuccess('Thêm thành viên thành công');
                // Reload members to get updated list
                await loadGroupMembers(conversationId);
            } else {
                const errorMessage = response.message || 'Không thể thêm thành viên';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to add member:', error);
            const errorMessage = error.message || 'Không thể thêm thành viên';
            showError(errorMessage);
            throw error;
        }
    }, [loadGroupMembers, showSuccess, showError]);

    const removeMemberFromGroup = useCallback(async (conversationId: string, memberId: string) => {
        try {
            const response = await chatService.removeMember(conversationId, memberId);

            if (response.status === 'success') {
                showSuccess('Xóa thành viên thành công');
                // Reload members to get updated list
                await loadGroupMembers(conversationId);
            } else {
                const errorMessage = response.message || 'Không thể xóa thành viên';
                showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Failed to remove member:', error);
            const errorMessage = error.message || 'Không thể xóa thành viên';
            showError(errorMessage);
            throw error;
        }
    }, [loadGroupMembers, showSuccess, showError]);

    // ==================== UTILITY ====================

    const selectConversation = useCallback((conversationId: string | null) => {
        setSelectedConversationId(conversationId);
        if (conversationId) {
            clearUnreadCount(conversationId);
        }
    }, [setSelectedConversationId, clearUnreadCount]);

    const getConversationMessages = useCallback((conversationId: string): ChatMessage[] => {
        return conversationMessages[conversationId] || [];
    }, [conversationMessages]);

    const getConversationMembers = useCallback((conversationId: string): ChatMember[] => {
        return members[conversationId] || [];
    }, [members]);

    const getTotalUnreadCount = useCallback((): number => {
        return Object.values(unreadCount).reduce((total, count) => total + count, 0);
    }, [unreadCount]);

    // ==================== EFFECTS ====================

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    return {
        // State
        conversations,
        currentConversation,
        conversationsLoading,
        conversationsError,
        conversationMessages,
        messagesLoading,
        messagesError,
        members,
        membersLoading,
        membersError,
        selectedConversationId,
        isTyping,
        unreadCount,

        // Actions
        loadConversations,
        loadConversation,
        createGroupConversation,
        updateConversationName,
        updateConversationAvatar,
        loadMessages,
        sendMessage,
        loadGroupMembers,
        addMemberToGroup,
        removeMemberFromGroup,
        selectConversation,
        getConversationMessages,
        getConversationMembers,
        getTotalUnreadCount,
        reset
    };
};
