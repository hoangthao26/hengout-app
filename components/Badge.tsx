import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';

interface BadgeProps {
    conversationId?: string;
    showZero?: boolean;
    maxCount?: number;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    textColor?: string;
}

const Badge: React.FC<BadgeProps> = ({
    conversationId,
    showZero = false,
    maxCount = 99,
    size = 'medium',
    color,
    textColor,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const { getUnreadCount, hasUnreadMessages, totalUnreadCount } = useNotificationStore();

    // Get count
    const count = conversationId
        ? getUnreadCount(conversationId)
        : totalUnreadCount;

    // Don't show if count is 0 and showZero is false
    if (count === 0 && !showZero) {
        return null;
    }

    // Don't show if conversation has no unread messages
    if (conversationId && !hasUnreadMessages(conversationId)) {
        return null;
    }

    // Format count
    const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

    // Size styles
    const sizeStyles = {
        small: {
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            fontSize: 10,
            paddingHorizontal: 4,
        },
        medium: {
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            fontSize: 12,
            paddingHorizontal: 6,
        },
        large: {
            minWidth: 24,
            height: 24,
            borderRadius: 12,
            fontSize: 14,
            paddingHorizontal: 8,
        },
    };

    const currentSizeStyle = sizeStyles[size];

    return (
        <View
            style={[
                styles.badge,
                currentSizeStyle,
                {
                    backgroundColor: color || (isDark ? '#FF3B30' : '#FF3B30'),
                },
            ]}
        >
            <Text
                style={[
                    styles.text,
                    {
                        color: textColor || '#FFFFFF',
                        fontSize: currentSizeStyle.fontSize,
                    },
                ]}
                numberOfLines={1}
            >
                {displayCount}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default Badge;
