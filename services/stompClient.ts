// STOMP Client Wrapper for WebSocket Communication

import { Client, IMessage, StompSubscription, IFrame, StompHeaders } from '@stomp/stompjs';
import {
    StompClientConfig,
    StompFrame,
    StompConnectionHeaders,
    StompSubscriptionHeaders,
    StompMessageHeaders
} from '../types/stomp';

export class StompClientWrapper {
    private client: Client | null = null;
    private isConnected: boolean = false;
    private subscriptions: Map<string, StompSubscription> = new Map();
    private connectionCallbacks: Array<(connected: boolean) => void> = [];
    private errorCallbacks: Array<(error: Error) => void> = [];

    constructor() {
        // Initialize with default config
    }

    /**
     * Connect to STOMP broker
     */
    async connect(config: StompClientConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Create STOMP client
                this.client = new Client({
                    brokerURL: config.brokerURL,
                    connectHeaders: config.connectHeaders as StompHeaders,
                    debug: config.debug || this.defaultDebug,
                    heartbeatIncoming: config.heartbeatIncoming || 10000,
                    heartbeatOutgoing: config.heartbeatOutgoing || 10000,
                    reconnectDelay: config.reconnectDelay || 5000,
                    // maxReconnectAttempts: config.maxReconnectAttempts || 5, // Not supported in this version

                    onConnect: (frame: IFrame) => {
                        console.log('✅ STOMP connected successfully:', frame);
                        this.isConnected = true;
                        this.notifyConnectionCallbacks(true);

                        if (config.onConnect) {
                            config.onConnect(frame as StompFrame);
                        }
                        resolve();
                    },

                    onDisconnect: () => {
                        console.log('❌ STOMP disconnected');
                        this.isConnected = false;
                        this.subscriptions.clear();
                        this.notifyConnectionCallbacks(false);

                        if (config.onDisconnect) {
                            config.onDisconnect();
                        }
                    },

                    onStompError: (frame: IFrame) => {
                        console.error('❌ STOMP error:', frame);
                        this.isConnected = false;
                        const error = new Error(`STOMP Error: ${frame.body || 'Unknown error'}`);
                        this.notifyErrorCallbacks(error);

                        if (config.onStompError) {
                            config.onStompError(frame as StompFrame);
                        }
                        reject(error);
                    },

                    onWebSocketError: (error: Event) => {
                        console.error('❌ WebSocket error:', error);
                        this.isConnected = false;
                        const wsError = new Error(`WebSocket Error: ${error.type}`);
                        this.notifyErrorCallbacks(wsError);

                        if (config.onWebSocketError) {
                            config.onWebSocketError(error);
                        }
                        reject(wsError);
                    },

                    onWebSocketClose: (event: CloseEvent) => {
                        console.log('🔌 WebSocket closed:', event.code, event.reason);
                        this.isConnected = false;
                        this.subscriptions.clear();
                        this.notifyConnectionCallbacks(false);

                        if (config.onWebSocketClose) {
                            config.onWebSocketClose(event);
                        }
                    }
                });

                // Activate connection
                this.client.activate();

            } catch (error) {
                console.error('❌ Failed to create STOMP client:', error);
                reject(error);
            }
        });
    }

    /**
     * Disconnect from STOMP broker
     */
    async disconnect(): Promise<void> {
        if (this.client && this.isConnected) {
            try {
                // Unsubscribe from all subscriptions
                this.subscriptions.forEach((subscription) => {
                    subscription.unsubscribe();
                });
                this.subscriptions.clear();

                // Deactivate client
                await this.client.deactivate();
                this.client = null;
                this.isConnected = false;

                console.log('✅ STOMP disconnected successfully');
            } catch (error) {
                console.error('❌ Error during disconnect:', error);
                throw error;
            }
        }
    }

    /**
     * Send message to destination
     */
    async send(destination: string, headers: StompMessageHeaders, body: string): Promise<void> {
        if (!this.client || !this.isConnected) {
            throw new Error('STOMP client not connected');
        }

        try {
            this.client.publish({
                destination,
                headers: headers as StompHeaders,
                body
            });

            console.log('📤 Message sent to:', destination);
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Subscribe to destination
     */
    subscribe(destination: string, callback: (message: IMessage) => void, headers?: StompSubscriptionHeaders): StompSubscription {
        if (!this.client || !this.isConnected) {
            throw new Error('STOMP client not connected');
        }

        try {
            const subscription = this.client.subscribe(destination, callback, headers as StompHeaders);

            // Store subscription for cleanup
            const subscriptionId = headers?.id || `sub_${Date.now()}_${Math.random()}`;
            this.subscriptions.set(subscriptionId, subscription);

            console.log('📥 Subscribed to:', destination);
            return subscription;
        } catch (error) {
            console.error('❌ Failed to subscribe:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from destination
     */
    unsubscribe(subscriptionId: string): void {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(subscriptionId);
            console.log('📤 Unsubscribed from:', subscriptionId);
        }
    }

    /**
     * Check if client is connected
     */
    isClientConnected(): boolean {
        return this.isConnected && this.client !== null;
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
        if (this.isConnected && this.client) {
            return 'connected';
        }
        if (this.client) {
            return 'connecting';
        }
        return 'disconnected';
    }

    /**
     * Add connection change callback
     */
    onConnectionChange(callback: (connected: boolean) => void): void {
        this.connectionCallbacks.push(callback);
    }

    /**
     * Add error callback
     */
    onError(callback: (error: Error) => void): void {
        this.errorCallbacks.push(callback);
    }

    /**
     * Remove connection change callback
     */
    removeConnectionCallback(callback: (connected: boolean) => void): void {
        const index = this.connectionCallbacks.indexOf(callback);
        if (index > -1) {
            this.connectionCallbacks.splice(index, 1);
        }
    }

    /**
     * Remove error callback
     */
    removeErrorCallback(callback: (error: Error) => void): void {
        const index = this.errorCallbacks.indexOf(callback);
        if (index > -1) {
            this.errorCallbacks.splice(index, 1);
        }
    }

    /**
     * Get active subscriptions count
     */
    getActiveSubscriptionsCount(): number {
        return this.subscriptions.size;
    }

    /**
     * Get active subscriptions
     */
    getActiveSubscriptions(): string[] {
        return Array.from(this.subscriptions.keys());
    }

    /**
     * Default debug function
     */
    private defaultDebug = (str: string): void => {
        console.log('🔍 STOMP Debug:', str);
    };

    /**
     * Notify connection callbacks
     */
    private notifyConnectionCallbacks(connected: boolean): void {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error('❌ Error in connection callback:', error);
            }
        });
    }

    /**
     * Notify error callbacks
     */
    private notifyErrorCallbacks(error: Error): void {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error('❌ Error in error callback:', callbackError);
            }
        });
    }
}

// Export singleton instance
export const stompClient = new StompClientWrapper();
