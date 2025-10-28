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
        console.log('🔔 [NotificationManager] setCurrentConversation called:', {
            oldConversationId: this.currentConversationId,
            newConversationId: conversationId
        });
        this.currentConversationId = conversationId;
    }

    // Handle new message notification
    handleNewMessage(message: ChatMessage, conversation: ChatConversation) {
        console.log('🔔 [NotificationManager] handleNewMessage called:', {
            messageId: message.id,
            conversationId: conversation.id,
            conversationName: conversation.name,
            currentConversationId: this.currentConversationId,
            toastContext: !!this.toastContext,
            router: !!this.router
        });

        const notificationStore = useNotificationStore.getState();

        // Don't show notification if it's the current conversation
        if (this.currentConversationId === conversation.id) {
            console.log('🔔 [NotificationManager] Skipping notification - user is in this conversation');
            // Still increment unread count but don't show toast
            notificationStore.incrementUnreadCount(conversation.id);
            return;
        }

        // Don't show notification if user sent the message
        if (message.senderId === 'current-user-id') { // TODO: Get from auth store
            console.log('🔔 [NotificationManager] Skipping notification - user sent message');
            return;
        }

        // Don't show notification if in-app notifications are disabled
        if (!notificationStore.isInAppNotificationEnabled) {
            console.log('🔔 [NotificationManager] Skipping notification - in-app notifications disabled');
            return;
        }

        console.log('🔔 [NotificationManager] Showing notification...');

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
        console.log('🔔 [NotificationManager] showMessageNotification called:', {
            conversationId: conversation.id,
            conversationName: conversation.name,
            messageContent: this.getMessagePreview(message),
            toastContext: !!this.toastContext
        });

        if (!this.toastContext) {
            console.warn('❌ [NotificationManager] Toast context not initialized');
            return;
        }

        const notificationStore = useNotificationStore.getState();

        // Check if notification is already active for this conversation
        if (notificationStore.activeNotifications.includes(conversation.id)) {
            console.log('🔔 [NotificationManager] Updating existing notification for conversation:', conversation.id);

            // Update existing toast instead of creating new one
            this.updateExistingToast(conversation, message);
            return;
        }

        // Add to active notifications
        notificationStore.addActiveNotification(conversation.id);

        // Use conversation ID as toast ID for consistency
        const toastId = conversation.id;

        console.log('🔔 [NotificationManager] Showing new message toast...');
        console.log('🔔 [NotificationManager] Toast ID:', toastId);
        console.log('🔔 [NotificationManager] Toast data:', {
            id: toastId,
            type: 'message',
            title: this.getConversationName(conversation),
            message: this.getMessagePreview(message),
            duration: 5000
        });

        // Show custom message toast with conversation ID as toast ID
        const result = this.toastContext.showToast({
            id: toastId, // Use conversation ID as toast ID
            type: 'message', // Custom type for message notifications
            title: this.getConversationName(conversation),
            message: this.getMessagePreview(message),
            duration: 5000,
            position: 'top',
            onPress: () => this.navigateToConversation(conversation.id),
            // Store conversation and message data as custom properties
            conversationData: conversation,
            messageData: message,
        });

        console.log('🔔 [NotificationManager] showToast result:', result);
        console.log('🔔 [NotificationManager] Custom message toast shown with ID:', toastId);
    }

    // Update existing toast with new message
    private updateExistingToast(conversation: ChatConversation, message: ChatMessage) {
        console.log('🔔 [NotificationManager] Updating existing toast for conversation:', conversation.id);

        // Use conversation ID as toast ID
        const toastId = conversation.id;

        console.log('🔔 [NotificationManager] updateExistingToast - Toast ID:', toastId);
        console.log('🔔 [NotificationManager] updateExistingToast - Update data:', {
            title: this.getConversationName(conversation),
            message: this.getMessagePreview(message),
            duration: 5000
        });

        // Update toast content using conversation ID as toast ID
        if (this.toastContext && this.toastContext.updateToast) {
            console.log('🔔 [NotificationManager] Calling updateToast...');
            this.toastContext.updateToast(toastId, {
                title: this.getConversationName(conversation),
                message: this.getMessagePreview(message),
                conversationData: conversation,
                messageData: message,
                // Reset duration
                duration: 5000,
            });

            console.log('🔔 [NotificationManager] Toast updated with new message, ID:', toastId);
        } else {
            console.warn('❌ [NotificationManager] Toast context does not support updateToast');
        }
    }

    // Navigate to conversation
    private navigateToConversation(conversationId: string) {
        if (!this.router) {
            console.warn('NotificationManager: Router not initialized');
            return;
        }

        if (!conversationId) {
            console.warn('NotificationManager: Invalid conversationId');
            return;
        }

        try {
            console.log('🔔 [NotificationManager] Navigating to conversation:', conversationId);

            // Best Practice: Use replace instead of dismissAll + push for better UX
            // This prevents back button issues and creates cleaner navigation stack
            this.router.replace('/(tabs)/chat');

            // Use requestAnimationFrame for better timing than setTimeout
            requestAnimationFrame(() => {
                try {
                    this.router.push(`/chat/${conversationId}`);
                } catch (pushError) {
                    console.error('❌ [NotificationManager] Failed to push to conversation:', pushError);
                    // Fallback: try direct navigation
                    this.router.replace(`/chat/${conversationId}`);
                }
            });
        } catch (error) {
            console.error('❌ [NotificationManager] Failed to navigate to conversation:', error);
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
        // This would typically use a sound library like expo-av
        console.log('🔊 Playing notification sound');
    }

    // Vibrate device
    private vibrate() {
        // TODO: Implement vibration
        // This would typically use Haptics.vibrateAsync() from expo-haptics
        console.log('📳 Vibrating device');
    }

    // Mark conversation as read
    markConversationAsRead(conversationId: string) {
        console.log('🔔 [NotificationManager] Marking conversation as read:', conversationId);
        const notificationStore = useNotificationStore.getState();
        notificationStore.resetUnreadCount(conversationId);
        notificationStore.removeActiveNotification(conversationId);

        // Hide toast for this conversation using conversation ID as toast ID
        if (this.toastContext) {
            console.log('🔔 [NotificationManager] Hiding toast for conversation:', conversationId);
            this.toastContext.hideToast(conversationId);
        }

        console.log('✅ [NotificationManager] Conversation marked as read:', conversationId);
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
