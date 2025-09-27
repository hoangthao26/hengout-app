import { useLocalSearchParams, useRouter } from 'expo-router';
import { Compass, SendHorizontal, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '../../components/BackButton';
import { useToast } from '../../contexts/ToastContext';
import { chatService } from '../../services/chatService';
import { ChatConversation, ChatMessage } from '../../types/chat';

export default function ChatConversationScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { error } = useToast();
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const insets = useSafeAreaInsets();

    const [conversation, setConversation] = useState<ChatConversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [page, setPage] = useState(0);

    const flatListRef = useRef<FlatList>(null);

    // Load conversation details
    const loadConversation = useCallback(async () => {
        if (!conversationId) return;
        try {
            const response = await chatService.getConversation(conversationId);
            if (response.status === 'success') {
                setConversation(response.data);
            }
        } catch (err: any) {
            console.error('Failed to load conversation:', err);
            error('Không thể tải thông tin cuộc trò chuyện');
        }
    }, [conversationId, error]);

    // Load messages (pagination)
    const loadMessages = useCallback(
        async (pageNum: number) => {
            if (!conversationId) return;
            try {
                const response = await chatService.getMessages(conversationId, pageNum, 50);
                if (response.status === 'success') {
                    // Server trả DESC (newest trước)
                    if (pageNum === 0) {
                        setMessages(response.data);
                    } else {
                        setMessages(prev => [...prev, ...response.data]); // append older
                    }
                }
            } catch (err: any) {
                console.error('Failed to load messages:', err);
                error('Không thể tải tin nhắn');
            } finally {
                setLoading(false);
            }
        },
        [conversationId, error]
    );

    // Send message
    const sendMessage = useCallback(async () => {
        if (!messageText.trim() || !conversationId || sending) return;

        setSending(true);
        try {
            const response = await chatService.sendMessage({
                conversationId,
                type: 'TEXT',
                content: { text: messageText.trim() }
            });

            if (response.status === 'success') {
                setMessages(prev => [response.data, ...prev]); // prepend mới nhất
                setMessageText('');

            } else {
                error('Không thể gửi tin nhắn');
            }
        } catch (err: any) {
            console.error('Failed to send message:', err);
            error('Lỗi khi gửi tin nhắn');
        } finally {
            setSending(false);
        }
    }, [messageText, conversationId, sending, error]);

    // Handle back press
    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    // Load data on mount
    useEffect(() => {
        loadConversation();
        loadMessages(0);
    }, [loadConversation, loadMessages]);

    // Render message item
    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isMyMessage = item.mine;
        return (
            <View
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
                ]}
            >
                {!isMyMessage && (
                    <View style={styles.messageHeader}>
                        {item.senderAvatar ? (
                            <Image source={{ uri: item.senderAvatar }} style={styles.senderAvatar} />
                        ) : (
                            <View style={styles.defaultSenderAvatar}>
                                <Text style={styles.senderAvatarText}>
                                    {item.senderName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.senderName, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {item.senderName}
                        </Text>
                    </View>
                )}

                <View
                    style={[
                        styles.messageBubble,
                        isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            { color: isMyMessage ? '#FFFFFF' : '#000000' }
                        ]}
                    >
                        {chatService.formatMessageContent(item)}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <View style={[styles.header, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <BackButton onPress={handleBack} />
                    <View style={styles.headerContent}>
                        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Đang tải...
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.compassButton}>
                        <Compass size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <BackButton onPress={handleBack} />
                <TouchableOpacity
                    style={styles.headerContent}
                    onPress={() => router.push(`/chat/${conversationId}/details` as any)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        {conversation?.avatarUrl ? (
                            <Image source={{ uri: conversation.avatarUrl }} style={styles.conversationAvatar} />
                        ) : (
                            <View style={styles.defaultConversationAvatar}>
                                <Users size={20} color="#9CA3AF" />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {conversation?.name || 'Cuộc trò chuyện'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.compassButton}>
                    <Compass size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
            </View>

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                inverted
                onEndReached={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    loadMessages(nextPage); // load older khi kéo lên
                }}
                onEndReachedThreshold={0.2}
                contentContainerStyle={{ paddingVertical: 8 }}
            />

            {/* Message Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? -20 : 0}
            >
                <View
                    style={[
                        styles.inputContainer,
                        {
                            backgroundColor: isDark ? '#000000' : '#FFFFFF',
                            paddingBottom: Math.max(insets.bottom, 16)
                        }
                    ]}
                >
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[
                                styles.messageInput,
                                {
                                    backgroundColor: '#FFFFFF',
                                    color: '#000000'
                                }
                            ]}
                            placeholder="Gửi tin nhắn..."
                            placeholderTextColor="#9CA3AF"
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            maxLength={1000}
                        />
                        {messageText.trim() && (
                            <TouchableOpacity
                                style={styles.sendButton}
                                onPress={sendMessage}
                                disabled={sending}
                            >
                                <SendHorizontal size={32} color={isDark ? '#FFFFFF' : '#000000'} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 12
    },
    avatarContainer: { marginRight: 12 },
    conversationAvatar: { width: 40, height: 40, borderRadius: 20 },
    defaultConversationAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#374151'
    },
    headerTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
    compassButton: { padding: 8, marginLeft: 8 },
    messageContainer: { marginVertical: 4, paddingHorizontal: 16 },
    myMessageContainer: { alignItems: 'flex-end' },
    otherMessageContainer: { alignItems: 'flex-start' },
    messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    senderAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
    defaultSenderAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center'
    },
    senderAvatarText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
    senderName: { fontSize: 12, fontWeight: '500' },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20
    },
    myMessageBubble: { backgroundColor: '#F48C06', borderBottomRightRadius: 4 },
    otherMessageBubble: { backgroundColor: '#E5E7EB', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 16, lineHeight: 20 },
    inputContainer: { paddingHorizontal: 16, paddingVertical: 16 },
    inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 10,
        fontSize: 16,
        minHeight: 34,
        maxHeight: 100,
        textAlignVertical: 'top'
    },
    sendButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center'
    }
});
