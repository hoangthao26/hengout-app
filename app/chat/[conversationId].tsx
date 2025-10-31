import { useLocalSearchParams, useRouter } from 'expo-router';
import { SendHorizontal, User, Users, Compass, Calendar, MapPin } from 'lucide-react-native';
import NavigationService from '../../services/navigationService';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { ChatErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import { chatService } from '../../services/chatService';
import { useChatStore } from '../../store/chatStore';
import { useChatSync } from '../../hooks/useChatSync';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { ChatConversation, ChatMessage } from '../../types/chat';
import CreateActivityModal from '../../components/CreateActivityModal';
import ActivityDetailsModal from '../../components/ActivityDetailsModal';
import { chatWebSocketManager } from '../../services/chatWebSocketManager';
import { notificationManager } from '../../services/notificationManager';

export default function ChatConversationScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { error, success, warning, info } = useToast();
    const router = useRouter();
    const navigation = useNavigation();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const insets = useSafeAreaInsets();

    const {
        conversations,
        currentConversation,
        setCurrentConversation,
        // Store-First Messages
        conversationMessages,
        messageSnapshots,
        getMessageSnapshot,
        setConversationMessages,
        addConversationMessage,
        updateConversationMessage,
        setMessageSnapshot,
        // Caching
        getCachedMessages,
        updateCachedMessages,
        shouldSyncMessages,
        markSyncTime
    } = useChatStore();

    // SQLite Chat Sync
    const {
        isInitialized: chatSyncInitialized,
        getMessages: getMessagesFromDB,
        sendMessage: sendMessageWithSync,
        syncMessages
    } = useChatSync();

    // WebSocket for real-time messages
    const {
        subscribe,
        unsubscribe,
        sendMessage: sendWebSocketMessage
    } = useChatWebSocket();

    // Get conversation from store or local state
    const conversation = conversations.find(c => c.id === conversationId) || currentConversation;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sending, setSending] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [page, setPage] = useState(0);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showActivityDetailsModal, setShowActivityDetailsModal] = useState(false);
    const [selectedActivityId, setSelectedActivityId] = useState<string>('');



    const flatListRef = useRef<FlatList>(null);

    // Helper function to remove duplicate messages by ID
    const removeDuplicateMessages = (messages: ChatMessage[]): ChatMessage[] => {
        return messages.filter((msg, index, arr) =>
            arr.findIndex(m => m.id === msg.id) === index
        );
    };

    // Render activity message content - completely separate from regular messages
    const renderActivityMessage = (message: ChatMessage) => {
        const { name, purpose, creatorName, creatorAvatar } = message.content;
        const isMyMessage = message.mine;

        // Use creator info from content if available, fallback to message sender info
        const displayName = creatorName || message.senderName;
        const displayAvatar = creatorAvatar || message.senderAvatar;

        return (
            <View style={styles.activityMessageWrapper}>
                {/* Activity message container - centered and separate */}
                <TouchableOpacity
                    style={[
                        styles.activityMessageContainer,
                        isMyMessage ? styles.myActivityContainer : styles.otherActivityContainer
                    ]}
                    onPress={() => handleActivityDetails(message.content.activityId || '')}
                    activeOpacity={0.7}
                >
                    {/* Activity header with sender info */}
                    <View style={styles.activityHeader}>
                        <View style={styles.activitySenderInfo}>
                            {!isMyMessage && (
                                <View style={styles.activityAvatarContainer}>
                                    {displayAvatar ? (
                                        <Image
                                            source={{ uri: displayAvatar }}
                                            style={styles.activitySenderAvatar}
                                        />
                                    ) : (
                                        <View style={styles.activityDefaultAvatar}>
                                            <User size={12} color="#9CA3AF" />
                                        </View>
                                    )}
                                </View>
                            )}
                            <View style={styles.activityTitleContainer}>
                                <Text style={styles.activitySenderName}>
                                    {isMyMessage ? 'Bạn' : displayName}
                                </Text>
                                <Text style={styles.activityTitle}>
                                    đã tạo hoạt động
                                </Text>
                            </View>
                        </View>
                        <Calendar size={16} color="#F48C06" />
                    </View>

                    <View style={styles.activityContent}>
                        <Text style={styles.activityName}>
                            {name || message.content?.name || 'Không có tên'}
                        </Text>

                        {(purpose || message.content?.purpose) && (
                            <Text style={styles.activityPurpose}>
                                {purpose || message.content?.purpose}
                            </Text>
                        )}

                        {/* Tap indicator */}
                        <View style={styles.tapIndicator}>
                            <Text style={styles.tapIndicatorText}>Nhấn để xem chi tiết</Text>
                        </View>
                    </View>

                </TouchableOpacity>
            </View>
        );
    };

    // Load conversation details
    const loadConversation = useCallback(async () => {
        if (!conversationId) return;

        // Check if conversation still exists in store (might have been removed after disband/leave)
        const conversationExists = conversations.find(c => c.id === conversationId);
        if (!conversationExists) {
            console.log(`[Chat] Conversation ${conversationId} no longer exists in store, skipping load`);
            // Navigate back if conversation was removed
            router.replace('/(tabs)/chat');
            return;
        }

        try {
            const response = await chatService.getConversation(conversationId);
            if (response.status === 'success') {
                setCurrentConversation(response.data);
            }
        } catch (err: any) {
            // If 403 or 404, conversation was likely deleted/disbanded
            if (err?.response?.status === 403 || err?.response?.status === 404) {
                console.log(`[Chat] Conversation ${conversationId} not accessible (403/404), likely disbanded`);
                // Navigate back if we're on a deleted conversation
                router.replace('/(tabs)/chat');
                return;
            }
            console.error('Failed to load conversation:', err);
            error('Không thể tải thông tin cuộc trò chuyện');
        }
    }, [conversationId, error, setCurrentConversation, conversations, router]);

    // Store-First Message Loading
    const loadMessages = useCallback(
        async (pageNum: number) => {
            if (!conversationId || isLoadingMessages) return;

            setIsLoadingMessages(true);
            console.log(`Loading messages for conversation: ${conversationId}, page: ${pageNum}`);

            try {
                // 1. Check store first (instant display)
                const storeMessages = conversationMessages[conversationId] || [];
                console.log(`DEBUG - Store check: conversationId=${conversationId}, storeMessages.length=${storeMessages.length}`);
                console.log(`DEBUG - All conversationMessages keys:`, Object.keys(conversationMessages));

                if (pageNum === 0 && storeMessages.length > 0) {
                    setMessages(storeMessages);
                    console.log(`Instant display: ${storeMessages.length} messages from store`);
                    setIsLoadingMessages(false);
                    return; // Exit early if we have store messages
                }

                // 2. Check snapshot (recent messages for instant display)
                const snapshotMessages = getMessageSnapshot(conversationId);
                if (pageNum === 0 && snapshotMessages.length > 0) {
                    setMessages(snapshotMessages);
                    setConversationMessages(conversationId, snapshotMessages);
                    console.log(`Instant display: ${snapshotMessages.length} messages from snapshot`);
                    setIsLoadingMessages(false);
                    return; // Exit early if we have snapshot messages
                }

                // 3. Load from SQLite (fast fallback)
                if (chatSyncInitialized) {
                    console.log(`Loading from SQLite...`);
                    const localMessages = await getMessagesFromDB(conversationId, 50, pageNum * 50);
                    console.log(`Loaded ${localMessages.length} messages from SQLite`);

                    if (pageNum === 0) {
                        // Remove duplicates before setting messages
                        const uniqueLocalMessages = removeDuplicateMessages(localMessages);
                        setMessages(uniqueLocalMessages);
                        setConversationMessages(conversationId, uniqueLocalMessages);
                        setMessageSnapshot(conversationId, uniqueLocalMessages.slice(0, 20)); // Keep recent 20 for instant display
                    } else {
                        // Remove duplicates when appending messages
                        const uniqueNewMessages = localMessages.filter(msg =>
                            !storeMessages.some(existingMsg => existingMsg.id === msg.id)
                        );
                        if (uniqueNewMessages.length > 0) {
                            setMessages(prev => {
                                const combined = [...prev, ...uniqueNewMessages];
                                return removeDuplicateMessages(combined);
                            });
                            setConversationMessages(conversationId, [...storeMessages, ...uniqueNewMessages]);
                        }
                    }

                    // 4. Background sync from server (only if needed)
                    if (shouldSyncMessages(conversationId)) {
                        console.log(`Starting background sync...`);
                        setTimeout(async () => {
                            try {
                                const response = await chatService.getMessages(conversationId, pageNum, 50);
                                if (response.status === 'success') {
                                    const syncedMessages = response.data;
                                    console.log(`Synced ${syncedMessages.length} messages from server`);

                                    if (pageNum === 0) {
                                        // Only update if server has newer messages
                                        setMessages(prev => {
                                            if (prev.length === 0 ||
                                                (syncedMessages.length > 0 && syncedMessages[0].id !== prev[0].id)) {
                                                // Remove duplicates from synced messages
                                                const uniqueSyncedMessages = removeDuplicateMessages(syncedMessages);
                                                // Defer store updates to next tick to avoid cross-render setState warnings
                                                setTimeout(() => {
                                                    setConversationMessages(conversationId, uniqueSyncedMessages);
                                                    setMessageSnapshot(conversationId, uniqueSyncedMessages.slice(0, 20));
                                                }, 0);
                                                return uniqueSyncedMessages;
                                            }
                                            return prev; // Keep local data if no newer messages
                                        });
                                    } else {
                                        setMessages(prev => {
                                            // Remove duplicates when appending synced messages
                                            const uniqueNewMessages = syncedMessages.filter(msg =>
                                                !prev.some(existingMsg => existingMsg.id === msg.id)
                                            );
                                            if (uniqueNewMessages.length > 0) {
                                                const newMessages = [...prev, ...uniqueNewMessages];
                                                // Defer store updates to next tick to avoid cross-render setState warnings
                                                setTimeout(() => {
                                                    setConversationMessages(conversationId, newMessages);
                                                }, 0);
                                                return newMessages;
                                            }
                                            return prev;
                                        });
                                    }
                                    markSyncTime(conversationId);
                                }
                            } catch (syncError) {
                                console.error('Background sync failed:', syncError);
                                // Continue with local data
                            }
                        }, 100); // Small delay to ensure UI renders first
                    }
                } else {
                    // Fallback to direct API call if SQLite not ready
                    console.log(`Loading from API (SQLite not ready)...`);
                    const response = await chatService.getMessages(conversationId, pageNum, 50);
                    if (response.status === 'success') {
                        console.log(`Loaded ${response.data.length} messages from API`);

                        if (pageNum === 0) {
                            // Remove duplicates before setting messages
                            const uniqueApiMessages = removeDuplicateMessages(response.data);
                            setMessages(uniqueApiMessages);
                            setConversationMessages(conversationId, uniqueApiMessages);
                            setMessageSnapshot(conversationId, uniqueApiMessages.slice(0, 20));
                        } else {
                            // Remove duplicates when appending messages
                            const uniqueNewMessages = response.data.filter(msg =>
                                !storeMessages.some(existingMsg => existingMsg.id === msg.id)
                            );
                            if (uniqueNewMessages.length > 0) {
                                setMessages(prev => {
                                    const combined = [...prev, ...uniqueNewMessages];
                                    return removeDuplicateMessages(combined);
                                });
                                setConversationMessages(conversationId, [...storeMessages, ...uniqueNewMessages]);
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error('Failed to load messages:', err);
                error('Không thể tải tin nhắn');
            } finally {
                setIsLoadingMessages(false);
            }
        },
        [conversationId, chatSyncInitialized, getMessagesFromDB, error, isLoadingMessages, conversationMessages, getMessageSnapshot, setConversationMessages, setMessageSnapshot, shouldSyncMessages, markSyncTime]
    );

    // Optimistic UI Send Message
    const sendMessage = useCallback(async () => {
        if (!messageText.trim() || !conversationId || sending) return;

        const messageContent = messageText.trim();
        setMessageText('');
        setSending(true);

        // Create optimistic message with unique ID
        const optimisticMessage: ChatMessage = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique temporary ID
            conversationId,
            senderId: 'current_user', // Will be replaced by actual user ID
            senderName: 'Bạn', // Consistent with WebSocket logic
            senderAvatar: '',
            content: { text: messageContent },
            type: 'TEXT',
            // REMOVED: Message status not supported by API
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mine: true
        };

        try {
            // 1. Add to store immediately (optimistic UI)
            addConversationMessage(conversationId, optimisticMessage);
            setMessages(prev => [optimisticMessage, ...prev]);
            console.log(`Optimistic message added: ${messageContent}`);

            if (chatSyncInitialized) {
                // 2. Send to server with sync
                const result = await sendMessageWithSync({
                    conversationId,
                    type: 'TEXT',
                    content: { text: messageContent }
                });

                // 3. Update message with real data
                if (result && result.id) {
                    updateConversationMessage(conversationId, optimisticMessage.id, {
                        id: result.id,
                        senderId: result.senderId,
                        senderName: result.senderName
                    });
                    console.log(`Message sent successfully: ${result.id}`);
                }
            } else {
                // Try direct API call first
                try {
                    const response = await chatService.sendMessage({
                        conversationId,
                        type: 'TEXT',
                        content: { text: messageContent }
                    });

                    if (response.status === 'success') {
                        updateConversationMessage(conversationId, optimisticMessage.id, {
                            id: response.data.id,
                            senderId: response.data.senderId,
                            senderName: response.data.senderName
                        });
                    } else {
                        throw new Error('API call failed');
                    }
                } catch (apiError) {
                    // Fallback to WebSocket if API fails
                    console.log('[Chat] API failed, trying WebSocket fallback');
                    sendWebSocketMessage({
                        conversationId,
                        type: 'TEXT',
                        content: { text: messageContent }
                    });
                    // Keep optimistic message as is - WebSocket will handle confirmation
                }
            }
        } catch (err: any) {
            console.error('Failed to send message:', err);
            error('Lỗi khi gửi tin nhắn');

            // REMOVED: No need to update status since we don't show status indicators

            setMessageText(messageContent); // Restore message text
        } finally {
            setSending(false);
        }
    }, [messageText, conversationId, sending, chatSyncInitialized, sendMessageWithSync, error, addConversationMessage, updateConversationMessage]);



    // Handle back press - use router.back() like settings for natural animation
    const handleBack = useCallback(() => {
        // Use router.back() for natural slide_from_right animation like other pages
        router.back();
    }, [router]);

    // Handle activity details
    const handleActivityDetails = useCallback((activityId: string) => {
        setSelectedActivityId(activityId);
        setShowActivityDetailsModal(true);
    }, []);

    const handleCloseActivityDetails = useCallback(() => {
        setShowActivityDetailsModal(false);
        setSelectedActivityId('');
    }, []);

    // Load data on mount - only run once
    useEffect(() => {
        if (conversationId) {
            // Set current conversation immediately for notification tracking
            const conversation = conversations.find(c => c.id === conversationId);
            if (conversation) {
                setCurrentConversation(conversation);
            }

            loadConversation();
            loadMessages(0);
        }
    }, [conversationId]); // Only depend on conversationId

    // Mark conversation as read when entering conversation - only on focus
    useFocusEffect(
        React.useCallback(() => {
            if (conversationId) {
                try {
                    notificationManager.markConversationAsRead(conversationId);
                } catch (error) {
                    // Silent fail
                }
            }
        }, [conversationId])
    );

    // WebSocket subscription management
    useEffect(() => {
        if (conversationId) {
            //  OPTIMIZED: Không cần subscribe nữa vì đã subscribe toàn bộ khi mở app
            // subscribe(conversationId);
            console.log('[Chat] Conversation opened:', conversationId, '- Already subscribed globally');
        }

        // No cleanup - maintain subscription for "subscribe all conversations" strategy
        // Conversations are managed globally by initializationService
    }, [conversationId]);

    // Set toast function for WebSocket manager
    useEffect(() => {
        const toastFunction = (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => {
            console.log(`[Chat] Toast Function Called with: ${type} - ${title} - ${message}`);
            switch (type) {
                case 'success':
                    success(title, message);
                    break;
                case 'info':
                    info(title, message);
                    break;
                case 'warning':
                    warning(title, message);
                    break;
                case 'error':
                    error(title, message);
                    break;
            }
        };

        // Set toast function directly
        chatWebSocketManager.setToastFunction(toastFunction);
    }, [success, info, warning, error]);

    // Load conversation if not in store - only when conversation changes
    useEffect(() => {
        if (!conversation && conversationId) {
            loadConversation();
        }
    }, [conversation, conversationId]); // Remove loadConversation from dependencies

    // Listen for conversation updates from store
    useEffect(() => {
        // This will trigger re-render when conversation data changes in store
        // The conversation variable will automatically update due to Zustand subscription
    }, [conversation]);

    // Sync messages from store to local state for real-time updates
    useEffect(() => {
        if (conversationId && conversationMessages[conversationId]) {
            const storeMessages = conversationMessages[conversationId];
            setMessages(prevMessages => {
                // Only update if store has more messages or different messages
                if (storeMessages.length !== prevMessages.length ||
                    storeMessages.some((storeMsg, index) =>
                        !prevMessages[index] || storeMsg.id !== prevMessages[index].id
                    )) {

                    // Remove duplicates by ID before syncing
                    const uniqueMessages = removeDuplicateMessages(storeMessages);

                    console.log('[Chat] Synced messages from store:', {
                        storeCount: storeMessages.length,
                        uniqueCount: uniqueMessages.length,
                        localCount: prevMessages.length,
                        latestMessage: uniqueMessages[0]?.content?.text?.substring(0, 20) + '...'
                    });

                    return uniqueMessages;
                }
                return prevMessages;
            });
        }
    }, [conversationId, conversationMessages[conversationId]]); // Only depend on specific conversation messages

    // Clear current conversation when component unmounts
    useEffect(() => {
        return () => {
            setCurrentConversation(null);
        };
    }, [conversationId, setCurrentConversation]);



    // Helper function to check if messages should be grouped
    // Note: With inverted FlatList, index 0 is the latest message
    const shouldShowSenderInfo = (currentMessage: ChatMessage, nextMessage: ChatMessage | null) => {
        if (currentMessage.mine) return false; // Never show sender info for my messages

        if (!nextMessage) return true; // Last message (oldest) always shows sender info

        if (nextMessage.mine) return true; // Show sender info before my message

        // Always show sender info if next message is ACTIVITY type (to separate text from activity)
        if (nextMessage.type === 'ACTIVITY') return true;

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

            // Always break group if previous message is ACTIVITY type
            if (previousMessage.type === 'ACTIVITY') return true;

            // Check if same sender and within 5 minutes
            const currentTime = new Date(currentMessage.createdAt).getTime();
            const previousTime = new Date(previousMessage.createdAt).getTime();
            const timeDiff = currentTime - previousTime; // Note: previous is newer, so previousTime > currentTime
            const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

            return currentMessage.senderId !== previousMessage.senderId || timeDiff > fiveMinutes;
        }

        if (!previousMessage) return true; // First message is always last in group

        if (previousMessage.mine) return true; // Last in group if previous is my message

        // Always break group if previous message is ACTIVITY type
        if (previousMessage.type === 'ACTIVITY') return true;

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

        // Always break group if next message is ACTIVITY type
        if (nextMessage.type === 'ACTIVITY') return true;

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
        // For ACTIVITY messages, render completely separate layout
        if (item.type === 'ACTIVITY') {
            return renderActivityMessage(item);
        }

        // Regular message rendering
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
                                        <User size={16} color="#9CA3AF" />
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

                        {/* REMOVED: Hide all message status indicators */}
                    </View>
                </View>
            </View>
        );
    };


    return (
        <ChatErrorBoundary>
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
                                    {conversation?.type === 'GROUP' ? (
                                        <Users size={20} color="#9CA3AF" />
                                    ) : (
                                        <User size={20} color="#9CA3AF" />
                                    )}
                                </View>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {conversation?.name || 'Cuộc trò chuyện'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Compass Icon */}
                    <TouchableOpacity
                        style={styles.compassButton}
                        onPress={() => setShowActivityModal(true)}
                        activeOpacity={0.7}
                    >
                        <Compass
                            size={32}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                    </TouchableOpacity>

                </View>

                {/* Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => {
                        // This prevents duplicate key errors when messages have same ID
                        return `${item.id}_${index}`;
                    }}
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
                    // FlatList performance optimizations
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={20}
                    getItemLayout={(data, index) => ({
                        length: 60, // Estimated item height
                        offset: 60 * index,
                        index,
                    })}
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

                {/* Create Activity Modal */}
                <CreateActivityModal
                    visible={showActivityModal}
                    onClose={() => setShowActivityModal(false)}
                    conversationId={conversationId || ''}
                    onActivityCreated={(activity) => {
                        console.log('Activity created:', activity);
                        // Handle activity creation success
                    }}
                />

                {/* Activity Details Modal */}
                <ActivityDetailsModal
                    visible={showActivityDetailsModal}
                    onClose={handleCloseActivityDetails}
                    activityId={selectedActivityId}
                    activityName={messages.find(msg =>
                        msg.type === 'ACTIVITY' && msg.content.activityId === selectedActivityId
                    )?.content?.name}
                />
            </View>
        </ChatErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 2,
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
    headerTitle: { fontSize: 18, fontWeight: '600' },
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
    senderName: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 48,
        marginTop: 16,
        marginBottom: 4
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 6,
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
    // Activity message styles - completely separate from regular messages
    activityMessageWrapper: {
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 16,
    },
    activityMessageContainer: {
        width: '85%',
        maxWidth: 280,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    myActivityContainer: {
        backgroundColor: '#FEF3E2',
        borderColor: '#F48C06',
    },
    otherActivityContainer: {
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    activitySenderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    activityAvatarContainer: {
        marginRight: 8,
    },
    activitySenderAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    activityDefaultAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    activitySenderName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        marginRight: 4,
    },
    activityTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
    activityContent: {
        marginBottom: 0,
    },
    activityName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#1F2937',
    },
    activityPurpose: {
        fontSize: 14,
        lineHeight: 18,
        color: '#6B7280',
    },
    tapIndicator: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
    },
    tapIndicatorText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    messageStatusContainer: {
        marginTop: 4,
        alignItems: 'flex-end'
    },
    messageStatus: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.7
    },
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
    },

});
