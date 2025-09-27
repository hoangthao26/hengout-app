import { useLocalSearchParams, useRouter } from 'expo-router';
import { Compass, SendHorizontal, Users } from 'lucide-react-native';
import NavigationService from '../../services/navigationService';
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
import { useChatStore } from '../../store/chatStore';
import { ChatConversation, ChatMessage } from '../../types/chat';

export default function ChatConversationScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { error } = useToast();
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const insets = useSafeAreaInsets();

    const {
        conversations,
        currentConversation,
        setCurrentConversation
    } = useChatStore();

    // Get conversation from store or local state
    const conversation = conversations.find(c => c.id === conversationId) || currentConversation;

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
                setCurrentConversation(response.data);
            }
        } catch (err: any) {
            console.error('Failed to load conversation:', err);
            error('Không thể tải thông tin cuộc trò chuyện');
        }
    }, [conversationId, error, setCurrentConversation]);

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

    // Load conversation if not in store
    useEffect(() => {
        if (!conversation && conversationId) {
            loadConversation();
        }
    }, [conversation, conversationId, loadConversation]);

    // Listen for conversation updates from store
    useEffect(() => {
        // This will trigger re-render when conversation data changes in store
        // The conversation variable will automatically update due to Zustand subscription
    }, [conversation]);

    // Helper function to check if messages should be grouped
    // Note: With inverted FlatList, index 0 is the latest message
    const shouldShowSenderInfo = (currentMessage: ChatMessage, nextMessage: ChatMessage | null) => {
        if (currentMessage.mine) return false; // Never show sender info for my messages

        if (!nextMessage) return true; // Last message (oldest) always shows sender info

        if (nextMessage.mine) return true; // Show sender info before my message

        // Check if same sender and within 5 minutes
        const currentTime = new Date(currentMessage.createdAt).getTime();
        const nextTime = new Date(nextMessage.createdAt).getTime();
        const timeDiff = nextTime - currentTime; // Note: next is older, so nextTime > currentTime
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        return currentMessage.senderId !== nextMessage.senderId || timeDiff > fiveMinutes;
    };

    // Helper function to check if message is at the end of a group
    const isLastInGroup = (currentMessage: ChatMessage, previousMessage: ChatMessage | null) => {
        if (currentMessage.mine) {
            if (!previousMessage) return true; // First message is always last in group
            if (!previousMessage.mine) return true; // Last in group if previous is other's message

            // Check if same sender and within 5 minutes
            const currentTime = new Date(currentMessage.createdAt).getTime();
            const previousTime = new Date(previousMessage.createdAt).getTime();
            const timeDiff = currentTime - previousTime; // Note: previous is newer, so previousTime > currentTime
            const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

            return currentMessage.senderId !== previousMessage.senderId || timeDiff > fiveMinutes;
        }

        if (!previousMessage) return true; // First message is always last in group

        if (previousMessage.mine) return true; // Last in group if previous is my message

        // Check if same sender and within 5 minutes
        const currentTime = new Date(currentMessage.createdAt).getTime();
        const previousTime = new Date(previousMessage.createdAt).getTime();
        const timeDiff = currentTime - previousTime; // Note: previous is newer, so previousTime > currentTime
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        return currentMessage.senderId !== previousMessage.senderId || timeDiff > fiveMinutes;
    };

    // Helper function to check if my message is first in group
    const isMyMessageFirstInGroup = (currentMessage: ChatMessage, nextMessage: ChatMessage | null) => {
        if (!currentMessage.mine) return false;

        if (!nextMessage) return true; // Last message (oldest) is first in group

        if (!nextMessage.mine) return true; // First in group if next is other's message

        // Check if same sender and within 5 minutes
        const currentTime = new Date(currentMessage.createdAt).getTime();
        const nextTime = new Date(nextMessage.createdAt).getTime();
        const timeDiff = nextTime - currentTime; // Note: next is older, so nextTime > currentTime
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        return currentMessage.senderId !== nextMessage.senderId || timeDiff > fiveMinutes;
    };

    // Helper function to get border radius for other messages
    const getOtherMessageBorderRadius = (showSenderInfo: boolean, isLastInGroupMessage: boolean) => {
        if (showSenderInfo && isLastInGroupMessage) {
            // Single message - normal border radius
            return styles.otherMessageFirstInGroup; // Use first in group style for single message
        } else if (showSenderInfo && !isLastInGroupMessage) {
            // First message in group - only bottom left radius
            return styles.otherMessageFirstInGroup;
        } else if (!showSenderInfo && isLastInGroupMessage) {
            // Last message in group - only top left radius
            return styles.otherMessageLastInGroup;
        } else {
            // Middle message in group - no left radius
            return styles.otherMessageMiddleInGroup;
        }
    };

    // Helper function to get border radius for my messages
    const getMyMessageBorderRadius = (isFirstInGroup: boolean, isLastInGroupMessage: boolean) => {
        if (isFirstInGroup && isLastInGroupMessage) {
            // Single message - normal border radius
            return styles.myMessageFirstInGroup;
        } else if (isFirstInGroup && !isLastInGroupMessage) {
            // First message in group - only bottom right radius
            return styles.myMessageFirstInGroup;
        } else if (!isFirstInGroup && isLastInGroupMessage) {
            // Last message in group - only top right radius
            return styles.myMessageLastInGroup;
        } else {
            // Middle message in group - both top and bottom right radius
            return styles.myMessageMiddleInGroup;
        }
    };

    // Render message item
    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isMyMessage = item.mine;
        // With inverted FlatList: index 0 = latest, index 1 = older, etc.
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showSenderInfo = shouldShowSenderInfo(item, nextMessage);
        const isLastInGroupMessage = isLastInGroup(item, previousMessage);
        const isMyMessageFirstInGroupFlag = isMyMessageFirstInGroup(item, nextMessage);

        return (
            <View
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
                ]}
            >
                {!isMyMessage && showSenderInfo && (
                    <Text style={[styles.senderName, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {item.senderName}
                    </Text>
                )}

                <View style={styles.messageRow}>
                    {!isMyMessage && (
                        <View style={styles.avatarContainer}>
                            {isLastInGroupMessage ? (
                                item.senderAvatar ? (
                                    <Image source={{ uri: item.senderAvatar }} style={styles.senderAvatar} />
                                ) : (
                                    <View style={styles.defaultSenderAvatar}>
                                        <Text style={styles.senderAvatarText}>
                                            {item.senderName?.charAt(0) || 'U'}
                                        </Text>
                                    </View>
                                )
                            ) : (
                                <View style={styles.avatarPlaceholder} />
                            )}
                        </View>
                    )}

                    <View
                        style={[
                            styles.messageBubble,
                            isMyMessage ? getMyMessageBorderRadius(isMyMessageFirstInGroupFlag, isLastInGroupMessage) : getOtherMessageBorderRadius(showSenderInfo, isLastInGroupMessage)
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
                    onPress={() => NavigationService.goToChatDetails(conversationId)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        {conversation?.avatarUrl ? (
                            <Image
                                source={{ uri: conversation.avatarUrl }}
                                style={styles.conversationAvatar}
                                resizeMode="contain"
                            />
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
                contentContainerStyle={{
                    paddingVertical: 8,
                    flexGrow: 1,
                    justifyContent: 'flex-start'
                }}
                style={{ flex: 1 }}
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
    messageContainer: { marginVertical: 1, paddingHorizontal: 16 },
    myMessageContainer: { alignItems: 'flex-end' },
    otherMessageContainer: { alignItems: 'flex-start' },
    messageRow: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: {
        width: 40, // Fixed width for consistent alignment
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarPlaceholder: { width: 32, height: 32 },
    senderAvatar: { width: 32, height: 32, borderRadius: 16 },
    defaultSenderAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center'
    },
    senderAvatarText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
    senderName: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 48, // avatarContainer width (40) + marginRight (8)
        marginBottom: 4
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18
    },

    myMessageFirstInGroup: { backgroundColor: '#F48C06', borderBottomRightRadius: 4, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18 },
    myMessageLastInGroup: { backgroundColor: '#F48C06', borderTopRightRadius: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
    myMessageMiddleInGroup: { backgroundColor: '#F48C06', borderTopRightRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
    // otherMessageBubble: { backgroundColor: '#E5E7EB', borderBottomLeftRadius: 4 },
    otherMessageFirstInGroup: { backgroundColor: '#E5E7EB', borderBottomLeftRadius: 4, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18 },
    otherMessageLastInGroup: { backgroundColor: '#E5E7EB', borderTopLeftRadius: 4, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 18 },
    otherMessageMiddleInGroup: { backgroundColor: '#E5E7EB', borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderTopRightRadius: 18, borderBottomRightRadius: 18 },
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
