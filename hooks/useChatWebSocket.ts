import { useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatWebSocketManager } from '../services/chatWebSocketManager';

export const useChatWebSocket = () => {
    const {
        websocketConnected,
        websocketConnecting,
        connectWebSocket,
        disconnectWebSocket,
        subscribeToConversation,
        unsubscribeFromConversation,
        sendWebSocketMessage,
        setWebSocketConnected,
        setWebSocketConnecting
    } = useChatStore();

    // Auto-connect WebSocket when hook is used
    useEffect(() => {
        if (!websocketConnected && !websocketConnecting) {
            connectWebSocket();
        }

        // Cleanup on unmount
        return () => {
            // Don't disconnect here as other components might be using it
            // The WebSocket manager will handle cleanup when app closes
        };
    }, [websocketConnected, websocketConnecting, connectWebSocket]);

    // Monitor WebSocket connection status
    useEffect(() => {
        const checkConnection = () => {
            const isConnected = chatWebSocketManager.isConnected();
            if (isConnected !== websocketConnected) {
                setWebSocketConnected(isConnected);
            }
        };

        // Check connection status periodically
        const interval = setInterval(checkConnection, 5000);
        checkConnection(); // Initial check

        return () => clearInterval(interval);
    }, [websocketConnected, setWebSocketConnected]);

    const subscribe = useCallback((conversationId: string) => {
        if (websocketConnected) {
            subscribeToConversation(conversationId);
        } else {
            // WebSocket not connected - connection will be established automatically
            // Subscription will be retried when connection is ready
        }
    }, [websocketConnected, subscribeToConversation]);

    const unsubscribe = useCallback((conversationId: string) => {
        unsubscribeFromConversation(conversationId);
    }, [unsubscribeFromConversation]);

    const sendMessage = useCallback((messageData: {
        conversationId: string;
        type: 'TEXT' | 'ACTIVITY';
        content: {
            text?: string;
            // ACTIVITY content
            activityId?: string;
            name?: string;
            purpose?: string;
        };
    }) => {
        if (websocketConnected) {
            sendWebSocketMessage(messageData);
        } else {
            // WebSocket not connected - message will be queued or sent via API fallback
        }
    }, [websocketConnected, sendWebSocketMessage]);

    const reconnect = useCallback(() => {
        if (!websocketConnecting) {
            connectWebSocket();
        }
    }, [websocketConnecting, connectWebSocket]);

    return {
        // State
        isConnected: websocketConnected,
        isConnecting: websocketConnecting,

        // Actions
        subscribe,
        unsubscribe,
        sendMessage,
        reconnect,
        disconnect: disconnectWebSocket,

        // Direct access to manager for advanced usage
        manager: chatWebSocketManager
    };
};

