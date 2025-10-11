import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import Header from '../../components/Header';

export default function SimpleGestureTestScreen() {
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    // Simple animation value
    const scale = useSharedValue(1);

    // Simple tap gesture
    const tapGesture = Gesture.Tap()
        .onStart(() => {
            console.log('Simple tap started');
        })
        .onEnd(() => {
            console.log('Simple tap ended');
            scale.value = withSpring(1.2, {}, () => {
                scale.value = withSpring(1);
            });
        });

    // Animated style
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title="Simple Gesture Test"
                showBackButton
                onBackPress={() => router.back()}
            />

            <View style={styles.content}>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Simple Gesture Test
                </Text>

                <Text style={[styles.instruction, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    Tap the box below to test gesture
                </Text>

                <GestureDetector gesture={tapGesture}>
                    <Animated.View style={[
                        styles.testBox,
                        { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                        animatedStyle
                    ]}>
                        <Text style={[styles.boxText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Tap Me
                        </Text>
                    </Animated.View>
                </GestureDetector>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    instruction: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
    },
    testBox: {
        width: 150,
        height: 150,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    boxText: {
        fontSize: 18,
        fontWeight: '600',
    },
});


