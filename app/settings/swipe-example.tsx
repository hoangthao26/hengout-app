import React, { useCallback, useRef } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AntDesign } from '@expo/vector-icons';
import { Swiper, type SwiperCardRefType } from 'rn-swiper-list';
import Header from '../../components/Header';
import NavigationService from '../../services/navigationService';

// Sample images using Unsplash URLs
const IMAGES = [
    { uri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400' },
    { uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400' },
    { uri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' },
    { uri: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400' },
    { uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400' },
    { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' },
];

const ICON_SIZE = 24;

const SwipeExampleScreen = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const ref = useRef<SwiperCardRefType>(null);

    // Debug: Log data
    console.log('IMAGES length:', IMAGES.length);
    console.log('IMAGES data:', IMAGES);

    const renderCard = useCallback((image: any, index: number) => {
        console.log(`Rendering card ${index}:`, image);
        return (
            <View style={[styles.renderCardContainer, { backgroundColor: `hsl(${index * 60}, 70%, 80%)` }]}>
                <Image
                    source={image}
                    style={styles.renderCardImage}
                    resizeMode="cover"
                />
                <View style={styles.debugOverlay}>
                    <Text style={styles.debugText}>Card {index + 1}</Text>
                </View>
            </View>
        );
    }, []);

    const renderFlippedCard = useCallback(
        (_: any, index: number) => {
            return (
                <View style={[styles.renderFlippedCardContainer, { backgroundColor: isDark ? '#374151' : '#baeee5' }]}>
                    <Text style={[styles.text, { color: isDark ? '#FFFFFF' : '#001a72' }]}>
                        Flipped content {index}
                    </Text>
                </View>
            );
        },
        [isDark]
    );

    const OverlayLabelRight = useCallback(() => {
        return (
            <View
                style={[
                    styles.overlayLabelContainer,
                    {
                        backgroundColor: 'green',
                    },
                ]}
            />
        );
    }, []);

    const OverlayLabelLeft = useCallback(() => {
        return (
            <View
                style={[
                    styles.overlayLabelContainer,
                    {
                        backgroundColor: 'red',
                    },
                ]}
            />
        );
    }, []);

    const OverlayLabelTop = useCallback(() => {
        return (
            <View
                style={[
                    styles.overlayLabelContainer,
                    {
                        backgroundColor: 'blue',
                    },
                ]}
            />
        );
    }, []);

    const OverlayLabelBottom = useCallback(() => {
        return (
            <View
                style={[
                    styles.overlayLabelContainer,
                    {
                        backgroundColor: 'orange',
                    },
                ]}
            />
        );
    }, []);

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title="Swipe Example - Docs Style"
                onBackPress={() => NavigationService.goBack()}
                variant="settings"
            />

            <View style={styles.subContainer}>
                <Swiper
                    ref={ref}
                    data={IMAGES}
                    cardStyle={styles.cardStyle}
                    overlayLabelContainerStyle={styles.overlayLabelContainerStyle}
                    renderCard={renderCard}
                    keyExtractor={(item, index) => index.toString()}
                    prerenderItems={3}
                    onIndexChange={(index) => {
                        console.log('Current Active index', index);
                    }}
                    onSwipeRight={(cardIndex) => {
                        console.log('cardIndex', cardIndex);
                    }}
                    onPress={() => {
                        console.log('onPress');
                    }}
                    onSwipedAll={() => {
                        console.log('onSwipedAll');
                    }}
                    FlippedContent={renderFlippedCard}
                    onSwipeLeft={(cardIndex) => {
                        console.log('onSwipeLeft', cardIndex);
                    }}
                    onSwipeTop={(cardIndex) => {
                        console.log('onSwipeTop', cardIndex);
                    }}
                    onSwipeBottom={(cardIndex) => {
                        console.log('onSwipeBottom', cardIndex);
                    }}
                    OverlayLabelRight={OverlayLabelRight}
                    OverlayLabelLeft={OverlayLabelLeft}
                    OverlayLabelTop={OverlayLabelTop}
                    OverlayLabelBottom={OverlayLabelBottom}
                    onSwipeActive={() => {
                        console.log('onSwipeActive');
                    }}
                    onSwipeStart={() => {
                        console.log('onSwipeStart');
                    }}
                    onSwipeEnd={() => {
                        console.log('onSwipeEnd');
                    }}
                />
            </View>

            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#EF4444' }]}
                    onPress={() => {
                        console.log('Swipe Left');
                        ref.current?.swipeLeft();
                    }}
                >
                    <AntDesign name="close" size={ICON_SIZE} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                    onPress={() => {
                        console.log('Swipe Back');
                        ref.current?.swipeBack();
                    }}
                >
                    <AntDesign name="reload" size={ICON_SIZE} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#10B981' }]}
                    onPress={() => {
                        console.log('Swipe Right');
                        ref.current?.swipeRight();
                    }}
                >
                    <AntDesign name="heart" size={ICON_SIZE} color="white" />
                </TouchableOpacity>
            </View>
        </GestureHandlerRootView>
    );
};

export default SwipeExampleScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    subContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,0,0,0.1)', // Debug: red background
    },
    buttonsContainer: {
        flexDirection: 'row',
        paddingBottom: 50,
        paddingTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    button: {
        height: 50,
        borderRadius: 40,
        aspectRatio: 1,
        elevation: 4,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'black',
        shadowOpacity: 0.1,
        shadowOffset: {
            width: 0,
            height: 4,
        },
    },
    renderCardContainer: {
        borderRadius: 15,
        width: '100%',
        height: '100%',
        position: 'relative',
        zIndex: 1,
    },
    renderFlippedCardContainer: {
        borderRadius: 15,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardStyle: {
        width: '90%',
        height: '90%',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    renderCardImage: {
        height: '100%',
        width: '100%',
        borderRadius: 15,
    },
    overlayLabelContainer: {
        borderRadius: 15,
        height: '90%',
        width: '90%',
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    overlayLabelContainerStyle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    debugOverlay: {
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    debugText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
