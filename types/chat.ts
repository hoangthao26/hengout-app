// Chat Types
export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    content: {
        text?: string;
        imageUrl?: string;
        fileName?: string;
        fileUrl?: string;
    };
    status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    createdAt: string;
    updatedAt?: string;
    mine: boolean;
}

export interface ChatConversation {
    id: string;
    type: 'PRIVATE' | 'GROUP';
    name: string;
    avatarUrl?: string;
    createdBy: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    memberCount: number;
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER';
    lastMessage?: ChatMessage;
    createdAt: string;
}

export interface ChatMember {
    userId: string;
    userName: string;
    avatarUrl?: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    joinedAt: string;
    isCurrentUser?: boolean;
}

export interface ChatPaginationResponse<T> {
    status: 'success' | 'error';
    data: T[];
    message: string;
    errorCode?: number;
    pagination?: {
        page: number;
        size: number;
        total: number;
        totalPages: number;
    };
}

export interface ChatResponse<T> {
    status: 'success' | 'error';
    data: T;
    message: string;
    errorCode?: number;
}

// Request Types
export interface SendMessageRequest {
    conversationId: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    content: {
        text?: string;
        imageUrl?: string;
        fileName?: string;
        fileUrl?: string;
    };
}

export interface CreateGroupRequest {
    name?: string;
    avatarUrl?: string;
    memberIds: string[];
}

export interface UpdateConversationNameRequest {
    name: string;
}

export interface UpdateConversationAvatarRequest {
    avatarUrl: string;
}

// Note: API endpoints are now configured in config/services.ts under SOCIAL_SERVICE
