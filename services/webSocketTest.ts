// WebSocket Connection Test

import { webSocketService } from './webSocketService';
import { AuthHelper } from './authHelper';

/**
 * Test WebSocket connection
 */
export const testWebSocketConnection = async (): Promise<void> => {
    console.log('🧪 Testing WebSocket connection...');

    try {
        // Check authentication first
        const isAuthenticated = await AuthHelper.isAuthenticated();
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, cannot test WebSocket');
            return;
        }

        console.log('✅ User is authenticated, proceeding with WebSocket test');

        // Test connection
        await webSocketService.connect();
        console.log('✅ WebSocket connection test successful');

        // Test subscription (with a dummy conversation ID)
        const testConversationId = 'test-conversation-123';
        webSocketService.subscribeToConversation(testConversationId, (message) => {
            console.log('📥 Test message received:', message);
        });

        console.log('✅ WebSocket subscription test successful');

        // Wait a bit then disconnect
        setTimeout(async () => {
            await webSocketService.disconnect();
            console.log('✅ WebSocket disconnect test successful');
        }, 5000);

    } catch (error) {
        console.error('❌ WebSocket connection test failed:', error);
    }
};

/**
 * Test WebSocket with mock message
 */
export const testWebSocketMessage = async (): Promise<void> => {
    console.log('🧪 Testing WebSocket message sending...');

    try {
        // Check if connected
        if (!webSocketService.isConnected()) {
            console.log('❌ WebSocket not connected, cannot test message sending');
            return;
        }

        // Create test message
        const testMessage = {
            id: `test_${Date.now()}`,
            conversationId: 'test-conversation-123',
            senderId: 'test-sender',
            senderName: 'Test User',
            senderAvatar: '',
            type: 'TEXT' as const,
            content: {
                text: 'This is a test message'
            },
            createdAt: new Date().toISOString(),
            mine: false
        };

        // Send test message
        await webSocketService.sendMessage(testMessage);
        console.log('✅ WebSocket message sending test successful');

    } catch (error) {
        console.error('❌ WebSocket message sending test failed:', error);
    }
};

/**
 * Run all WebSocket tests
 */
export const runWebSocketTests = async (): Promise<void> => {
    console.log('🚀 Running WebSocket tests...');

    await testWebSocketConnection();

    // Wait for connection to establish
    setTimeout(async () => {
        await testWebSocketMessage();
    }, 2000);
};
