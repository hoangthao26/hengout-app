import React, { useEffect, useRef } from 'react';
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    Image,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { ChatMessage, ChatConversation } from '../types/chat';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MessageToastProps {
    conversation: ChatConversation;
    message: ChatMessage;
    onPress: () => void;
    onDismiss: () => void;
    duration?: number;
}

const MessageToast: React.FC<MessageToastProps> = ({
    conversation,
    message,
    onPress,
    onDismiss,
    duration = 5000,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debug logs
    console.log('[MessageToast] Component rendered:', {
        conversationId: conversation.id,
        messageId: message.id,
        messageContent: message.content?.text || 'Activity',
        duration: duration
    });

    // Animation values using Reanimated 3
    const slideAnim = useSharedValue(-200);
    const opacityAnim = useSharedValue(0);
    const panAnim = useSharedValue(0);
    const scaleAnim = useSharedValue(1);

    useEffect(() => {
        console.log('[MessageToast] useEffect triggered:', {
            messageId: message.id,
            messageContent: message.content?.text || 'Activity',
            duration: duration
        });

        // Clear existing timeout
        if (timeoutRef.current) {
            console.log('[MessageToast] Clearing existing timeout');
            clearTimeout(timeoutRef.current);
        }

        // Entrance animation with bounce effect
        slideAnim.value = withSpring(0, {
            damping: 12,
            stiffness: 200,
            mass: 0.8,
        });
        opacityAnim.value = withTiming(1, {
            duration: 400,
        });

        // Auto dismiss
        timeoutRef.current = setTimeout(() => {
            console.log('[MessageToast] Auto-dismiss timeout triggered');
            handleDismiss();
        }, duration);

        console.log('[MessageToast] Set new timeout:', duration);

        return () => {
            if (timeoutRef.current) {
                console.log('[MessageToast] Cleanup timeout');
                clearTimeout(timeoutRef.current);
            }
        };
    }, [message.id, duration]); // Depend on message.id and duration

    const handleDismiss = () => {
        console.log('[MessageToast] handleDismiss called');

        if (timeoutRef.current) {
            console.log('[MessageToast] Clearing timeout in handleDismiss');
            clearTimeout(timeoutRef.current);
        }

        // Exit animation with smooth slide up
        slideAnim.value = withTiming(-300, {
            duration: 250,
        });
        opacityAnim.value = withTiming(0, {
            duration: 250,
        }, () => {
            console.log('[MessageToast] Animation complete, calling onDismiss');
            runOnJS(onDismiss)();
        });
    };

    const handlePress = () => {
        // Add press animation
        scaleAnim.value = withSpring(0.95, {
            damping: 15,
            stiffness: 300,
        }, () => {
            scaleAnim.value = withSpring(1, {
                damping: 15,
                stiffness: 300,
            });
        });

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

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;

        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    // Create pan gesture using new API
    const pan = Gesture.Pan()
        .minDistance(5)
        .onUpdate((event) => {
            // Only allow upward swipes
            if (event.translationY < 0) {
                panAnim.value = event.translationY;
            }
        })
        .onEnd((event) => {
            const { translationY, velocityY } = event;

            // If swiped up more than 80px or velocity is high enough, dismiss
            if (translationY < -80 || velocityY < -800) {
                runOnJS(handleDismiss)();
            } else {
                // Snap back to original position with smooth animation
                panAnim.value = withSpring(0, {
                    damping: 20,
                    stiffness: 300,
                    mass: 0.5,
                });
            }
        })
        .runOnJS(true);

    // Create animated styles using Reanimated 3
    const animatedStyles = useAnimatedStyle(() => ({
        transform: [
            { translateY: slideAnim.value + panAnim.value },
            { scale: scaleAnim.value },
        ],
        opacity: opacityAnim.value,
    }));

    return (
        <GestureHandlerRootView style={styles.container}>
            <Animated.View style={[animatedStyles, styles.container]}>
                <GestureDetector gesture={pan}>
                    <Animated.View style={styles.gestureContainer}>
                        <View
                            style={[styles.backgroundContainer, {
                                backgroundColor: isDark ? '#1F2937' : '#F9FAFB'
                            }]}
                        >
                            <Pressable
                                style={styles.content}
                                onPress={handlePress}
                                android_ripple={{
                                    color: 'rgba(255, 255, 255, 0.1)',
                                }}
                            >
                                {/* Avatar */}
                                <View style={styles.avatarContainer}>
                                    {conversation.avatarUrl ? (
                                        <Image
                                            source={{ uri: conversation.avatarUrl }}
                                            style={styles.avatar}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.defaultAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                            <Text style={[styles.avatarText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                                {getConversationName(conversation).charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Content */}
                                <View style={styles.textContainer}>
                                    <View style={styles.headerRow}>
                                        <Text
                                            style={[styles.conversationName, {
                                                color: isDark ? '#FFFFFF' : '#000000'
                                            }]}
                                            numberOfLines={1}
                                        >
                                            {getConversationName(conversation)}
                                        </Text>
                                        <Text style={[styles.timestamp, {
                                            color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)'
                                        }]}>
                                            {formatTime(message.createdAt)}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[styles.messagePreview, {
                                            color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'
                                        }]}
                                        numberOfLines={2}
                                    >
                                        {getMessagePreview(message)}
                                    </Text>
                                </View>
                            </Pressable>
                        </View>

                    </Animated.View>
                </GestureDetector>
            </Animated.View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        // Bỏ position absolute - để ToastContainer handle positioning
    },
    gestureContainer: {
        borderRadius: 24, // Giống SimpleToast
        marginHorizontal: Math.min(16, screenWidth * 0.04), // Giống SimpleToast
        marginVertical: 4, // Giống SimpleToast
        maxWidth: screenWidth - 32, // Giống SimpleToast
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    backgroundContainer: {
        borderRadius: 24, // Giống SimpleToast
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12, // Giảm từ 16 xuống 12 để bù cho avatar lớn hơn
        minHeight: 80, // Giữ nguyên minHeight
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    defaultAvatar: {
        width: 60,
        height: 60,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22, // Tăng từ 18 lên 22 để phù hợp với avatar lớn hơn
        fontWeight: '600',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
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
    timestamp: {
        fontSize: 12,
        fontWeight: '500',
    },
    messagePreview: {
        fontSize: 14,
        lineHeight: 20,
    },
});

export default MessageToast;
