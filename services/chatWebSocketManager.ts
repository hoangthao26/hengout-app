import { createWebSocketConnection, WebSocketConnection, WebSocketMessage } from './websocketService';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { ChatMessage } from '../types/chat';
import { databaseService } from './databaseService';
import { smartSyncManager } from './smartSyncManager';
import NetInfo from '@react-native-community/netinfo';

class ChatWebSocketManager {
    private connection: WebSocketConnection | null = null;
    private isConnecting = false;
    private subscribedConversations = new Set<string>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private connectionCheckInterval: NodeJS.Timeout | null = null;
    private lastPingTime = 0;
    private pingInterval = 30000; // 30 seconds

    // Network State Monitoring
    private networkUnsubscribe: (() => void) | null = null;
    private isNetworkAvailable = true;
    private networkType: string | null = null;
    private isConnectedToInternet = true;

    // Circuit Breaker Pattern
    private circuitBreakerFailures = 0;
    private circuitBreakerThreshold = 5; // Max failures before opening circuit
    private circuitBreakerTimeout = 60000; // 1 minute timeout
    private lastCircuitBreakerReset = 0;
    private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    async connect(): Promise<void> {
        if (this.connection || this.isConnecting) {
            return;
        }

        // Check network availability before connecting
        if (!this.isNetworkAvailable) {
            console.log('⚠️ [ChatWebSocket] Network not available, skipping connection');
            return;
        }

        // Check circuit breaker state
        if (!this.isCircuitBreakerClosed()) {
            console.log('🚨 [ChatWebSocket] Circuit breaker is open, skipping connection');
            return;
        }

        this.isConnecting = true;

        try {
            console.log('🔌 [ChatWebSocket] Connecting to WebSocket...');
            this.connection = await createWebSocketConnection('wss://api.hengout.app/social-service/ws/native');
            await this.connection.ready;

            console.log('✅ [ChatWebSocket] Connected successfully');
            this.reconnectAttempts = 0;
            this.isConnecting = false;

            // 🚨 Circuit breaker: Reset on successful connection
            this.onCircuitBreakerSuccess();

            // Set up connection event handlers
            this.setupConnectionEventHandlers();

            // Start network monitoring
            this.startNetworkMonitoring();

            // Start connection monitoring
            this.startConnectionMonitoring();

            // Re-subscribe to all conversations
            for (const conversationId of this.subscribedConversations) {
                this.subscribeToConversation(conversationId);
            }

        } catch (error) {
            console.error('❌ [ChatWebSocket] Connection failed:', error);
            this.isConnecting = false;

            // Circuit breaker: Record failure
            this.onCircuitBreakerFailure();

            this.handleReconnect();
        }
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            console.log('🔌 [ChatWebSocket] Disconnecting...');

            // Stop connection monitoring
            this.stopConnectionMonitoring();

            // Stop network monitoring
            this.stopNetworkMonitoring();

            this.connection.disconnect();
            this.connection = null;
            this.subscribedConversations.clear();
        }
    }

    subscribeToConversation(conversationId: string): void {
        if (!this.connection) {
            console.warn('⚠️ [ChatWebSocket] Not connected, cannot subscribe to conversation:', conversationId);
            return;
        }

        if (this.subscribedConversations.has(conversationId)) {
            console.log('📝 [ChatWebSocket] Already subscribed to conversation:', conversationId);
            return;
        }

        console.log('📝 [ChatWebSocket] Subscribing to conversation:', conversationId);
        this.subscribedConversations.add(conversationId);

        this.connection.subscribe(conversationId, async (message: WebSocketMessage) => {
            await this.handleMessage(conversationId, message);
        });
    }

    unsubscribeFromConversation(conversationId: string): void {
        this.subscribedConversations.delete(conversationId);
        console.log('📝 [ChatWebSocket] Unsubscribed from conversation:', conversationId);
    }

    /**
     * Subscribe to all conversations (used by initializationService)
     * This is the main strategy - maintain subscriptions for all conversations
     */
    async subscribeToAllConversations(conversationIds: string[]): Promise<void> {
        console.log(`🔌 [ChatWebSocket] Subscribing to ${conversationIds.length} conversations`);

        for (const conversationId of conversationIds) {
            if (!this.subscribedConversations.has(conversationId)) {
                this.subscribeToConversation(conversationId);
            }
        }
    }

    /**
     * Get list of currently subscribed conversations
     */
    getSubscribedConversations(): string[] {
        return Array.from(this.subscribedConversations);
    }

    sendMessage(messageData: {
        conversationId: string;
        type: 'TEXT' | 'ACTIVITY';
        content: {
            text?: string;
            // ACTIVITY content
            activityId?: string;
            name?: string;
            purpose?: string;
        };
    }): void {
        if (!this.connection) {
            console.warn('⚠️ [ChatWebSocket] Not connected, cannot send message');
            return;
        }

        const message = {
            type: 'SEND_MESSAGE',
            data: {
                conversationId: messageData.conversationId,
                type: messageData.type,
                content: messageData.content
            }
        };

        this.connection.send(message);
        console.log('📤 [ChatWebSocket] Message sent:', messageData.type);

        // SMART SYNC: Trigger smart sync for this conversation
        smartSyncManager.scheduleSync(messageData.conversationId, 'message_sent');
    }

    private async handleMessage(conversationId: string, message: WebSocketMessage): Promise<void> {
        console.log('📨 [ChatWebSocket] Received message - FULL STRUCTURE:', {
            conversationId,
            messageType: message.type,
            fullMessage: message,
            messageData: message.data,
            allMessageKeys: Object.keys(message)
        });

        switch (message.type) {
            case 'NEW_MESSAGE':
                await this.handleNewMessage(conversationId, message.data.message);
                break;
            case 'ACTIVITY_UPDATE':
                this.handleActivityUpdate(conversationId, message.data.activity);
                break;
            case 'LOCATION_UPDATE':
                this.handleLocationUpdate(conversationId, message.data.location);
                break;
            case 'ERROR':
                console.error('❌ [ChatWebSocket] Server error:', message.data.message);
                break;
            default:
                console.warn('⚠️ [ChatWebSocket] Unknown message type:', message.type);
        }
    }

    private async handleNewMessage(conversationId: string, messageData: any): Promise<void> {
        console.log('📨 [ChatWebSocket] Processing new message - FULL DATA:', {
            conversationId,
            messageData: {
                id: messageData.id,
                conversationId: messageData.conversationId,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                senderAvatar: messageData.senderAvatar,
                type: messageData.type,
                content: messageData.content,
                createdAt: messageData.createdAt,
                updatedAt: messageData.updatedAt,
                mine: messageData.mine,
                // Log all properties
                allProperties: Object.keys(messageData)
            }
        });

        // Get current user name to determine if this is our own message
        const { user } = useAuthStore.getState();
        const currentUserName = user?.displayName || user?.email;

        // If user is not available, try to get from AsyncStorage as fallback
        if (!currentUserName && !user) {
            console.warn('⚠️ [ChatWebSocket] User not found in authStore, trying AsyncStorage fallback');
            try {
                const { AuthHelper } = await import('./authHelper');
                const tokens = await AuthHelper.getTokens();
                if (tokens?.accessToken) {
                    // User is authenticated but not in store, this might be a timing issue
                    console.log('ℹ️ [ChatWebSocket] User has tokens but not in store, will retry later');
                }
            } catch (error) {
                console.error('❌ [ChatWebSocket] Failed to check auth fallback:', error);
            }
        }

        // Only use senderName to determine if this is our own message
        const isOwnMessage =
            messageData.senderName === currentUserName || // By user name from server
            messageData.senderName === 'Bạn' || // By display name for own messages
            messageData.senderName === 'You'; // Alternative display name

        console.log('🔍 [ChatWebSocket] Determining mine by senderName:', {
            senderName: messageData.senderName,
            currentUserName,
            user: user,
            isOwnMessage,
            comparison: {
                'senderName === currentUserName': messageData.senderName === currentUserName,
                'senderName === "Bạn"': messageData.senderName === 'Bạn',
                'senderName === "You"': messageData.senderName === 'You'
            }
        });

        // Check if this message already exists in store (to prevent duplicates)
        const { conversationMessages } = useChatStore.getState();
        const existingMessages = conversationMessages[conversationId] || [];
        const messageExists = existingMessages.some(msg => msg.id === messageData.id);

        if (messageExists) {
            console.log('⚠️ [ChatWebSocket] Message already exists, ignoring:', messageData.id);
            return;
        }

        // If this is our own message, still update lastMessage for conversation preview
        if (isOwnMessage) {
            console.log('⚠️ [ChatWebSocket] Own message detected, updating lastMessage for preview:', messageData.id);

            // Create chat message for lastMessage update
            const chatMessage: ChatMessage = {
                id: messageData.id,
                conversationId: conversationId,
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                senderAvatar: messageData.senderAvatar || '',
                type: messageData.type,
                content: messageData.content,
                createdAt: messageData.createdAt,
                mine: true // This is our own message
            };

            // Update conversation's last message for preview (Store)
            const { updateConversation } = useChatStore.getState();
            updateConversation(conversationId, {
                lastMessage: chatMessage
            });

            // ✅ CẬP NHẬT DATABASE để thứ tự conversations thay đổi
            try {
                await databaseService.updateConversationLastMessage(
                    conversationId,
                    chatMessage.id,
                    chatMessage.createdAt,
                    chatMessage.mine,
                    chatMessage.senderName
                );
                console.log('✅ [ChatWebSocket] Updated database for own message:', chatMessage.id);
            } catch (error) {
                console.error('❌ [ChatWebSocket] Failed to update database for own message:', error);
            }

            console.log('✅ [ChatWebSocket] Updated lastMessage for own message preview:', chatMessage.id);
            return; // Don't add the message to conversation messages (to avoid duplicate)
        }

        const chatMessage: ChatMessage = {
            id: messageData.id,
            conversationId: conversationId,
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            senderAvatar: messageData.senderAvatar || '',
            type: messageData.type,
            content: messageData.content,
            createdAt: messageData.createdAt,
            mine: isOwnMessage // ✅ Correctly determine mine based on senderId
        };

        // Update chat store
        const { addConversationMessage, updateConversation } = useChatStore.getState();

        addConversationMessage(conversationId, chatMessage);

        // Update conversation's last message
        updateConversation(conversationId, {
            lastMessage: chatMessage
        });

        // ✅ CẬP NHẬT DATABASE để thứ tự conversations thay đổi
        try {
            await databaseService.updateConversationLastMessage(
                conversationId,
                chatMessage.id,
                chatMessage.createdAt,
                chatMessage.mine,
                chatMessage.senderName
            );
            console.log('✅ [ChatWebSocket] Updated database for new message:', chatMessage.id);
        } catch (error) {
            console.error('❌ [ChatWebSocket] Failed to update database for new message:', error);
        }

        console.log('✅ [ChatWebSocket] New message added to store:', chatMessage.id);

        // 🚀 SMART SYNC: Trigger smart sync for this conversation
        smartSyncManager.scheduleSync(conversationId, 'new_message_received');
    }

    private handleActivityUpdate(conversationId: string, activityData: any): void {
        console.log('📊 [ChatWebSocket] Activity update for conversation:', conversationId, activityData);
        // Handle typing indicators, user presence, etc.
    }

    private handleLocationUpdate(conversationId: string, locationData: any): void {
        console.log('📍 [ChatWebSocket] Location update for conversation:', conversationId, locationData);
        // Handle location sharing
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [ChatWebSocket] Max reconnect attempts reached');
            return;
        }

        // 🌐 Check network availability before reconnecting
        if (!this.isNetworkAvailable) {
            console.log('⚠️ [ChatWebSocket] Network not available, pausing reconnection');
            // Try again in 10 seconds
            setTimeout(() => {
                this.handleReconnect();
            }, 10000);
            return;
        }

        // 🚨 Check circuit breaker state before reconnecting
        if (!this.isCircuitBreakerClosed()) {
            console.log('🚨 [ChatWebSocket] Circuit breaker is open, pausing reconnection');
            // Try again in 30 seconds when circuit breaker might be reset
            setTimeout(() => {
                this.handleReconnect();
            }, 30000);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`🔄 [ChatWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Set up connection event handlers
     */
    private setupConnectionEventHandlers(): void {
        if (!this.connection) return;

        // Handle connection close
        this.connection.onClose?.((event) => {
            console.log('🔌 [ChatWebSocket] Connection closed by server:', event.code, event.reason);
            this.handleConnectionLoss();
        });

        // Handle connection errors
        this.connection.onError?.((error) => {
            console.error('❌ [ChatWebSocket] Connection error:', error);
            this.handleConnectionLoss();
        });
    }

    /**
     * Start connection monitoring with ping/pong
     */
    private startConnectionMonitoring(): void {
        this.stopConnectionMonitoring(); // Clear any existing interval

        this.connectionCheckInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, this.pingInterval);

        console.log('🔍 [ChatWebSocket] Connection monitoring started');
    }

    /**
     * Stop connection monitoring
     */
    private stopConnectionMonitoring(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
        console.log('🔍 [ChatWebSocket] Connection monitoring stopped');
    }

    /**
     * Check connection health and send ping
     */
    private checkConnectionHealth(): void {
        if (!this.connection) {
            console.log('⚠️ [ChatWebSocket] No connection to check health');
            return;
        }

        try {
            // Send ping to check connection
            this.connection.send({ type: 'PING' });
            this.lastPingTime = Date.now();
            console.log('🏓 [ChatWebSocket] Ping sent');
        } catch (error) {
            console.error('❌ [ChatWebSocket] Ping failed:', error);
            this.handleConnectionLoss();
        }
    }

    /**
     * Handle connection loss
     */
    private handleConnectionLoss(): void {
        console.log('⚠️ [ChatWebSocket] Connection lost, attempting reconnect...');

        // Stop monitoring
        this.stopConnectionMonitoring();

        // Clear connection
        this.connection = null;

        // Attempt reconnect
        this.handleReconnect();
    }

    /**
     * Check if connection is healthy
     */
    isConnected(): boolean {
        return this.connection !== null && !this.isConnecting;
    }

    /**
     * Start network monitoring
     */
    private startNetworkMonitoring(): void {
        this.stopNetworkMonitoring(); // Clear any existing subscription

        this.networkUnsubscribe = NetInfo.addEventListener(state => {
            const wasAvailable = this.isNetworkAvailable;
            const wasConnected = this.isConnectedToInternet;

            this.isNetworkAvailable = state.isConnected ?? false;
            this.isConnectedToInternet = state.isInternetReachable ?? false;
            this.networkType = state.type;

            console.log('🌐 [ChatWebSocket] Network state changed:', {
                isConnected: this.isNetworkAvailable,
                isInternetReachable: this.isConnectedToInternet,
                type: this.networkType,
                wasAvailable,
                wasConnected
            });

            // Handle network state changes
            this.handleNetworkStateChange(wasAvailable, wasConnected);
        });

        console.log('🌐 [ChatWebSocket] Network monitoring started');
    }

    /**
     *  Stop network monitoring
     */
    private stopNetworkMonitoring(): void {
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
            this.networkUnsubscribe = null;
        }
        console.log('🌐 [ChatWebSocket] Network monitoring stopped');
    }

    /**
     *  Handle network state changes
     */
    private handleNetworkStateChange(wasAvailable: boolean, wasConnected: boolean): void {
        // Network came back online
        if (!wasAvailable && this.isNetworkAvailable) {
            console.log('🌐 [ChatWebSocket] Network came back online, attempting to connect');
            this.reconnectAttempts = 0; // Reset reconnect attempts

            //  Reset circuit breaker when network comes back
            this.resetCircuitBreaker();

            this.connect();
        }
        // Network went offline
        else if (wasAvailable && !this.isNetworkAvailable) {
            console.log('🌐 [ChatWebSocket] Network went offline, pausing reconnection');
            // Connection will be handled by connection loss detection
        }
        // Internet connectivity changed
        else if (wasConnected !== this.isConnectedToInternet) {
            if (this.isConnectedToInternet) {
                console.log('🌐 [ChatWebSocket] Internet connectivity restored');
                this.reconnectAttempts = 0; // Reset reconnect attempts

                // 🚨 Reset circuit breaker when internet comes back
                this.resetCircuitBreaker();

                this.connect();
            } else {
                console.log('🌐 [ChatWebSocket] Internet connectivity lost');
            }
        }
    }

    /**
     * 🚨 Check if circuit breaker is closed (allowing connections)
     */
    private isCircuitBreakerClosed(): boolean {
        const now = Date.now();

        // If circuit is open, check if timeout has passed
        if (this.circuitBreakerState === 'OPEN') {
            if (now - this.lastCircuitBreakerReset > this.circuitBreakerTimeout) {
                console.log('🚨 [ChatWebSocket] Circuit breaker timeout passed, moving to HALF_OPEN');
                this.circuitBreakerState = 'HALF_OPEN';
                this.lastCircuitBreakerReset = now;
                return true; // Allow one attempt
            }
            return false; // Still in timeout
        }

        return true; // CLOSED or HALF_OPEN
    }

    /**
     * 🚨 Handle circuit breaker success
     */
    private onCircuitBreakerSuccess(): void {
        if (this.circuitBreakerState === 'HALF_OPEN') {
            console.log('🚨 [ChatWebSocket] Circuit breaker test successful, moving to CLOSED');
            this.circuitBreakerState = 'CLOSED';
        }

        // Reset failure count on success
        this.circuitBreakerFailures = 0;
        this.lastCircuitBreakerReset = Date.now();
    }

    /**
     * 🚨 Handle circuit breaker failure
     */
    private onCircuitBreakerFailure(): void {
        this.circuitBreakerFailures++;
        this.lastCircuitBreakerReset = Date.now();

        console.log(`🚨 [ChatWebSocket] Circuit breaker failure count: ${this.circuitBreakerFailures}/${this.circuitBreakerThreshold}`);

        // Check if we should open the circuit
        if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
            console.log('🚨 [ChatWebSocket] Circuit breaker threshold reached, opening circuit');
            this.circuitBreakerState = 'OPEN';
            this.lastCircuitBreakerReset = Date.now();
        }
    }

    /**
     * 🚨 Reset circuit breaker (when network comes back)
     */
    private resetCircuitBreaker(): void {
        console.log('🚨 [ChatWebSocket] Resetting circuit breaker due to network recovery');
        this.circuitBreakerState = 'CLOSED';
        this.circuitBreakerFailures = 0;
        this.lastCircuitBreakerReset = Date.now();
    }

    /**
     * 🚨 Get circuit breaker status
     */
    getCircuitBreakerStatus(): {
        state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
        failures: number;
        threshold: number;
        timeout: number;
        timeUntilReset: number;
    } {
        const now = Date.now();
        const timeUntilReset = this.circuitBreakerState === 'OPEN'
            ? Math.max(0, this.circuitBreakerTimeout - (now - this.lastCircuitBreakerReset))
            : 0;

        return {
            state: this.circuitBreakerState,
            failures: this.circuitBreakerFailures,
            threshold: this.circuitBreakerThreshold,
            timeout: this.circuitBreakerTimeout,
            timeUntilReset
        };
    }

    /**
     * Get connection status including network info and circuit breaker
     */
    getConnectionStatus(): {
        isConnected: boolean;
        isConnecting: boolean;
        reconnectAttempts: number;
        subscribedConversations: number;
        networkAvailable: boolean;
        networkType: string | null;
        internetReachable: boolean;
        circuitBreaker: {
            state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
            failures: number;
            threshold: number;
            timeUntilReset: number;
        };
    } {
        const circuitBreakerStatus = this.getCircuitBreakerStatus();

        return {
            isConnected: this.isConnected(),
            isConnecting: this.isConnecting,
            reconnectAttempts: this.reconnectAttempts,
            subscribedConversations: this.subscribedConversations.size,
            networkAvailable: this.isNetworkAvailable,
            networkType: this.networkType,
            internetReachable: this.isConnectedToInternet,
            circuitBreaker: {
                state: circuitBreakerStatus.state,
                failures: circuitBreakerStatus.failures,
                threshold: circuitBreakerStatus.threshold,
                timeUntilReset: circuitBreakerStatus.timeUntilReset
            }
        };
    }

}

// Singleton instance
export const chatWebSocketManager = new ChatWebSocketManager();