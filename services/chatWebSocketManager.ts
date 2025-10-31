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
    private isShutdown = false; // Prevent auto-reconnect during explicit shutdown (logout)
    private subscribedConversations = new Set<string>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private lastConnectionStatus: boolean | null = null;
    private reconnectDelay = 1000;
    private connectionCheckInterval: NodeJS.Timeout | null = null;
    private lastPingTime = 0;
    private pingInterval = 30000; // 30 seconds
    private toastFunction: ((type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => void) | null = null;

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
        // Re-enable connections if previously shutdown
        this.isShutdown = false;

        if (this.connection || this.isConnecting) {
            return;
        }

        // Check network availability before connecting
        if (!this.isNetworkAvailable) {
            // Network not available, skipping connection
            return;
        }

        // Check circuit breaker state
        if (!this.isCircuitBreakerClosed()) {
            // Circuit breaker is open, skipping connection
            return;
        }

        if (this.isShutdown) {
            return;
        }
        this.isConnecting = true;

        try {
            // Connecting to WebSocket
            if (this.isShutdown) {
                this.isConnecting = false;
                return;
            }
            this.connection = await createWebSocketConnection('wss://api.hengout.app/social-service/ws/native');
            await this.connection.ready;

            // Connected successfully
            this.reconnectAttempts = 0;
            this.isConnecting = false;

            // Circuit breaker: Reset on successful connection
            this.onCircuitBreakerSuccess();

            // Set up connection event handlers
            this.setupConnectionEventHandlers();

            // Start network monitoring
            this.startNetworkMonitoring();

            // Start connection monitoring
            this.startConnectionMonitoring();

            // Re-subscribe to all conversations (silent mode)
            if (this.subscribedConversations.size > 0) {
                console.log(`[ChatWebSocket] Re-subscribing to ${this.subscribedConversations.size} conversations...`);
                for (const conversationId of this.subscribedConversations) {
                    this.subscribeToConversation(conversationId, true); // Silent mode
                }
                console.log(`[ChatWebSocket] Re-subscribed to ${this.subscribedConversations.size} conversations`);
            }

            // OPTIMIZED: Trigger sync when reconnected
            if (this.subscribedConversations.size > 0) {
                console.log('[ChatWebSocket] Reconnected, triggering sync for subscribed conversations');

                // Trigger smart sync for all subscribed conversations
                const conversationIds = Array.from(this.subscribedConversations);
                smartSyncManager.scheduleBatchSync(conversationIds, 'websocket_reconnect');
            }

        } catch (error) {
            console.error('[ChatWebSocket] Connection failed:', error);
            this.isConnecting = false;

            // Circuit breaker: Record failure
            this.onCircuitBreakerFailure();

            if (!this.isShutdown) {
                this.handleReconnect();
            }
        }
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            console.log('[ChatWebSocket] Disconnecting WebSocket...');

            // Mark shutdown to stop auto-reconnect
            this.isShutdown = true;

            // Stop connection monitoring
            this.stopConnectionMonitoring();

            // Stop network monitoring
            this.stopNetworkMonitoring();

            this.connection.disconnect();
            this.connection = null;
            // FIXED: Don't clear subscribedConversations to maintain subscription list
            // this.subscribedConversations.clear();

            console.log('[ChatWebSocket] WebSocket disconnected successfully');
        } else {
            console.log('[ChatWebSocket] No connection to disconnect');
        }
    }

    subscribeToConversation(conversationId: string, silent: boolean = false): void {
        if (!this.connection) {
            console.warn('[ChatWebSocket] Not connected, cannot subscribe to conversation:', conversationId);
            return;
        }

        // PROTECTION: Check if WebSocket is in valid state
        if (this.connection.ws.readyState !== 1) { // WebSocket.OPEN = 1
            console.warn(`[ChatWebSocket] WebSocket not in OPEN state (${this.connection.ws.readyState}), cannot subscribe to conversation:`, conversationId);
            return;
        }

        if (!silent) {
            if (this.subscribedConversations.has(conversationId)) {
                // Reduce noise: only log first few re-subscriptions
                if (this.subscribedConversations.size <= 3) {
                    console.log(`[ChatWebSocket] Re-subscribing to conversation: ${conversationId}`);
                }
            } else {
                console.log(`[ChatWebSocket] Subscribing to conversation: ${conversationId}`);
            }
        }

        try {
            // Always add to subscribed list (in case of re-subscription)
            this.subscribedConversations.add(conversationId);

            // Subscribe to regular messages
            this.connection.subscribe(conversationId, async (message: WebSocketMessage) => {
                await this.handleMessage(conversationId, message);
            });

            // Subscribe to activity updates
            this.connection.subscribeToActivity(conversationId, async (message: WebSocketMessage) => {
                await this.handleMessage(conversationId, message);
            });

            if (!silent) {
                console.log(`[ChatWebSocket] Successfully subscribed to conversation: ${conversationId}`);
            }
        } catch (error) {
            console.error(`[ChatWebSocket] Failed to subscribe to conversation ${conversationId}:`, error);
            // Remove from subscribed list if failed
            this.subscribedConversations.delete(conversationId);
            throw error;
        }
    }

    unsubscribeFromConversation(conversationId: string): void {
        this.subscribedConversations.delete(conversationId);
        // Unsubscribed from conversation
    }

    /**
     * Subscribe to all conversations (used by initializationService)
     * This is the main strategy - maintain subscriptions for all conversations
     */
    async subscribeToAllConversations(conversationIds: string[]): Promise<void> {
        console.log(`[ChatWebSocket] Subscribing to ${conversationIds.length} conversations...`);

        for (const conversationId of conversationIds) {
            this.subscribeToConversation(conversationId);
        }

        console.log(`[ChatWebSocket] Subscribed to ${conversationIds.length} conversations`);
    }

    /**
     * Get list of currently subscribed conversations
     */
    getSubscribedConversations(): string[] {
        return Array.from(this.subscribedConversations);
    }

    /**
     * Clear all subscriptions (used when user logs out)
     */
    clearSubscriptions(): void {
        this.subscribedConversations.clear();
        console.log('[ChatWebSocket] Cleared all subscriptions');
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
            console.warn('[ChatWebSocket] Not connected, cannot send message');
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
        // Message sent

        // SMART SYNC: Trigger smart sync for this conversation
        smartSyncManager.scheduleSync(messageData.conversationId, 'message_sent');
    }

    private async handleMessage(conversationId: string, message: WebSocketMessage): Promise<void> {
        console.log('[ChatWebSocket] Received message - FULL STRUCTURE:', {
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
                console.error('[ChatWebSocket] Server error:', message.data.message);
                break;
            default:
                console.warn('[ChatWebSocket] Unknown message type:', message.type);
        }
    }

    private async handleNewMessage(conversationId: string, messageData: any): Promise<void> {
        console.log('[ChatWebSocket] Processing new message - FULL DATA:', {
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
            console.warn('[ChatWebSocket] User not found in authStore, trying AsyncStorage fallback');
            try {
                const { AuthHelper } = await import('./authHelper');
                const tokens = await AuthHelper.getTokens();
                if (tokens?.accessToken) {
                    // User is authenticated but not in store, this might be a timing issue
                    console.log('[ChatWebSocket] User has tokens but not in store, will retry later');
                }
            } catch (error) {
                console.error('[ChatWebSocket] Failed to check auth fallback:', error);
            }
        }

        // Only use senderName to determine if this is our own message
        const isOwnMessage =
            messageData.senderName === currentUserName || // By user name from server
            messageData.senderName === 'Bạn' || // By display name for own messages
            messageData.senderName === 'You'; // Alternative display name

        console.log('[ChatWebSocket] Determining mine by senderName:', {
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
            console.log('[ChatWebSocket] Message already exists, ignoring:', messageData.id);
            return;
        }

        // If this is our own message, still update lastMessage for conversation preview
        if (isOwnMessage) {
            console.log('[ChatWebSocket] Own message detected, updating lastMessage for preview:', messageData.id);

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

            // CẬP NHẬT DATABASE để thứ tự conversations thay đổi
            try {
                await databaseService.updateConversationLastMessage(
                    conversationId,
                    chatMessage.id,
                    chatMessage.createdAt,
                    chatMessage.mine,
                    chatMessage.senderName,
                    chatMessage.type,
                    chatMessage.content.activityId,
                    chatMessage.content.name,
                    chatMessage.content.purpose
                );
                console.log('[ChatWebSocket] Updated database for own message:', chatMessage.id);
            } catch (error) {
                console.error('[ChatWebSocket] Failed to update database for own message:', error);
            }

            console.log('[ChatWebSocket] Updated lastMessage for own message preview:', chatMessage.id);
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
            mine: isOwnMessage // Correctly determine mine based on senderId
        };

        // Update chat store
        const { addConversationMessage, updateConversation } = useChatStore.getState();

        addConversationMessage(conversationId, chatMessage);

        // Update conversation's last message and trigger conversation list update
        updateConversation(conversationId, {
            lastMessage: chatMessage
        });

        // REAL-TIME CONVERSATION LIST UPDATE
        // Force conversation list to update by triggering a store update
        console.log('[ChatWebSocket] Updating conversation list for real-time display');

        // CẬP NHẬT DATABASE để thứ tự conversations thay đổi
        try {
            await databaseService.updateConversationLastMessage(
                conversationId,
                chatMessage.id,
                chatMessage.createdAt,
                chatMessage.mine,
                chatMessage.senderName
            );
            console.log('[ChatWebSocket] Updated database for new message:', chatMessage.id);
        } catch (error) {
            console.error('[ChatWebSocket] Failed to update database for new message:', error);
        }

        console.log('[ChatWebSocket] New message added to store:', chatMessage.id);

        // SMART SYNC: Trigger smart sync for this conversation
        smartSyncManager.scheduleSync(conversationId, 'new_message_received');
    }

    private async handleActivityUpdate(conversationId: string, activityData: any): Promise<void> {
        console.log('[ChatWebSocket] Activity update - FULL STRUCTURE:', {
            conversationId,
            activityData,
            allActivityKeys: Object.keys(activityData || {}),
            timestamp: new Date().toISOString()
        });

        if (activityData) {
            console.log('[ChatWebSocket] Activity details:', {
                id: activityData.id,
                name: activityData.name,
                status: activityData.status,
                createdBy: activityData.createdBy,
                createdAt: activityData.createdAt
            });

            // Get current user info to determine if this is my activity
            const { user } = useAuthStore.getState();
            // Compare by creatorName instead of ID for better accuracy
            const isMyActivity = user?.displayName === activityData.creatorName;

            console.log('[ChatWebSocket] Activity creator info:', {
                currentUserDisplayName: user?.displayName,
                activityCreatorName: activityData.creatorName,
                isMyActivity,
                creatorName: activityData.creatorName,
                creatorAvatar: activityData.creatorAvatar
            });

            const { addConversationMessage, updateConversationMessage, updateConversation, conversationMessages } = useChatStore.getState();

            // Check if activity message already exists
            const existingMessages = conversationMessages[conversationId] || [];
            const existingActivityMessage = existingMessages.find(msg =>
                msg.type === 'ACTIVITY' && msg.content.activityId === activityData.id
            );

            if (activityData.status === 'ON_GOING') {
                // Only create new activity message for ON_GOING status
                const activityMessage: ChatMessage = {
                    id: `activity_${activityData.id}_${Date.now()}`,
                    conversationId: conversationId,
                    senderId: activityData.createdBy,
                    senderName: activityData.creatorName || 'Unknown User',
                    senderAvatar: activityData.creatorAvatar || '',
                    type: 'ACTIVITY',
                    content: {
                        activityId: activityData.id,
                        name: activityData.name,
                        purpose: activityData.purpose || '',
                        status: activityData.status,
                        creatorName: activityData.creatorName,
                        creatorAvatar: activityData.creatorAvatar
                    },
                    createdAt: activityData.createdAt,
                    mine: isMyActivity
                };

                // Add to store
                addConversationMessage(conversationId, activityMessage);

                // Update conversation's last message
                updateConversation(conversationId, {
                    lastMessage: activityMessage
                });

                console.log('[ChatWebSocket] New activity message created for ON_GOING status');
                console.log('[ChatWebSocket] Updated lastMessage for ON_GOING status:', activityData.name);

                // CẬP NHẬT DATABASE ngay lập tức cho activity mới
                try {
                    await databaseService.updateConversationLastMessage(
                        conversationId,
                        activityMessage.id,
                        activityMessage.createdAt,
                        activityMessage.mine,
                        activityMessage.senderName,
                        activityMessage.type,
                        activityMessage.content.activityId,
                        activityMessage.content.name,
                        activityMessage.content.purpose
                    );
                    console.log('[ChatWebSocket] Updated database for new activity message:', activityMessage.id);
                } catch (error) {
                    console.error('[ChatWebSocket] Failed to update database for new activity message:', error);
                }
            } else if (existingActivityMessage) {
                // Update existing activity message with new status
                updateConversationMessage(conversationId, existingActivityMessage.id, {
                    content: {
                        ...existingActivityMessage.content,
                        status: activityData.status
                    }
                });

                console.log(`[ChatWebSocket] Updated existing activity message status to: ${activityData.status}`);
                console.log(`[ChatWebSocket] Skipped lastMessage update for status: ${activityData.status} (only ON_GOING updates lastMessage)`);

                // Show toast notification for status changes
                this.showActivityStatusToast(activityData.status, activityData.name);
            } else {
                // Fallback: create new message if existing not found (shouldn't happen normally)
                console.warn('[ChatWebSocket] Activity message not found, creating new one');
                const activityMessage: ChatMessage = {
                    id: `activity_${activityData.id}_${Date.now()}`,
                    conversationId: conversationId,
                    senderId: activityData.createdBy,
                    senderName: activityData.creatorName || 'Unknown User',
                    senderAvatar: activityData.creatorAvatar || '',
                    type: 'ACTIVITY',
                    content: {
                        activityId: activityData.id,
                        name: activityData.name,
                        purpose: activityData.purpose || '',
                        status: activityData.status,
                        creatorName: activityData.creatorName,
                        creatorAvatar: activityData.creatorAvatar
                    },
                    createdAt: activityData.createdAt,
                    mine: isMyActivity
                };

                addConversationMessage(conversationId, activityMessage);

                // CHỈ CẬP NHẬT LAST MESSAGE CHO ON_GOING STATUS
                if (activityData.status === 'ON_GOING') {
                    updateConversation(conversationId, {
                        lastMessage: activityMessage
                    });
                    console.log('[ChatWebSocket] Updated lastMessage for ON_GOING status in fallback');
                } else {
                    console.log(`[ChatWebSocket] Skipped lastMessage update for status: ${activityData.status} in fallback`);
                }
            }

        }
    }

    private showActivityStatusToast(status: string, activityName: string): void {
        console.log(`[ChatWebSocket] Activity status toast: ${status} for "${activityName}"`);

        let toastTitle = '';
        let toastMessage = '';
        let toastType: 'success' | 'info' | 'warning' | 'error' = 'info';

        switch (status) {
            case 'ANALYZING':
                toastTitle = 'Đang phân tích hoạt động';
                toastMessage = `"${activityName}" đang được phân tích...`;
                toastType = 'info';
                break;
            case 'VOTING':
                toastTitle = 'Bắt đầu bình chọn';
                toastMessage = `"${activityName}" - Nhấn để bình chọn!`;
                toastType = 'warning';
                break;
            case 'COMPLETED':
                toastTitle = 'Hoàn thành hoạt động';
                toastMessage = `"${activityName}" đã hoàn thành! Xem kết quả`;
                toastType = 'success';
                break;
            default:
                toastTitle = 'Cập nhật trạng thái';
                toastMessage = `"${activityName}" - ${status}`;
                toastType = 'info';
        }

        // Show actual toast if toast function is available
        if (this.toastFunction) {
            console.log(`[WebSocket] Calling toast function: ${toastType} - ${toastTitle} - ${toastMessage}`);
            this.toastFunction(toastType, toastTitle, toastMessage);
        } else {
            // Fallback to console log if no toast function set
            console.log(`[Toast] No toast function set - ${toastTitle}: ${toastMessage}`);
        }
    }

    private handleLocationUpdate(conversationId: string, locationData: any): void {
        console.log('[ChatWebSocket] Location update for conversation:', conversationId, locationData);
        // Handle location sharing
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ChatWebSocket] Max reconnect attempts reached');
            return;
        }

        // Check network availability before reconnecting
        if (!this.isNetworkAvailable) {
            console.log('[ChatWebSocket] Network not available, pausing reconnection');
            // Try again in 10 seconds
            setTimeout(() => {
                this.handleReconnect();
            }, 10000);
            return;
        }

        // Check circuit breaker state before reconnecting
        if (!this.isCircuitBreakerClosed()) {
            console.log('[ChatWebSocket] Circuit breaker is open, pausing reconnection');
            // Try again in 30 seconds when circuit breaker might be reset
            setTimeout(() => {
                this.handleReconnect();
            }, 30000);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`[ChatWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

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
            console.log('[ChatWebSocket] Connection closed by server:', event.code, event.reason);
            this.handleConnectionLoss();
        });

        // Handle connection errors
        this.connection.onError?.((error) => {
            console.error('[ChatWebSocket] Connection error:', error);
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

        console.log('[ChatWebSocket] Connection monitoring started');
    }

    /**
     * Stop connection monitoring
     */
    private stopConnectionMonitoring(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
        console.log('[ChatWebSocket] Connection monitoring stopped');
    }

    /**
     * Check connection health and send ping
     */
    private checkConnectionHealth(): void {
        if (!this.connection) {
            console.log('[ChatWebSocket] No connection to check health');
            return;
        }

        try {
            // Send ping to check connection
            this.connection.send({ type: 'PING' });
            this.lastPingTime = Date.now();
            console.log('[ChatWebSocket] Ping sent');
        } catch (error) {
            console.error('[ChatWebSocket] Ping failed:', error);
            this.handleConnectionLoss();
        }
    }

    /**
     * Handle connection loss
     */
    private handleConnectionLoss(): void {
        console.log('[ChatWebSocket] Connection lost, attempting reconnect...');

        // Stop monitoring
        this.stopConnectionMonitoring();

        // Clear connection
        this.connection = null;

        // Attempt reconnect unless explicitly shutdown (logout)
        if (!this.isShutdown) {
            this.handleReconnect();
        }
    }

    /**
     * Check if connection is healthy
     */
    isConnected(): boolean {
        const connected = this.connection !== null && !this.isConnecting;
        // Reduce noise: only log when status changes
        if (this.lastConnectionStatus !== connected) {
            console.log(`[ChatWebSocket] Connection status: ${connected ? 'connected' : 'disconnected'}`);
            this.lastConnectionStatus = connected;
        }
        return connected;
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

            // Network state changed

            // Handle network state changes
            this.handleNetworkStateChange(wasAvailable, wasConnected);
        });

        console.log('[ChatWebSocket] Network monitoring started');
    }

    /**
     *  Stop network monitoring
     */
    private stopNetworkMonitoring(): void {
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
            this.networkUnsubscribe = null;
        }
        console.log('[ChatWebSocket] Network monitoring stopped');
    }

    /**
     *  Handle network state changes
     */
    private handleNetworkStateChange(wasAvailable: boolean, wasConnected: boolean): void {
        // Network came back online
        if (!wasAvailable && this.isNetworkAvailable) {
            console.log('[ChatWebSocket] Network came back online, attempting to connect');
            this.reconnectAttempts = 0; // Reset reconnect attempts

            //  Reset circuit breaker when network comes back
            this.resetCircuitBreaker();

            this.connect();
        }
        // Network went offline
        else if (wasAvailable && !this.isNetworkAvailable) {
            console.log('[ChatWebSocket] Network went offline, pausing reconnection');
            // Connection will be handled by connection loss detection
        }
        // Internet connectivity changed
        else if (wasConnected !== this.isConnectedToInternet) {
            if (this.isConnectedToInternet) {
                console.log('[ChatWebSocket] Internet connectivity restored');
                this.reconnectAttempts = 0; // Reset reconnect attempts

                // Reset circuit breaker when internet comes back
                this.resetCircuitBreaker();

                this.connect();
            } else {
                console.log('[ChatWebSocket] Internet connectivity lost');
            }
        }
    }

    /**
     * Check if circuit breaker is closed (allowing connections)
     */
    private isCircuitBreakerClosed(): boolean {
        const now = Date.now();

        // If circuit is open, check if timeout has passed
        if (this.circuitBreakerState === 'OPEN') {
            if (now - this.lastCircuitBreakerReset > this.circuitBreakerTimeout) {
                console.log('[ChatWebSocket] Circuit breaker timeout passed, moving to HALF_OPEN');
                this.circuitBreakerState = 'HALF_OPEN';
                this.lastCircuitBreakerReset = now;
                return true; // Allow one attempt
            }
            return false; // Still in timeout
        }

        return true; // CLOSED or HALF_OPEN
    }

    /**
     * Handle circuit breaker success
     */
    private onCircuitBreakerSuccess(): void {
        if (this.circuitBreakerState === 'HALF_OPEN') {
            console.log('[ChatWebSocket] Circuit breaker test successful, moving to CLOSED');
            this.circuitBreakerState = 'CLOSED';
        }

        // Reset failure count on success
        this.circuitBreakerFailures = 0;
        this.lastCircuitBreakerReset = Date.now();
    }

    /**
     * Handle circuit breaker failure
     */
    private onCircuitBreakerFailure(): void {
        this.circuitBreakerFailures++;
        this.lastCircuitBreakerReset = Date.now();

        console.log(`[ChatWebSocket] Circuit breaker failure count: ${this.circuitBreakerFailures}/${this.circuitBreakerThreshold}`);

        // Check if we should open the circuit
        if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
            console.log('[ChatWebSocket] Circuit breaker threshold reached, opening circuit');
            this.circuitBreakerState = 'OPEN';
            this.lastCircuitBreakerReset = Date.now();
        }
    }

    /**
     * Reset circuit breaker (when network comes back)
     */
    private resetCircuitBreaker(): void {
        console.log('[ChatWebSocket] Resetting circuit breaker due to network recovery');
        this.circuitBreakerState = 'CLOSED';
        this.circuitBreakerFailures = 0;
        this.lastCircuitBreakerReset = Date.now();
    }

    /**
     * Get circuit breaker status
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

    // Set toast function from component
    public setToastFunction(toastFn: (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => void): void {
        this.toastFunction = toastFn;
        console.log('[WebSocket Manager] Toast function set successfully');
    }

}

// Singleton instance
export const chatWebSocketManager = new ChatWebSocketManager();