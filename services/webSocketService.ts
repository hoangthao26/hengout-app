// WebSocket Service for Real-time Chat - Functional Approach

import { stompClient } from './stompClient';
import { AuthHelper } from './authHelper';
import {
    ConnectionStatus,
    WebSocketSubscription
} from '../types/webSocket';
import { ChatMessage } from '../types/chat';
import { StompClientConfig, StompConnectionHeaders } from '../types/stomp';

// State management using closures (no 'this' needed)
let connected = false;
let connectionStatus: ConnectionStatus = 'disconnected';
let subscriptions = new Map<string, WebSocketSubscription>();
let connectionCallbacks: ((status: ConnectionStatus) => void)[] = [];
let errorCallbacks: ((error: Error) => void)[] = [];
const WEBSOCKET_URL = 'wss://api.hengout.app/social-service/ws/native';

// Forward declarations for callback functions
const handleConnectionChange = (connected: boolean): void => {
    if (connected) {
        connected = true;
        setConnectionStatus('connected');
    } else {
        connected = false;
        setConnectionStatus('disconnected');
    }
};

const handleError = (error: Error): void => {
    connected = false;
    setConnectionStatus('error');
    notifyErrorCallbacks(error);
};

// Setup STOMP client callbacks
stompClient.onConnectionChange(handleConnectionChange);
stompClient.onError(handleError);

/**
 * Connect to WebSocket
 */
export const connect = async (): Promise<void> => {
    if (connected) {
        console.log('ℹ️ WebSocket already connected');
        return;
    }

    try {
        console.log('🔄 Connecting to WebSocket...');
        setConnectionStatus('connecting');

        // Get authentication headers
        const authHeaders = await getAuthHeaders();

        // Create STOMP configuration
        const stompConfig: StompClientConfig = {
            brokerURL: WEBSOCKET_URL,
            connectHeaders: authHeaders,
            debug: debugLog,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            reconnectDelay: 5000,
            maxReconnectAttempts: 5
        };

        // Connect to STOMP broker
        await stompClient.connect(stompConfig);

        connected = true;
        setConnectionStatus('connected');
        console.log('✅ WebSocket connected successfully');

    } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        connected = false;
        setConnectionStatus('error');
        throw error;
    }
};

/**
 * Disconnect from WebSocket
 */
export const disconnect = async (): Promise<void> => {
    if (!connected) {
        console.log('ℹ️ WebSocket already disconnected');
        return;
    }

    try {
        console.log('🔄 Disconnecting from WebSocket...');

        // Clear all subscriptions
        subscriptions.clear();

        // Disconnect STOMP client
        await stompClient.disconnect();

        connected = false;
        setConnectionStatus('disconnected');
        console.log('✅ WebSocket disconnected successfully');

    } catch (error) {
        console.error('❌ WebSocket disconnect failed:', error);
        throw error;
    }
};

/**
 * Reconnect to WebSocket
 */
export const reconnect = async (): Promise<void> => {
    console.log('🔄 Reconnecting to WebSocket...');
    await disconnect();
    await connect();
};

/**
 * Send message via WebSocket
 */
export const sendMessage = async (message: ChatMessage): Promise<void> => {
    if (!connected) {
        throw new Error('WebSocket not connected');
    }

    try {
        const destination = '/app/chat/message';
        const headers = {
            'destination': '/app/chat/message',
            'content-type': 'application/json',
            'content-length': JSON.stringify(message).length.toString()
        };
        const body = JSON.stringify(message);

        await stompClient.send(destination, headers, body);
        console.log('📤 Message sent via WebSocket:', message.id);

    } catch (error) {
        console.error('❌ Failed to send message via WebSocket:', error);
        throw error;
    }
};

/**
 * Subscribe to conversation
 */
