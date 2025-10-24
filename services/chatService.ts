import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import {
    ChatConversation,
    ChatMember,
    ChatMessage,
    ChatPaginationResponse,
    ChatResponse,
    CreateGroupRequest,
    SendMessageRequest,
    UpdateConversationAvatarRequest,
    UpdateConversationNameRequest
} from '../types/chat';

class ChatService {
    private readonly baseUrl = SERVICES_CONFIG.SOCIAL_SERVICE.BASE_URL;

    // ==================== CONVERSATIONS ====================

    /**
     * Get all conversations for the current user
     * GET /api/v1/chat/conversations
     */
    async getConversations(): Promise<ChatResponse<ChatConversation[]>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_CONVERSATIONS');
            const response = await axiosInstance.get<ChatResponse<ChatConversation[]>>(endpoint);
            return response.data;
        } catch (error: any) {
            // 🚀 DEFENSIVE: Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                console.log('ℹ️ [ChatService] User logged out, skipping conversation fetch');
                return { status: 'success', data: [], message: 'User logged out' };
            }
            console.error('Failed to get conversations:', error);
            throw error;
        }
    }

    /**
     * Get specific conversation details
     * GET /api/v1/chat/conversations/{conversationId}
     */
    async getConversation(conversationId: string): Promise<ChatResponse<ChatConversation>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_CONVERSATION').replace(':conversationId', conversationId);
            const response = await axiosInstance.get<ChatResponse<ChatConversation>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new group conversation
     * POST /api/v1/chat/conversations/group
     */
    async createGroupConversation(data: CreateGroupRequest): Promise<ChatResponse<ChatConversation>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'CREATE_GROUP');
            const response = await axiosInstance.post<ChatResponse<ChatConversation>>(endpoint, data);
            return response.data;
        } catch (error: any) {
            console.error('Failed to create group conversation:', error);
            throw error;
        }
    }

    /**
     * Update conversation name
     * PUT /api/v1/chat/conversations/{conversationId}/name
     */
    async updateConversationName(conversationId: string, data: UpdateConversationNameRequest): Promise<ChatResponse<string>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'UPDATE_CONVERSATION_NAME').replace(':conversationId', conversationId);
            const response = await axiosInstance.put<ChatResponse<string>>(endpoint, data);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to update conversation name ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Update conversation avatar
     * PUT /api/v1/chat/conversations/{conversationId}/avatar
     */
    async updateConversationAvatar(conversationId: string, data: UpdateConversationAvatarRequest): Promise<ChatResponse<string>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'UPDATE_CONVERSATION_AVATAR').replace(':conversationId', conversationId);
            const response = await axiosInstance.put<ChatResponse<string>>(endpoint, data);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to update conversation avatar ${conversationId}:`, error);
            throw error;
        }
    }

    // ==================== MESSAGES ====================

    /**
     * Get messages from a conversation with pagination
     * GET /api/v1/chat/conversations/{conversationId}/messages
     */
    async getMessages(
        conversationId: string,
        page: number = 0,
        size: number = 20
    ): Promise<ChatPaginationResponse<ChatMessage>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_MESSAGES').replace(':conversationId', conversationId);
            const response = await axiosInstance.get<ChatPaginationResponse<ChatMessage>>(endpoint, {
                params: { page, size }
            });
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get messages for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Send a message to a conversation
     * POST /api/v1/chat/messages
     */
    async sendMessage(data: SendMessageRequest): Promise<ChatResponse<ChatMessage>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'SEND_MESSAGE');
            const response = await axiosInstance.post<ChatResponse<ChatMessage>>(endpoint, data);
            return response.data;
        } catch (error: any) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }

    // ==================== MEMBERS ====================

    /**
     * Get all members of a group conversation
     * GET /api/v1/chat/conversations/{conversationId}/members
     */
    async getGroupMembers(conversationId: string): Promise<ChatResponse<ChatMember[]>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_GROUP_MEMBERS').replace(':conversationId', conversationId);
            const response = await axiosInstance.get<ChatResponse<ChatMember[]>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get group members for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Add a member to a group conversation (Owner only)
     * POST /api/v1/chat/conversations/{conversationId}/members/{memberId}
     */
    async addMember(conversationId: string, memberId: string): Promise<ChatResponse<string>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'ADD_MEMBER')
                .replace(':conversationId', conversationId)
                .replace(':memberId', memberId);
            const response = await axiosInstance.post<ChatResponse<string>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to add member ${memberId} to conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a member from a group conversation (Owner only)
     * DELETE /api/v1/chat/conversations/{conversationId}/members/{memberId}
     */
    async removeMember(conversationId: string, memberId: string): Promise<ChatResponse<string>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'REMOVE_MEMBER')
                .replace(':conversationId', conversationId)
                .replace(':memberId', memberId);
            const response = await axiosInstance.delete<ChatResponse<string>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to remove member ${memberId} from conversation ${conversationId}:`, error);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Format message content for display
     */
    formatMessageContent(message: ChatMessage): string {
        switch (message.type) {
            case 'TEXT':
                return message.content.text || '';
            case 'ACTIVITY':
                return `🎯 ${message.content.name || 'Hoạt động'}`;
            default:
                return 'Tin nhắn không xác định';
        }
    }

    /**
     * Check if user can perform action based on role
     */
    canPerformAction(userRole: string, action: 'add_member' | 'remove_member' | 'update_name' | 'update_avatar'): boolean {
        switch (action) {
            case 'add_member':
            case 'remove_member':
                return userRole === 'OWNER';
            case 'update_name':
            case 'update_avatar':
                return ['OWNER', 'ADMIN', 'MEMBER'].includes(userRole);
            default:
                return false;
        }
    }

    /**
     * Get conversation display name
     */
    getConversationDisplayName(conversation: ChatConversation): string {
        if (conversation.type === 'GROUP') {
            return conversation.name;
        }
        // For private conversations, you might want to show the other person's name
        // This would require additional logic to get the other participant's name
        return conversation.name || 'Cuộc trò chuyện riêng tư';
    }

    /**
     * Get conversation avatar
     */
    getConversationAvatar(conversation: ChatConversation): string | undefined {
        return conversation.avatarUrl;
    }

    /**
     * Format last message for conversation list
     */
    formatLastMessage(conversation: ChatConversation): string {
        if (!conversation.lastMessage) {
            return 'Chưa có tin nhắn';
        }

        const message = conversation.lastMessage;

        // For GROUP conversations, always show sender name
        if (conversation.type === 'GROUP') {
            const prefix = message.mine ? 'Bạn: ' : `${message.senderName}: `;
            return prefix + this.formatMessageContent(message);
        }

        // For FRIEND conversations, only show "Bạn: " for own messages
        const prefix = message.mine ? 'Bạn: ' : '';
        return prefix + this.formatMessageContent(message);
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp: string): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffInHours < 168) { // 7 days
            return date.toLocaleDateString('vi-VN', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
        }
    }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
