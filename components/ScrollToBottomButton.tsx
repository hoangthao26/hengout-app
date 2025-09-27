import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

interface ScrollToBottomButtonProps {
    isVisible: boolean;
    onPress: () => void;
    unreadCount?: number;
}

export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
    isVisible,
    onPress,
    unreadCount = 0
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!isVisible) return null;

    return (
        <TouchableOpacity
            style={[
                styles.scrollButton,
                {
                    backgroundColor: '#F48C06',
                    shadowColor: isDark ? '#000000' : '#000000'
                }
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={styles.scrollButtonText}>↓</Text>
            {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    scrollButton: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    scrollButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    unreadBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
