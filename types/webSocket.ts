// WebSocket Types for Real-time Chat

// Connection states
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// WebSocket message types
export interface WebSocketMessage {
    type: 'MESSAGE';
    data: any;
    timestamp: string;
}

// Subscription management
export interface WebSocketSubscription {
    id: string;
    destination: string;
    callback: (message: any) => void;
}

// WebSocket configuration
export interface WebSocketConfig {
    url: string;
    headers: Record<string, string>;
    heartbeat: {
        outgoing: number;
        incoming: number;
    };
}

// Connection events
export interface ConnectionEvent {
    type: 'connect' | 'disconnect' | 'error' | 'reconnect';
    timestamp: string;
    data?: any;
}

// Message sending options
export interface SendMessageOptions {
    destination: string;
    headers?: Record<string, string>;
    body: string;
}

// Subscription options
export interface SubscriptionOptions {
    destination: string;
    callback: (message: any) => void;
    headers?: Record<string, string>;
}

// WebSocket service interface
export interface IWebSocketService {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    reconnect(): Promise<void>;
    sendMessage(message: ChatMessage): Promise<void>;
    subscribeToConversation(conversationId: string, callback: (message: ChatMessage) => void): void;
    unsubscribeFromConversation(conversationId: string): void;
    isConnected(): boolean;
    getConnectionStatus(): ConnectionStatus;
    onConnectionChange(callback: (status: ConnectionStatus) => void): void;
    onError(callback: (error: Error) => void): void;
}

// Import ChatMessage from existing types
import { ChatMessage } from './chat';
