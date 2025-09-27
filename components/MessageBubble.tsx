import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { ChatMessage } from '../types/chat';

interface MessageBubbleProps {
    message: ChatMessage;
    onPress?: () => void;
    onLongPress?: () => void;
    showAvatar?: boolean;
    showSenderName?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    onPress,
    onLongPress,
    showAvatar = true,
    showSenderName = true
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isMine = message.mine;

    const messageTime = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const handlePress = () => {
        onPress?.();
    };

    const handleLongPress = () => {
        onLongPress?.();
    };

    return (
        <TouchableOpacity
            style={[
                styles.messageContainer,
                isMine ? styles.myMessageContainer : styles.otherMessageContainer
            ]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            activeOpacity={0.7}
        >
            {!isMine && showAvatar && (
                <View style={styles.avatarContainer}>
                    {message.senderAvatar ? (
                        <Image
                            source={{ uri: message.senderAvatar }}
                            style={styles.messageAvatar}
                        />
                    ) : (
                        <View style={[styles.defaultAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.avatarText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {message.senderName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={[
                styles.messageBubble,
                isMine ? styles.myMessageBubble : styles.otherMessageBubble,
                {
                    backgroundColor: isMine
                        ? '#F48C06'
                        : isDark ? '#374151' : '#F3F4F6'
                }
            ]}>
                {!isMine && showSenderName && (
                    <Text style={[styles.senderName, { color: isDark ? '#F48C06' : '#F48C06' }]}>
                        {message.senderName}
                    </Text>
                )}

                <Text style={[
                    styles.messageText,
                    { color: isMine ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000' }
                ]}>
                    {message.content.text}
                </Text>

                <Text style={[
                    styles.messageTime,
                    { color: isMine ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280' }
                ]}>
                    {messageTime}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 4,
        alignItems: 'flex-end',
    },
    myMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
        marginBottom: 4,
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    defaultAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        marginHorizontal: 4,
    },
    myMessageBubble: {
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
});
