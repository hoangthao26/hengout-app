import { createWebSocketConnection, WebSocketConnection, WebSocketMessage } from './websocketService';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { ChatMessage } from '../types/chat';
import { databaseService } from './databaseService';
import { smartSyncManager } from './smartSyncManager';
import NetInfo from '@react-native-community/netinfo';

/**
 * Chat WebSocket Manager
 * 
 * Manages WebSocket connection for real-time chat functionality.
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Circuit breaker pattern for failure handling
 * - Network state monitoring
 * - Connection health monitoring with ping/pong
 * - Message deduplication
 * - Subscription management for conversations
 * - Background sync coordination
 */
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

    /**
     * Establish WebSocket connection to chat server
     * 
     * Connection process:
     * 1. Validates network availability
     * 2. Checks circuit breaker state (prevents connection during failures)
     * 3. Creates WebSocket connection
     * 4. Sets up event handlers and monitoring
     * 5. Re-subscribes to previously subscribed conversations
     * 6. Triggers background sync for consistency
     * 
     * Auto-reconnects on failure unless explicitly shutdown (e.g., during logout)
     */
    async connect(): Promise<void> {
        // Re-enable connections if previously shutdown (e.g., after logout/login)
        this.isShutdown = false;

        // Prevent duplicate connection attempts
        if (this.connection || this.isConnecting) {
            return;
        }

        // Validate network availability before attempting connection
        if (!this.isNetworkAvailable) {
            // Network not available, skipping connection (will retry when network restored)
            return;
        }

        // Check circuit breaker state - don't attempt connection if circuit is open
        if (!this.isCircuitBreakerClosed()) {
            // Circuit breaker is open due to recent failures, skipping connection attempt
            return;
        }

        // Double-check shutdown state (might have changed during validation)
        if (this.isShutdown) {
            return;
        }
        this.isConnecting = true;

        try {
            // Create WebSocket connection to chat server
            if (this.isShutdown) {
                this.isConnecting = false;
                return;
            }
            this.connection = await createWebSocketConnection('wss://api.hengout.app/social-service/ws/native');
            await this.connection.ready;

            // Connection successful - reset state
            this.reconnectAttempts = 0;
            this.isConnecting = false;

            // Circuit breaker: Reset failure count on successful connection
            this.onCircuitBreakerSuccess();

            // Set up event handlers for connection lifecycle (open, close, error, message)
            this.setupConnectionEventHandlers();

            // Start monitoring network state changes
            this.startNetworkMonitoring();

            // Start connection health monitoring (ping/pong)
            this.startConnectionMonitoring();

            // Re-subscribe to all previously subscribed conversations
            // This ensures we receive messages for all active conversations after reconnection
            if (this.subscribedConversations.size > 0) {
                for (const conversationId of this.subscribedConversations) {
                    this.subscribeToConversation(conversationId, true);
                }
            }

            // Trigger background sync when reconnected to ensure data consistency
            // Syncs all subscribed conversations to catch any missed messages
            if (this.subscribedConversations.size > 0) {
                const conversationIds = Array.from(this.subscribedConversations);
                smartSyncManager.scheduleBatchSync(conversationIds, 'websocket_reconnect');
            }

        } catch (error) {
            console.error('[ChatWebSocket] Connection failed:', error);
            this.isConnecting = false;

            // Circuit breaker: Record failure (may open circuit if threshold exceeded)
            this.onCircuitBreakerFailure();

            // Attempt reconnection unless explicitly shutdown (e.g., during logout)
            if (!this.isShutdown) {
                this.handleReconnect();
            }
        }
    }

    /**
     * Disconnect WebSocket connection
     * 
     * Stops all monitoring and prevents auto-reconnect.
     * Maintains subscription list for reconnection scenarios.
     * Called during logout or app shutdown.
     */
    async disconnect(): Promise<void> {
        if (this.connection) {
            // Mark shutdown to prevent auto-reconnect attempts
            this.isShutdown = true;

            // Stop connection health monitoring
            this.stopConnectionMonitoring();

            // Stop network state monitoring
            this.stopNetworkMonitoring();

            // Disconnect WebSocket
            this.connection.disconnect();
            this.connection = null;
            // Note: Don't clear subscribedConversations to maintain subscription list
            // This allows re-subscription on reconnect without needing to re-register all conversations
        }
    }

    /**
     * Subscribe to receive real-time messages for a conversation
     * 
     * Sets up message listeners for both regular messages and activity updates.
     * Validates WebSocket connection state before subscribing.
     * 
     * @param conversationId - ID of conversation to subscribe to
     * @param silent - If true, suppresses warning logs when connection unavailable
     */
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

        try {
            this.subscribedConversations.add(conversationId);

            this.connection.subscribe(conversationId, async (message: WebSocketMessage) => {
                await this.handleMessage(conversationId, message);
            });

            this.connection.subscribeToActivity(conversationId, async (message: WebSocketMessage) => {
                await this.handleMessage(conversationId, message);
            });
        } catch (error) {
            console.error(`[ChatWebSocket] Failed to subscribe to conversation ${conversationId}:`, error);
            // Remove from subscribed list if failed
            this.subscribedConversations.delete(conversationId);
            throw error;
        }
    }

    /**
     * Unsubscribe from a conversation
     * 
     * Removes conversation from subscription list.
     * Note: Actual WebSocket unsubscription is handled by connection lifecycle.
     * 
     * @param conversationId - ID of conversation to unsubscribe from
     */
    unsubscribeFromConversation(conversationId: string): void {
        this.subscribedConversations.delete(conversationId);
    }

    /**
     * Subscribe to all conversations (used by initializationService)
     * 
     * Main strategy: Maintain subscriptions for all user conversations.
     * This ensures real-time updates for all conversations without needing
     * to manually subscribe/unsubscribe when navigating.
     * 
     * @param conversationIds - Array of conversation IDs to subscribe to
     */
    async subscribeToAllConversations(conversationIds: string[]): Promise<void> {
        for (const conversationId of conversationIds) {
            this.subscribeToConversation(conversationId, true);
        }
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
    }

    /**
     * Send message via WebSocket
     * 
     * Sends message to server through WebSocket connection.
     * Also schedules background sync to ensure message persistence in database.
     * 
     * @param messageData - Message data to send
     * @param messageData.conversationId - Target conversation ID
     * @param messageData.type - Message type ('TEXT' or 'ACTIVITY')
     * @param messageData.content - Message content (text for TEXT, activity data for ACTIVITY)
     */
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
            // WebSocket not connected - message will be queued or sent via API fallback
            return;
        }

        // Format message according to WebSocket protocol
        const message = {
            type: 'SEND_MESSAGE',
            data: {
                conversationId: messageData.conversationId,
                type: messageData.type,
                content: messageData.content
            }
        };

        this.connection.send(message);

        // Schedule background sync to ensure message is persisted in database
        smartSyncManager.scheduleSync(messageData.conversationId, 'message_sent');
    }

    /**
     * Route incoming WebSocket messages to appropriate handlers
     * 
     * Central message dispatcher that handles different message types:
     * - NEW_MESSAGE: Regular chat messages
     * - ACTIVITY_UPDATE: Activity status changes
     * - LOCATION_UPDATE: Location sharing updates
     * - ERROR: Server-side errors
     * 
     * @param conversationId - ID of conversation the message belongs to
     * @param message - WebSocket message payload
     */
    private async handleMessage(conversationId: string, message: WebSocketMessage): Promise<void> {
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

    /**
     * Handle new message from WebSocket with intelligent routing
     * 
     * Complex message handling logic:
     * 1. Determines message ownership (own vs others) via senderName comparison
     * 2. Prevents duplicate messages by checking message ID in store
     * 3. Routes own messages vs others' messages differently:
     *    - Own messages: Update lastMessage only (no notification, already shown)
     *    - Others' messages: Add to message list + trigger notification + update lastMessage
     * 4. Syncs with database for offline support and conversation ordering
     * 5. Schedules background sync for consistency
     * 
     * Ownership detection handles multiple name formats:
     * - Exact match with displayName/email
     * - Vietnamese "Bạn" (You)
     * - English "You"
     * 
     * @param conversationId - ID of conversation receiving message
     * @param messageData - Raw message data from WebSocket
     */
    private async handleNewMessage(conversationId: string, messageData: any): Promise<void> {
        // Get current user info to determine message ownership
        const { user } = useAuthStore.getState();
        const currentUserName = user?.displayName || user?.email;

        // Fallback auth check: Verify tokens if user state not available (edge case)
        if (!currentUserName && !user) {
            try {
                const { AuthHelper } = await import('./authHelper');
                const tokens = await AuthHelper.getTokens();
                if (!tokens?.accessToken) {
                    console.warn('[ChatWebSocket] User not authenticated');
                }
            } catch (error) {
                console.error('[ChatWebSocket] Failed to check auth fallback:', error);
            }
        }

        // Determine if message is from current user by comparing senderName
        // Handles multiple name formats for internationalization
        const isOwnMessage =
            messageData.senderName === currentUserName ||
            messageData.senderName === 'Bạn' ||
            messageData.senderName === 'You';

        // Prevent duplicate messages - check if already exists in store (idempotency)
        const { conversationMessages } = useChatStore.getState();
        const existingMessages = conversationMessages[conversationId] || [];
        const messageExists = existingMessages.some(msg => msg.id === messageData.id);

        if (messageExists) {
            return; // Already processed, skip
        }

        // Route 1: Own messages - update lastMessage only (no notification needed)
        // User already sees their own message in UI, just update conversation preview
        if (isOwnMessage) {

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

            // Update database to maintain conversation ordering (for SQLite queries)
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
            } catch (error) {
                console.error('[ChatWebSocket] Failed to update database for own message:', error);
            }

            return; // Own message handling complete
        }

        // Route 2: Others' messages - full processing with notification
        // Create ChatMessage object for store and database
        const chatMessage: ChatMessage = {
            id: messageData.id,
            conversationId: conversationId,
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            senderAvatar: messageData.senderAvatar || '',
            type: messageData.type,
            content: messageData.content,
            createdAt: messageData.createdAt,
            mine: isOwnMessage
        };

        // Step 1: Add message to conversation messages list (triggers notification internally)
        const { addConversationMessage, updateConversation } = useChatStore.getState();
        addConversationMessage(conversationId, chatMessage);

        // Step 2: Update conversation's lastMessage to refresh conversation list preview
        updateConversation(conversationId, {
            lastMessage: chatMessage
        });

        // Step 3: Sync with database for offline support and conversation ordering
        try {
            await databaseService.updateConversationLastMessage(
                conversationId,
                chatMessage.id,
                chatMessage.createdAt,
                chatMessage.mine,
                chatMessage.senderName
            );
        } catch (error) {
            console.error('[ChatWebSocket] Failed to update database for new message:', error);
        }

        // Step 4: Schedule background sync to ensure consistency with server
        smartSyncManager.scheduleSync(conversationId, 'new_message_received');
    }

    /**
     * Handle activity status update from WebSocket
     * 
     * Processes activity updates which can be:
     * - New activity creation (ON_GOING status)
     * - Activity status changes (completed, cancelled, etc.)
     * 
     * Strategy:
     * - Creates new message for ON_GOING activities
     * - Updates existing message for status changes
     * - Shows toast notifications for status changes
     * 
     * @param conversationId - ID of conversation containing the activity
     * @param activityData - Activity update data from server
     */
    private async handleActivityUpdate(conversationId: string, activityData: any): Promise<void> {
        if (!activityData) return;

        // Get current user info to determine if this is my activity
        const { user } = useAuthStore.getState();
        const isMyActivity = user?.displayName === activityData.creatorName;

        const { addConversationMessage, updateConversationMessage, updateConversation, conversationMessages } = useChatStore.getState();

        // Check if activity message already exists in conversation
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

            // Update database for new activity
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

            // Show toast notification for status changes
            this.showActivityStatusToast(activityData.status, activityData.name);
        } else {
            // Fallback: create new message if existing not found
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

            // Only update lastMessage for ON_GOING status
            if (activityData.status === 'ON_GOING') {
                updateConversation(conversationId, {
                    lastMessage: activityMessage
                });
            }
        }
    }

    private showActivityStatusToast(status: string, activityName: string): void {
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

        if (this.toastFunction) {
            this.toastFunction(toastType, toastTitle, toastMessage);
        }
    }

    private handleLocationUpdate(conversationId: string, locationData: any): void {
        // Location update handled silently
    }

    /**
     * Handle WebSocket reconnection with exponential backoff
     * 
     * Reconnection strategy:
     * 1. Validates max attempts not exceeded (prevents infinite retries)
     * 2. Checks network availability (delays 10s if unavailable)
     * 3. Checks circuit breaker state (delays 30s if circuit is open)
     * 4. Uses exponential backoff: delay = baseDelay * 2^(attempt-1)
     * 
     * Exponential backoff examples:
     * - Attempt 1: 1000ms (1s)
     * - Attempt 2: 2000ms (2s)
     * - Attempt 3: 4000ms (4s)
     * - Attempt 4: 8000ms (8s)
     * - Attempt 5: 16000ms (16s)
     * 
     * Prevents overwhelming server with rapid reconnection attempts.
     */
    private handleReconnect(): void {
        // Stop reconnecting if max attempts reached
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ChatWebSocket] Max reconnect attempts reached');
            return;
        }

        // Check network availability before reconnecting
        if (!this.isNetworkAvailable) {
            // Network unavailable - retry after 10 seconds
            setTimeout(() => {
                this.handleReconnect();
            }, 10000);
            return;
        }

        // Check circuit breaker state before reconnecting
        if (!this.isCircuitBreakerClosed()) {
            // Circuit breaker open - retry after 30 seconds (may reset by then)
            setTimeout(() => {
                this.handleReconnect();
            }, 30000);
            return;
        }

        // Increment attempt counter and calculate exponential backoff delay
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        // Attempt reconnection after calculated delay
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
    }

    /**
     * Stop connection monitoring
     */
    private stopConnectionMonitoring(): void {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    /**
     * Check connection health and send ping
     */
    private checkConnectionHealth(): void {
        if (!this.connection) {
            return;
        }

        try {
            // Send ping to check connection
            this.connection.send({ type: 'PING' });
            this.lastPingTime = Date.now();
        } catch (error) {
            console.error('[ChatWebSocket] Ping failed:', error);
            this.handleConnectionLoss();
        }
    }

    /**
     * Handle connection loss
     */
    private handleConnectionLoss(): void {
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
        if (this.lastConnectionStatus !== connected) {
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
    }

    /**
     *  Stop network monitoring
     */
    private stopNetworkMonitoring(): void {
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
            this.networkUnsubscribe = null;
        }
    }

    /**
     * Handle network state changes with intelligent reconnection
     * 
     * Monitors three network state transitions:
     * 1. Network came back online (was offline → now online)
     *    - Resets reconnect attempts (fresh start)
     *    - Resets circuit breaker (clear failure state)
     *    - Attempts immediate reconnection
     * 
     * 2. Network went offline (was online → now offline)
     *    - Connection loss will be detected by WebSocket close event
     *    - No immediate action needed
     * 
     * 3. Internet connectivity changed (was connected → now disconnected or vice versa)
     *    - If internet restored: Reset attempts, reset circuit breaker, reconnect
     *    - If internet lost: Will be handled by connection loss detection
     * 
     * @param wasAvailable - Previous network availability state
     * @param wasConnected - Previous internet connectivity state
     */
    private handleNetworkStateChange(wasAvailable: boolean, wasConnected: boolean): void {
        // Case 1: Network came back online after being offline
        if (!wasAvailable && this.isNetworkAvailable) {
            this.reconnectAttempts = 0; // Reset reconnect attempts for fresh start

            // Reset circuit breaker when network comes back (clear failure state)
            this.resetCircuitBreaker();

            // Attempt immediate reconnection
            this.connect();
        }
        // Case 2: Network went offline
        else if (wasAvailable && !this.isNetworkAvailable) {
            // Connection loss will be handled by WebSocket close event handler
        }
        // Case 3: Internet connectivity changed (wifi with/without internet, etc.)
        else if (wasConnected !== this.isConnectedToInternet) {
            if (this.isConnectedToInternet) {
                // Internet restored - reset state and reconnect
                this.reconnectAttempts = 0;
                this.resetCircuitBreaker();
                this.connect();
            }
            // Internet lost - handled by connection loss detection
        }
    }

    /**
     * Check if circuit breaker allows new connection attempts
     * 
     * Circuit breaker states:
     * - CLOSED: Normal operation, allows connections
     * - OPEN: Too many failures, blocks connections until timeout expires
     * - HALF_OPEN: Testing state after timeout, allows one attempt
     * 
     * State transitions:
     * - CLOSED → OPEN: When failures exceed threshold
     * - OPEN → HALF_OPEN: After timeout period expires
     * - HALF_OPEN → CLOSED: On successful connection
     * - HALF_OPEN → OPEN: On failed connection
     * 
     * @returns true if connections allowed (CLOSED or HALF_OPEN), false if blocked (OPEN in timeout)
     */
    private isCircuitBreakerClosed(): boolean {
        const now = Date.now();

        // Circuit is OPEN - check if timeout period has elapsed
        if (this.circuitBreakerState === 'OPEN') {
            if (now - this.lastCircuitBreakerReset > this.circuitBreakerTimeout) {
                // Timeout expired - transition to HALF_OPEN (allow one test attempt)
                this.circuitBreakerState = 'HALF_OPEN';
                this.lastCircuitBreakerReset = now;
                return true; // Allow one attempt to test connection
            }
            return false; // Still in timeout period, block connections
        }

        return true; // CLOSED or HALF_OPEN - connections allowed
    }

    /**
     * Handle circuit breaker success (connection succeeded)
     * 
     * State transition logic:
     * - If HALF_OPEN: Transition to CLOSED (connection test succeeded)
     * - If CLOSED: Reset failure count (prevent accumulation)
     * 
     * Resets failure tracking on successful connection to allow normal operation.
     */
    private onCircuitBreakerSuccess(): void {
        if (this.circuitBreakerState === 'HALF_OPEN') {
            // HALF_OPEN test succeeded - fully close circuit (back to normal)
            this.circuitBreakerState = 'CLOSED';
        }

        // Reset failure count on success (prevents false positives)
        this.circuitBreakerFailures = 0;
        this.lastCircuitBreakerReset = Date.now();
    }

    /**
     * Handle circuit breaker failure (connection failed)
     * 
     * Failure tracking logic:
     * 1. Increment failure counter
     * 2. Update reset timestamp
     * 3. Check threshold: If failures >= threshold, open circuit
     * 
     * Circuit breaker opens after threshold failures (default: 5)
     * to prevent wasting resources on repeated failed connection attempts.
     * 
     * State transitions:
     * - CLOSED: Increment failures, open if threshold reached
     * - HALF_OPEN: Increment failures, immediately open (test failed)
     */
    private onCircuitBreakerFailure(): void {
        this.circuitBreakerFailures++;
        this.lastCircuitBreakerReset = Date.now();

        // Open circuit if failure threshold exceeded
        if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
            this.circuitBreakerState = 'OPEN';
            this.lastCircuitBreakerReset = Date.now();
        }
    }

    /**
     * Reset circuit breaker (when network comes back)
     */
    private resetCircuitBreaker(): void {
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
    }

}

// Singleton instance
export const chatWebSocketManager = new ChatWebSocketManager();