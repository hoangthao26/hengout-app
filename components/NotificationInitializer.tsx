import React, { useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { notificationManager } from '../services/notificationManager';
import { useChatStore } from '../store/chatStore';

interface NotificationInitializerProps {
    children: React.ReactNode;
}

const NotificationInitializer: React.FC<NotificationInitializerProps> = ({ children }) => {
    const toastContext = useToast();
    const router = useRouter();
    const currentConversationId = useChatStore(state => state.currentConversation?.id);

    useEffect(() => {
        // Initialize notification manager with toast context and router
        try {
            notificationManager.initialize(toastContext, router);
            console.log('🔔 [NotificationInitializer] Notification manager initialized with toast context and router');
        } catch (error) {
            console.error('❌ [NotificationInitializer] Failed to initialize notification manager:', error);
        }
    }, [toastContext, router]);

    // Update current conversation ID in notification manager when it changes
    useEffect(() => {
        console.log('🔔 [NotificationInitializer] Current conversation ID changed:', currentConversationId);
        notificationManager.setCurrentConversation(currentConversationId || null);
    }, [currentConversationId]);

    return <>{children}</>;
};

export default NotificationInitializer;
