// STOMP Protocol Types

// STOMP frame types
export type StompFrameType = 'CONNECT' | 'STOMP' | 'CONNECTED' | 'SEND' | 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'ACK' | 'NACK' | 'BEGIN' | 'COMMIT' | 'ABORT' | 'DISCONNECT' | 'MESSAGE' | 'RECEIPT' | 'ERROR';

// STOMP frame structure
export interface StompFrame {
    command: StompFrameType;
    headers: Record<string, string>;
    body?: string;
}

// STOMP connection headers
export interface StompConnectionHeaders {
    'accept-version': string;
    'host': string;
    'heart-beat': string;
    'Authorization': string;
    [key: string]: string;
}

// STOMP subscription headers
export interface StompSubscriptionHeaders {
    'id': string;
    'destination': string;
    'ack': string;
    [key: string]: string;
}

// STOMP message headers
export interface StompMessageHeaders {
    'destination': string;
    'content-type': string;
    'content-length': string;
    [key: string]: string;
}

// STOMP client configuration
export interface StompClientConfig {
    brokerURL: string;
    connectHeaders: StompConnectionHeaders;
    debug?: (str: string) => void;
    onConnect?: (frame: StompFrame) => void;
    onDisconnect?: () => void;
    onStompError?: (frame: StompFrame) => void;
    onWebSocketError?: (error: Event) => void;
    onWebSocketClose?: (event: CloseEvent) => void;
    heartbeatIncoming?: number;
    heartbeatOutgoing?: number;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
}

// STOMP subscription
export interface StompSubscription {
    id: string;
    destination: string;
    unsubscribe: () => void;
}

// STOMP message
export interface StompMessage {
    command: 'MESSAGE';
    headers: Record<string, string>;
    body: string;
}

// STOMP error
export interface StompError {
    command: 'ERROR';
    headers: Record<string, string>;
    body: string;
}