export const subscribeToConversation = (conversationId: string, callback: (message: ChatMessage) => void): void => {
    if (!connected) {
        throw new Error('WebSocket not connected');
    }

    try {
        const destination = `/topic/conversation/${conversationId}`;

        // Create subscription
        stompClient.subscribe(destination, (stompMessage) => {
            try {
                const chatMessage: ChatMessage = JSON.parse(stompMessage.body);
                console.log('📥 Received message via WebSocket:', chatMessage.id);
                callback(chatMessage);
            } catch (error) {
                console.error('❌ Failed to parse message:', error);
            }
        });

        // Store subscription
        const webSocketSubscription: WebSocketSubscription = {
            id: conversationId,
            destination,
            callback
        };

        subscriptions.set(conversationId, webSocketSubscription);
        console.log('📥 Subscribed to conversation:', conversationId);

    } catch (error) {
        console.error('❌ Failed to subscribe to conversation:', error);
        throw error;
    }
};

/**
 * Unsubscribe from conversation
 */
export const unsubscribeFromConversation = (conversationId: string): void => {
    try {
        const subscription = subscriptions.get(conversationId);
        if (subscription) {
            stompClient.unsubscribe(conversationId);
            subscriptions.delete(conversationId);
            console.log('📤 Unsubscribed from conversation:', conversationId);
        }
    } catch (error) {
        console.error('❌ Failed to unsubscribe from conversation:', error);
    }
};

/**
 * Check if WebSocket is connected
 */
export const isConnected = (): boolean => {
    return connected && stompClient.isClientConnected();
};

/**
 * Get connection status
 */
export const getConnectionStatus = (): ConnectionStatus => {
    return connectionStatus;
};

/**
 * Add connection status change callback
 */
export const onConnectionChange = (callback: (status: ConnectionStatus) => void): void => {
    connectionCallbacks.push(callback);
};

/**
 * Add error callback
 */
export const onError = (callback: (error: Error) => void): void => {
    errorCallbacks.push(callback);
};

/**
 * Remove connection status change callback
 */
export const removeConnectionCallback = (callback: (status: ConnectionStatus) => void): void => {
    const index = connectionCallbacks.indexOf(callback);
    if (index > -1) {
        connectionCallbacks.splice(index, 1);
    }
};

/**
 * Remove error callback
 */
export const removeErrorCallback = (callback: (error: Error) => void): void => {
    const index = errorCallbacks.indexOf(callback);
    if (index > -1) {
        errorCallbacks.splice(index, 1);
    }
};

/**
 * Get active subscriptions
 */
export const getActiveSubscriptions = (): string[] => {
    return Array.from(subscriptions.keys());
};

/**
 * Get active subscriptions count
 */
export const getActiveSubscriptionsCount = (): number => {
    return subscriptions.size;
};

// Private helper functions
const getAuthHeaders = async (): Promise<StompConnectionHeaders> => {
    try {
        const tokens = await AuthHelper.getTokens();
        if (!tokens || !tokens.accessToken) {
            throw new Error('No valid authentication tokens found');
        }

        return {
            'accept-version': '1.1,1.0',
            'host': 'api.hengout.app',
            'heart-beat': '10000,10000',
            'Authorization': `Bearer ${tokens.accessToken}`
        };
    } catch (error) {
        console.error('❌ Failed to get auth headers:', error);
        throw new Error('Authentication required for WebSocket connection');
    }
};

const setConnectionStatus = (status: ConnectionStatus): void => {
    connectionStatus = status;
    notifyConnectionCallbacks(status);
};

const notifyConnectionCallbacks = (status: ConnectionStatus): void => {
    connectionCallbacks.forEach(callback => {
        try {
            callback(status);
        } catch (error) {
            console.error('❌ Error in connection callback:', error);
        }
    });
};

const notifyErrorCallbacks = (error: Error): void => {
    errorCallbacks.forEach(callback => {
        try {
            callback(error);
        } catch (callbackError) {
            console.error('❌ Error in error callback:', callbackError);
        }
    });
};

const debugLog = (str: string): void => {
    console.log('🔍 WebSocket Debug:', str);
};

// Export all functions as a module
export const webSocketService = {
    connect,
    disconnect,
    reconnect,
    sendMessage,
    subscribeToConversation,
    unsubscribeFromConversation,
    isConnected,
    getConnectionStatus,
    onConnectionChange,
    onError,
    removeConnectionCallback,
    removeErrorCallback,
    getActiveSubscriptions,
    getActiveSubscriptionsCount
};

export default webSocketService;
