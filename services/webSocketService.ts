import { AuthHelper } from './authHelper';

export type WebSocketMessage = {
    type: string;
    data: any;
};

export type WebSocketConnection = {
    ws: WebSocket;
    ready: Promise<void>;
    subscribe: (conversationId: string, onMessage: (message: WebSocketMessage) => void) => void;
    subscribeToActivity: (conversationId: string, onMessage: (message: WebSocketMessage) => void) => void;
    send: (message: any) => void;
    disconnect: () => void;
    onClose?: (callback: (event: CloseEvent) => void) => void;
    onError?: (callback: (error: Event) => void) => void;
};

export async function createWebSocketConnection(url: string): Promise<WebSocketConnection> {
    const tokens = await AuthHelper.getTokens();

    // Append token via query for WS handshake
    const wsUrl = tokens?.accessToken ? `${url}?token=${encodeURIComponent(tokens.accessToken)}` : url;

    let resolveReady: () => void;
    let rejectReady: (err: unknown) => void;
    const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });

    const ws = new WebSocket(wsUrl);
    const messageHandlers = new Map<string, (message: WebSocketMessage) => void>();
    const closeCallbacks: ((event: CloseEvent) => void)[] = [];
    const errorCallbacks: ((error: Event) => void)[] = [];

    ws.onopen = () => {
        // WebSocket connected
        resolveReady();
    };

    ws.onerror = (error) => {
        console.error('[WebSocket] WebSocket error:', error);
        rejectReady(error);

        // Notify error callbacks
        errorCallbacks.forEach(callback => callback(error));
    };

    ws.onclose = (event) => {
        // WebSocket closed

        // Handle different close codes
        if (event.code === 1001) {
            console.log('[WebSocket] Stream end encountered - connection lost unexpectedly');
        } else if (event.code === 1006) {
            console.log('[WebSocket] Connection closed abnormally - network issue');
        } else if (event.code === 1000) {
            console.log('[WebSocket] Connection closed normally');
        } else {
            console.log(`[WebSocket] Connection closed with code: ${event.code}`);
        }

        // Notify close callbacks
        closeCallbacks.forEach(callback => callback(event));
    };

    ws.onmessage = (event) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('[WebSocket] Received:', message.type);

            // Handle different message types
            switch (message.type) {
                case 'CONNECTION_SUCCESS':
                    console.log('[WebSocket] Connected as user:', message.data.userId);
                    break;

                case 'SUBSCRIBE_SUCCESS':
                    // Subscribed to conversation
                    break;

                case 'NEW_MESSAGE':
                    const conversationId = message.data.conversationId;
                    const handler = messageHandlers.get(`conversation_${conversationId}`);
                    if (handler) {
                        handler(message);
                    }
                    break;

                case 'ACTIVITY_UPDATE':
                    console.log('[WebSocket] Activity update - FULL STRUCTURE:', {
                        allMessageKeys: Object.keys(message),
                        conversationId: message.data?.conversationId,
                        fullMessage: message,
                        activityData: message.data?.activity,
                        messageType: 'ACTIVITY_UPDATE'
                    });

                    const activityConversationId = message.data.conversationId;
                    const activityHandler = messageHandlers.get(`activity_${activityConversationId}`);
                    if (activityHandler) {
                        activityHandler(message);
                    } else {
                        console.log('[WebSocket] No handler found for activity update:', activityConversationId);
                    }
                    break;

                case 'LOCATION_UPDATE':
                    if (message.data.conversationId) {
                        // Group location
                        const groupLocationHandler = messageHandlers.get(`group_location_${message.data.conversationId}`);
                        if (groupLocationHandler) {
                            groupLocationHandler(message);
                        }
                    } else {
                        // Friend location
                        const locationHandler = messageHandlers.get('location');
                        if (locationHandler) {
                            locationHandler(message);
                        }
                    }
                    break;

                case 'PONG':
                    console.log('Pong received');
                    break;

                case 'ERROR':
                    console.error('[WebSocket] Server error:', message.data.message);
                    break;

                default:
                    console.warn('[WebSocket] Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('[WebSocket] Failed to parse WebSocket message:', error);
        }
    };

    function subscribe(conversationId: string, onMessage: (message: WebSocketMessage) => void) {
        const key = `conversation_${conversationId}`;
        messageHandlers.set(key, onMessage);

        // Send subscription message
        const subscribeMessage = {
            type: 'SUBSCRIBE_CONVERSATION',
            data: {
                conversationId: conversationId
            }
        };
        ws.send(JSON.stringify(subscribeMessage));
    }

    function subscribeToActivity(conversationId: string, onMessage: (message: WebSocketMessage) => void) {
        const key = `activity_${conversationId}`;
        messageHandlers.set(key, onMessage);
        // Registered activity handler
    }

    function send(message: any) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] WebSocket not connected, cannot send message');
        }
    }

    function disconnect() {
        messageHandlers.clear();
        ws.close();
    }

    return {
        ws,
        ready,
        subscribe,
        subscribeToActivity,
        send,
        disconnect,
        onClose: (callback: (event: CloseEvent) => void) => {
            closeCallbacks.push(callback);
        },
        onError: (callback: (error: Event) => void) => {
            errorCallbacks.push(callback);
        }
    };
}
