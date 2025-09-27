import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useColorScheme, View } from 'react-native';

interface TypingIndicatorProps {
    isVisible?: boolean;
    color?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
    isVisible = true,
    color
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    const dotColor = color || (isDark ? '#9CA3AF' : '#6B7280');

    useEffect(() => {
        if (!isVisible) return;

        const animateDot = (dot: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const animation = Animated.parallel([
            animateDot(dot1, 0),
            animateDot(dot2, 200),
            animateDot(dot3, 400),
        ]);

        animation.start();

        return () => {
            animation.stop();
        };
    }, [isVisible, dot1, dot2, dot3]);

    if (!isVisible) return null;

    return (
        <View style={styles.typingContainer}>
            <View style={[
                styles.typingBubble,
                { backgroundColor: isDark ? '#374151' : '#F3F4F6' }
            ]}>
                <View style={styles.typingDots}>
                    <Animated.View
                        style={[
                            styles.typingDot,
                            {
                                backgroundColor: dotColor,
                                opacity: dot1,
                                transform: [{
                                    scale: dot1.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1.2],
                                    }),
                                }],
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.typingDot,
                            {
                                backgroundColor: dotColor,
                                opacity: dot2,
                                transform: [{
                                    scale: dot2.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1.2],
                                    }),
                                }],
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.typingDot,
                            {
                                backgroundColor: dotColor,
                                opacity: dot3,
                                transform: [{
                                    scale: dot3.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1.2],
                                    }),
                                }],
                            }
                        ]}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    typingContainer: {
        flexDirection: 'row',
        marginVertical: 4,
        alignItems: 'flex-end',
    },
    typingBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        marginHorizontal: 4,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 2,
    },
});
