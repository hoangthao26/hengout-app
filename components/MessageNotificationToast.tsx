import React, { useEffect, useRef } from 'react';
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Animated,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MessageCircle, X } from 'lucide-react-native';
import { ChatMessage, ChatConversation } from '../types/chat';

const { width: screenWidth } = Dimensions.get('window');

interface MessageNotificationToastProps {
    conversation: ChatConversation;
    message: ChatMessage;
    onPress: () => void;
    onDismiss: () => void;
    duration?: number;
}

const MessageNotificationToast: React.FC<MessageNotificationToastProps> = ({
    conversation,
    message,
    onPress,
    onDismiss,
    duration = 5000,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Animation values
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss
        timeoutRef.current = setTimeout(() => {
            handleDismiss();
        }, duration);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -200,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    const handlePress = () => {
        onPress();
        handleDismiss();
    };

    const getMessagePreview = (message: ChatMessage): string => {
        if (message.content?.text) {
            return message.content.text;
        }

        if (message.content?.name) {
            return message.content.name;
        }
        return 'New message';
    };

    const getConversationName = (conversation: ChatConversation): string => {
        if (conversation.type === 'PRIVATE') {
            return conversation.name || 'Unknown User';
        }
        return conversation.name || 'Group Chat';
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <BlurView
                intensity={isDark ? 20 : 30}
                tint={isDark ? 'dark' : 'light'}
                style={styles.blurContainer}
            >
                <LinearGradient
                    colors={
                        isDark
                            ? ['rgba(30, 30, 30, 0.9)', 'rgba(20, 20, 20, 0.9)']
                            : ['rgba(255, 255, 255, 0.9)', 'rgba(245, 245, 245, 0.9)']
                    }
                    style={styles.gradient}
                >
                    <Pressable
                        style={styles.content}
                        onPress={handlePress}
                        android_ripple={{
                            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {conversation.avatarUrl ? (
                                <Image
                                    source={{ uri: conversation.avatarUrl }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.defaultAvatar]}>
                                    <MessageCircle
                                        size={20}
                                        color={isDark ? '#fff' : '#000'}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Content */}
                        <View style={styles.textContainer}>
                            <View style={styles.header}>
                                <Text
                                    style={[
                                        styles.conversationName,
                                        { color: isDark ? '#fff' : '#000' },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {getConversationName(conversation)}
                                </Text>
                                <Text
                                    style={[
                                        styles.time,
                                        { color: isDark ? '#999' : '#666' },
                                    ]}
                                >
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.messagePreview,
                                    { color: isDark ? '#ccc' : '#333' },
                                ]}
                                numberOfLines={2}
                            >
                                {getMessagePreview(message)}
                            </Text>
                        </View>

                        {/* Dismiss Button - Only for dismiss, not for navigation */}
                        <Pressable
                            style={styles.dismissButton}
                            onPress={(e) => {
                                e.stopPropagation(); // Prevent triggering parent onPress
                                handleDismiss();
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X
                                size={16}
                                color={isDark ? '#999' : '#666'}
                            />
                        </Pressable>
                    </Pressable>
                </LinearGradient>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60, // Below status bar
        left: 12,
        right: 12,
        zIndex: 99999,
        elevation: 1000,
    },
    blurContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    gradient: {
        borderRadius: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        minHeight: 80,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    defaultAvatar: {
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 12,
        fontWeight: '500',
    },
    messagePreview: {
        fontSize: 14,
        lineHeight: 20,
    },
    dismissButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
});

export default MessageNotificationToast;
