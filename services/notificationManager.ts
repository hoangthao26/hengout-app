import { ChatMessage, ChatConversation } from '../types/chat';
import { useNotificationStore } from '../store/notificationStore';
import { useToast } from '../contexts/ToastContext';
import { useChatStore } from '../store/chatStore';
import { useRouter } from 'expo-router';

class NotificationManager {
    private static instance: NotificationManager;
    private toastContext: any = null;
    private router: any = null;
    private currentConversationId: string | null = null;
    private messageData: Map<string, { conversation: ChatConversation; message: ChatMessage; actualToastId?: string }> = new Map();

    private constructor() { }

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    // Initialize with required dependencies
    initialize(toastContext: any, router: any) {
        this.toastContext = toastContext;
        this.router = router;
    }

    // Set current conversation (to avoid showing notifications for current conversation)
    setCurrentConversation(conversationId: string | null) {
        this.currentConversationId = conversationId;
    }

    // Handle new message notification
    handleNewMessage(message: ChatMessage, conversation: ChatConversation) {
        const notificationStore = useNotificationStore.getState();

        // Don't show notification if it's the current conversation
        if (this.currentConversationId === conversation.id) {
            // Still increment unread count but don't show toast
            notificationStore.incrementUnreadCount(conversation.id);
            return;
        }

        // Don't show notification if user sent the message
        if (message.senderId === 'current-user-id') { // TODO: Get from auth store
            return;
        }

        // Don't show notification if in-app notifications are disabled
        if (!notificationStore.isInAppNotificationEnabled) {
            return;
        }

        // Increment unread count
        notificationStore.incrementUnreadCount(conversation.id);

        // Show in-app notification toast
        this.showMessageNotification(message, conversation);

        // Play sound if enabled
        if (notificationStore.isSoundEnabled) {
            this.playNotificationSound();
        }

        // Vibrate if enabled
        if (notificationStore.isVibrationEnabled) {
            this.vibrate();
        }
    }

    // Show message notification toast
    private showMessageNotification(message: ChatMessage, conversation: ChatConversation) {
        if (!this.toastContext) {
            return;
        }

        const notificationStore = useNotificationStore.getState();

        // Check if notification is already active for this conversation
        if (notificationStore.activeNotifications.includes(conversation.id)) {
            this.updateExistingToast(conversation, message);
            return;
        }

        // Add to active notifications
        notificationStore.addActiveNotification(conversation.id);

        // Use conversation ID as toast ID for consistency
        const toastId = conversation.id;

        // Show custom message toast with conversation ID as toast ID
        this.toastContext.showToast({
            id: toastId,
            type: 'message',
            title: this.getConversationName(conversation),
            message: this.getMessagePreview(message),
            duration: 5000,
            position: 'top',
            onPress: () => this.navigateToConversation(conversation.id),
            conversationData: conversation,
            messageData: message,
        });
    }

    // Update existing toast with new message
    private updateExistingToast(conversation: ChatConversation, message: ChatMessage) {
        const toastId = conversation.id;

        if (this.toastContext && this.toastContext.updateToast) {
            this.toastContext.updateToast(toastId, {
                title: this.getConversationName(conversation),
                message: this.getMessagePreview(message),
                conversationData: conversation,
                messageData: message,
                duration: 5000,
            });
        }
    }

    // Navigate to conversation
    private navigateToConversation(conversationId: string) {
        if (!this.router || !conversationId) {
            return;
        }

        try {
            this.router.replace('/(tabs)/chat');

            requestAnimationFrame(() => {
                try {
                    this.router.push(`/chat/${conversationId}`);
                } catch (pushError) {
                    console.error('[NotificationManager] Failed to push to conversation:', pushError);
                    this.router.replace(`/chat/${conversationId}`);
                }
            });
        } catch (error) {
            console.error('[NotificationManager] Failed to navigate to conversation:', error);
        }
    }

    // Get conversation name
    private getConversationName(conversation: ChatConversation): string {
        if (conversation.type === 'PRIVATE') {
            return conversation.name || 'Unknown User';
        }
        return conversation.name || 'Group Chat';
    }

    // Get message preview
    private getMessagePreview(message: ChatMessage): string {
        if (message.content?.text) {
            return message.content.text;
        }
        if (message.content?.name) {
            return message.content.name;
        }
        return 'New message';
    }

    // Play notification sound
    private playNotificationSound() {
        // TODO: Implement sound playing
    }

    // Vibrate device
    private vibrate() {
        // TODO: Implement vibration
    }

    // Mark conversation as read
    markConversationAsRead(conversationId: string) {
        const notificationStore = useNotificationStore.getState();
        notificationStore.resetUnreadCount(conversationId);
        notificationStore.removeActiveNotification(conversationId);

        // Hide toast for this conversation using conversation ID as toast ID
        if (this.toastContext) {
            this.toastContext.hideToast(conversationId);
        }
    }

    // Mark all conversations as read
    markAllConversationsAsRead() {
        const notificationStore = useNotificationStore.getState();
        notificationStore.resetAllUnreadCounts();
    }

    // Get unread count for conversation
    getUnreadCount(conversationId: string): number {
        const notificationStore = useNotificationStore.getState();
        return notificationStore.getUnreadCount(conversationId);
    }

    // Check if conversation has unread messages
    hasUnreadMessages(conversationId: string): boolean {
        const notificationStore = useNotificationStore.getState();
        return notificationStore.hasUnreadMessages(conversationId);
    }

    // Check if any conversation has unread messages
    hasAnyUnreadMessages(): boolean {
        const notificationStore = useNotificationStore.getState();
        return notificationStore.hasAnyUnreadMessages();
    }

    // Get total unread count
    getTotalUnreadCount(): number {
        const notificationStore = useNotificationStore.getState();
        return notificationStore.totalUnreadCount;
    }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
