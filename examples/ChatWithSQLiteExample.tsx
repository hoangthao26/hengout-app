import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useChatSync } from '../hooks/useChatSync';
import { ChatMessage, ChatConversation } from '../types/chat';

/**
 * Example component showing how to use SQLite chat sync
 * This replaces the need for direct API calls in chat components
 */
const ChatWithSQLiteExample: React.FC = () => {
    const {
        isInitialized,
        isSyncing,
        syncStats,
        forceSync,
        getConversations,
        getMessages,
        sendMessage,
        syncMessages
    } = useChatSync();

    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    // Load conversations on mount
    useEffect(() => {
        if (isInitialized) {
            loadConversations();
        }
    }, [isInitialized]);

    // Load messages when conversation is selected
    useEffect(() => {
        if (selectedConversationId && isInitialized) {
            loadMessages(selectedConversationId);
        }
    }, [selectedConversationId, isInitialized]);

    const loadConversations = async () => {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            // Load from local DB first (instant)
            const localMessages = await getMessages(conversationId);
            setMessages(localMessages);

            // Then sync from server (background)
            const syncedMessages = await syncMessages(conversationId);
            setMessages(syncedMessages);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSendMessage = async (conversationId: string, text: string) => {
        try {
            const newMessage = await sendMessage({
                conversationId,
                type: 'TEXT',
                content: { text }
            });

            // Message is automatically added to local DB and UI updates
            console.log('Message sent:', newMessage);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleForceSync = async () => {
        try {
            await forceSync();
            // Reload data after sync
            await loadConversations();
            if (selectedConversationId) {
                await loadMessages(selectedConversationId);
            }
        } catch (error) {
            console.error('Force sync failed:', error);
        }
    };

    if (!isInitialized) {
        return (
            <View style={styles.container}>
                <Text>Initializing chat database...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Sync Status */}
            <View style={styles.syncStatus}>
                <Text style={styles.syncText}>
                    Conversations: {syncStats.conversations} |
                    Messages: {syncStats.messages} |
                    Unsynced: {syncStats.unsyncedMessages}
                </Text>
                <TouchableOpacity
                    style={styles.syncButton}
                    onPress={handleForceSync}
                    disabled={isSyncing}
                >
                    <Text style={styles.syncButtonText}>
                        {isSyncing ? 'Syncing...' : 'Force Sync'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Conversations List */}
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.conversationItem,
                            selectedConversationId === item.id && styles.selectedConversation
                        ]}
                        onPress={() => setSelectedConversationId(item.id)}
                    >
                        <Text style={styles.conversationName}>{item.name}</Text>
                        <Text style={styles.conversationLastMessage}>
                            {item.lastMessage?.content.text || 'No messages'}
                        </Text>
                    </TouchableOpacity>
                )}
                style={styles.conversationsList}
            />

            {/* Messages List */}
            {selectedConversationId && (
                <View style={styles.messagesContainer}>
                    <Text style={styles.messagesTitle}>
                        Messages ({messages.length})
                    </Text>
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={[
                                styles.messageItem,
                                item.mine && styles.myMessage
                            ]}>
                                <Text style={styles.messageText}>
                                    {item.content.text}
                                </Text>
                                <Text style={styles.messageTime}>
                                    {new Date(item.createdAt).toLocaleTimeString()}
                                </Text>
                            </View>
                        )}
                        style={styles.messagesList}
                        inverted
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    syncStatus: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginBottom: 16,
    },
    syncText: {
        fontSize: 12,
        color: '#666',
    },
    syncButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    syncButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    conversationsList: {
        flex: 1,
        marginBottom: 16,
    },
    conversationItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    selectedConversation: {
        backgroundColor: '#e3f2fd',
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    conversationLastMessage: {
        fontSize: 14,
        color: '#666',
    },
    messagesContainer: {
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingTop: 16,
    },
    messagesTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    messagesList: {
        flex: 1,
    },
    messageItem: {
        padding: 12,
        marginVertical: 4,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#007AFF',
        alignSelf: 'flex-end',
    },
    messageText: {
        fontSize: 16,
        color: '#333',
    },
    messageTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
});

export default ChatWithSQLiteExample;
