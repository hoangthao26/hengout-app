import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Image,
    useColorScheme,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolate,
    SharedValue,
} from 'react-native-reanimated';
import { Heart, X } from 'lucide-react-native';

const AnimatedX = Animated.createAnimatedComponent(X);
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Header from '../../components/Header';
import NavigationService from '../../services/navigationService';
import { activityService } from '../../services/activityService';
import { useToast } from '../../contexts/ToastContext';
import { useLocalSearchParams } from 'expo-router';
import { useCountdown } from '../../hooks/useCountdown';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.58;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// API Data Interface
interface ActivitySuggestion {
    id: string;
    activityId: string;
    location: {
        id: string;
        name: string;
        address: string;
        categories: string[];
        tags: string[];
        imageUrls: string[];
        lat: number;
        lng: number;
    };
    acceptCount: number;
    rejectCount: number;
    hasUserVoted: boolean;
    userVoteType: string;
}

interface CardProps {
    card: ActivitySuggestion;
    index: number;
    isTop: boolean;
    onSwipe: (direction: 'left' | 'right') => void;
    topCardTranslateX?: SharedValue<number>;
    onSwipeStateChange?: (isSwipingLeft: boolean, isSwipingRight: boolean) => void;
    buttonSwipeDirection?: 'left' | 'right' | null;
}

const Card: React.FC<CardProps> = ({ card, index, isTop, onSwipe, topCardTranslateX, onSwipeStateChange, buttonSwipeDirection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);


    const translateX = useSharedValue(0);
    const translateY = useSharedValue(
        isTop ? 0 : 10
    );
    const scale = useSharedValue(
        isTop ? 1.0 : 0.95
    );
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Handle button swipe animation
    React.useEffect(() => {
        if (isTop && buttonSwipeDirection) {
            if (buttonSwipeDirection === 'left') {
                // Animate topCardTranslateX to trigger scaling effect on cards behind
                if (topCardTranslateX) {
                    topCardTranslateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 600 });
                }
                translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 600 });
                rotate.value = withTiming(-30, { duration: 600 });
            } else if (buttonSwipeDirection === 'right') {
                // Animate topCardTranslateX to trigger scaling effect on cards behind
                if (topCardTranslateX) {
                    topCardTranslateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 600 });
                }
                translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 600 });
                rotate.value = withTiming(30, { duration: 600 });
            }
        }
    }, [buttonSwipeDirection, isTop, topCardTranslateX]);

    const panGesture = Gesture.Pan()
        .enabled(isTop)
        .minDistance(1)
        .onStart(() => {
            if (isTop) {
                scale.value = withSpring(1.05);
            }
        })
        .onUpdate((event) => {
            if (isTop) {
                translateX.value = event.translationX;
                translateY.value = event.translationY;

                // Sync with topCardTranslateX for scaling effect
                if (topCardTranslateX) {
                    topCardTranslateX.value = event.translationX;
                }

                // Update swipe state for icon color
                if (onSwipeStateChange) {
                    const isSwipingLeft = event.translationX < -SWIPE_THRESHOLD * 0.01;
                    const isSwipingRight = event.translationX > SWIPE_THRESHOLD * 0.01;
                    runOnJS(onSwipeStateChange)(isSwipingLeft, isSwipingRight);
                }

                // Rotation based on horizontal movement
                rotate.value = interpolate(
                    event.translationX,
                    [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
                    [-15, 0, 15],
                    Extrapolate.CLAMP
                );
            }
        })
        .onEnd((event) => {
            if (isTop) {
                const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
                const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;

                if (shouldSwipeLeft) {
                    // Swipe left (dislike)
                    translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
                    rotate.value = withTiming(-30, { duration: 300 });
                    runOnJS(onSwipe)('left');
                } else if (shouldSwipeRight) {
                    // Swipe right (like)
                    translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
                    rotate.value = withTiming(30, { duration: 300 });
                    runOnJS(onSwipe)('right');
                } else {
                    // Return to center
                    translateX.value = withSpring(0);
                    translateY.value = withSpring(0);
                    rotate.value = withSpring(0);
                    scale.value = withSpring(1);

                    // Reset topCardTranslateX only when returning to center
                    if (topCardTranslateX) {
                        topCardTranslateX.value = withSpring(0);
                    }

                    // Reset swipe state
                    if (onSwipeStateChange) {
                        runOnJS(onSwipeStateChange)(false, false);
                    }
                }
            }
        })
        .runOnJS(true);

    const animatedStyle = useAnimatedStyle(() => {
        // Scale and position effect for cards behind
        let cardScale = scale.value;
        let cardTranslateY = translateY.value;

        if (isTop) {
            // Top card always 100% scale and 0px translateY
            cardScale = 1.0;
            cardTranslateY = 0;
        } else if (topCardTranslateX && Math.abs(topCardTranslateX.value) > 0) {
            // Cards behind scale up and move up based on how much the top card has moved
            const swipeProgress = Math.abs(topCardTranslateX.value) / SWIPE_THRESHOLD;

            // Scale effect - only second card (index 1) scales from 95% to 100%
            if (index === 1) {
                cardScale = interpolate(
                    swipeProgress,
                    [0, 1],
                    [0.95, 1.0], // Second card: 95% → 100%
                    Extrapolate.CLAMP
                );

                // TranslateY effect - second card moves up from 10px to 0px
                cardTranslateY = interpolate(
                    swipeProgress,
                    [0, 1],
                    [10, 0], // Second card: 10px down → 0px (center)
                    Extrapolate.CLAMP
                );
            }
            // Third card (index 2) stays at 95% and 10px down
        } else {
            // When topCardTranslateX is 0, maintain current scale to avoid flicker
            // This prevents the card from resetting to 95% when transitioning
            if (index === 1) {
                // Keep second card at its current scale (likely 100% from previous swipe)
                cardScale = Math.max(cardScale, 0.95);
            }
        }

        return {
            transform: [
                { translateX: translateX.value },
                { translateY: cardTranslateY },
                { scale: cardScale },
                { rotate: `${rotate.value}deg` },
            ],
            opacity: opacity.value,
        };
    });


    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    styles.card,
                    animatedStyle,
                    {
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        zIndex: 10 - index,
                    },
                ]}
            >
                {imageError ? (
                    // Location placeholder when image fails to load
                    <View style={[styles.cardImage, styles.locationPlaceholder, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <ActivityIndicator size="large" color="#F48C06" />
                        <View style={styles.locationText}>
                            <Text style={[styles.locationLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Đang tải hình ảnh...
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Image
                        source={{ uri: card.location.imageUrls[0] || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400' }}
                        style={styles.cardImage}
                        onError={(error) => {
                            console.log('Image load error:', error.nativeEvent.error);
                            console.log('Failed URL:', card.location.imageUrls[0]);
                            setImageError(true);
                            setImageLoading(false);
                        }}
                        onLoad={() => {
                            console.log('Image loaded successfully:', card.location.imageUrls[0]);
                            setImageLoading(false);
                            setImageError(false);
                        }}
                    />
                )}
                <View style={styles.cardOverlay}>
                    <Text
                        style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                    >
                        {card.location.name}
                    </Text>
                    <Text
                        style={[styles.cardAddress, { color: isDark ? '#E5E7EB' : '#6B7280' }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.6}
                    >
                        {card.location.address}
                    </Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <X size={18} strokeWidth={3} color="#EF4444" />
                            <Text style={[styles.statText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {card.rejectCount}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <MaskedView
                                style={{ width: 18, height: 18 }}
                                maskElement={
                                    <Heart
                                        size={18}
                                        color="white"
                                        fill="white"
                                    />
                                }
                            >
                                <LinearGradient
                                    colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                    locations={[0, 0.31, 0.69, 1]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ flex: 1 }}
                                />
                            </MaskedView>
                            <Text style={[styles.statText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {card.acceptCount}
                            </Text>
                        </View>

                    </View>
                </View>

            </Animated.View>
        </GestureDetector>
    );
};

const CustomSwipeScreen: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error } = useToast();
    const { activityId, voteEndTime } = useLocalSearchParams<{ activityId: string; voteEndTime: string }>();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [cards, setCards] = useState<ActivitySuggestion[]>([]);
    const [allSuggestions, setAllSuggestions] = useState<ActivitySuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSwipingLeft, setIsSwipingLeft] = useState(false);
    const [isSwipingRight, setIsSwipingRight] = useState(false);
    const [buttonSwipeDirection, setButtonSwipeDirection] = useState<'left' | 'right' | null>(null);
    const [isVoteTimeExpired, setIsVoteTimeExpired] = useState(false);

    // Shared value to track top card's translateX for scaling effect
    const topCardTranslateX = useSharedValue(0);

    // Countdown timer for voting time
    const voteCountdown = useCountdown({
        endTime: voteEndTime || '',
        onExpired: () => {
            console.log('Vote time expired!');
            setIsVoteTimeExpired(true);

            // Auto back after 3 seconds
            setTimeout(() => {
                NavigationService.goBack();
            }, 3000);
        }
    });

    // Load activity suggestions from API
    useEffect(() => {
        if (activityId) {
            loadActivitySuggestions();
        }
    }, [activityId]);

    const loadActivitySuggestions = async () => {
        try {
            setLoading(true);
            const response = await activityService.getActivitySuggestions(activityId!);
            console.log('📱 [CustomSwipe] Activity suggestions loaded:', response.data);

            // Store all suggestions
            setAllSuggestions(response.data);

            // Filter only suggestions that user hasn't voted yet
            const unvotedSuggestions = response.data.filter((suggestion: ActivitySuggestion) => !suggestion.hasUserVoted);
            console.log('📱 [CustomSwipe] Unvoted suggestions:', unvotedSuggestions.length, 'out of', response.data.length);

            if (unvotedSuggestions[0]?.location?.imageUrls) {
                console.log('📱 [CustomSwipe] First unvoted image URL:', unvotedSuggestions[0].location.imageUrls[0]);
            }

            setCards(unvotedSuggestions);
        } catch (err: any) {
            console.error('Failed to load activity suggestions:', err);
            error(err.message || 'Không thể tải danh sách đề xuất');
        } finally {
            setLoading(false);
        }
    };

    // Animated style for nope button when swiping left
    const nopeIconStyle = useAnimatedStyle(() => {
        const progress = Math.abs(Math.min(topCardTranslateX.value, 0)) / SWIPE_THRESHOLD;
        return {
            opacity: 1,
        };
    });

    const nopeCircleStyle = useAnimatedStyle(() => {
        const progress = Math.abs(Math.min(topCardTranslateX.value, 0)) / SWIPE_THRESHOLD;
        return {
            backgroundColor: progress > 0.01 ? '#EF4444' : 'transparent',
        };
    });

    const likeCircleStyle = useAnimatedStyle(() => {
        const progress = Math.max(topCardTranslateX.value, 0) / SWIPE_THRESHOLD;
        return {
            opacity: progress > 0.01 ? 1 : 0,
        };
    });




    const handleSwipe = async (direction: 'left' | 'right') => {
        if (currentIndex >= cards.length) return;

        const currentCard = cards[currentIndex];
        const voteType = direction === 'right' ? 'ACCEPT' : 'REJECT';

        try {
            // Submit vote to API
            await activityService.voteForSuggestion(activityId!, currentCard.id, voteType);

            // No toast notification - silent vote
        } catch (err: any) {
            console.error('Failed to submit vote:', err);
            error(err.message || 'Không thể gửi bình chọn');
            return; // Don't proceed with UI update if API call failed
        }

        // Reset swipe state
        setIsSwipingLeft(false);
        setIsSwipingRight(false);

        // Don't reset topCardTranslateX immediately - let it animate smoothly
        setCurrentIndex(prev => prev + 1);

        // Reset after a small delay to allow smooth transition
        setTimeout(() => {
            topCardTranslateX.value = 0;
        }, 100);
    };

    const handleButtonSwipe = (direction: 'left' | 'right') => {
        if (currentIndex >= cards.length) return;

        // Set swipe state for visual feedback
        if (direction === 'left') {
            setIsSwipingLeft(true);
        } else {
            setIsSwipingRight(true);
        }

        // Trigger card animation
        setButtonSwipeDirection(direction);

        // Call handleSwipe after animation
        setTimeout(() => {
            handleSwipe(direction);
            setButtonSwipeDirection(null); // Reset
        }, 600);
    };

    const resetCards = () => {
        setCurrentIndex(0);
        loadActivitySuggestions();
        topCardTranslateX.value = 0;
    };

    const visibleCards = cards.slice(currentIndex, currentIndex + 3);

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F9FAFB' }]}>
            <Header
                title={isVoteTimeExpired ? "Thời gian bình chọn đã kết thúc" : "Bình chọn"}
                onBackPress={() => NavigationService.goBack()}
                variant="settings"
            />

            {/* Countdown Timer - Only show when voting is active */}
            {!isVoteTimeExpired && voteEndTime && !loading && cards.length > 0 && currentIndex < cards.length && (
                <View style={[styles.countdownContainer, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                    <Text style={[styles.countdownLabel, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                        Thời gian bình chọn còn lại:
                    </Text>
                    <Text style={[styles.countdownTime, { color: '#F48C06' }]}>
                        {voteCountdown.timeRemaining}
                    </Text>
                </View>
            )}

            {/* Expired Timer Message */}
            {isVoteTimeExpired && (
                <View style={[styles.expiredTimerContainer, { backgroundColor: isDark ? '#1F2937' : '#FEF2F2' }]}>
                    <Text style={[styles.expiredTimerText, { color: '#EF4444' }]}>
                        Tự động quay lại sau 3 giây...
                    </Text>
                </View>
            )}

            <View style={styles.swiperContainer}>
                {isVoteTimeExpired ? (
                    <View style={styles.expiredContainer}>
                        <Text style={[styles.expiredText, { color: '#EF4444' }]}>
                            ⏰ Thời gian bình chọn đã kết thúc
                        </Text>
                        <Text style={[styles.expiredSubText, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                            Tự động quay lại sau 3 giây...
                        </Text>
                    </View>
                ) : loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F48C06" />
                        <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Đang tải danh sách đề xuất...
                        </Text>
                    </View>
                ) : cards.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Text style={styles.emptyIcon}>
                                {allSuggestions.length === 0 ? '📍' : '✅'}
                            </Text>
                        </View>
                        <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            {allSuggestions.length === 0
                                ? 'Không có đề xuất nào'
                                : 'Bạn đã bình chọn xong'
                            }
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {allSuggestions.length === 0
                                ? 'Chưa có địa điểm nào để bình chọn'
                                : 'Tất cả đề xuất đã được bình chọn'
                            }
                        </Text>
                    </View>
                ) : currentIndex >= cards.length ? (
                    <View style={styles.completedContainer}>
                        <View style={styles.completedIconContainer}>
                            <Text style={styles.completedIcon}>🎉</Text>
                        </View>
                        <Text style={[styles.completedTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Đã hoàn thành bình chọn!
                        </Text>
                        <Text style={[styles.completedSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Bạn đã xem hết tất cả địa điểm
                        </Text>
                    </View>
                ) : (
                    visibleCards.map((card, index) => (
                        <Card
                            key={card.id}
                            card={card}
                            index={index}
                            isTop={index === 0}
                            onSwipe={handleSwipe}
                            topCardTranslateX={topCardTranslateX}
                            onSwipeStateChange={(isLeft, isRight) => {
                                setIsSwipingLeft(isLeft);
                                setIsSwipingRight(isRight);
                            }}
                            buttonSwipeDirection={buttonSwipeDirection}
                        />
                    ))
                )}

                {/* Bottom Overlay for Like/Nope - Clickable */}
                {!loading && cards.length > 0 && currentIndex < cards.length && (
                    <View style={styles.bottomOverlayContainer}>
                        <Animated.View style={[styles.bottomOverlay, styles.nopeOverlay]}>
                            <TouchableOpacity
                                style={styles.circleContainer}
                                onPress={() => handleButtonSwipe('left')}
                                activeOpacity={0.7}
                            >
                                {/* Red circle border with X */}
                                <View style={styles.redBorderContainer}>
                                    <View style={styles.redBorder} />
                                    <Animated.View style={[styles.redFill, nopeCircleStyle]} />
                                </View>
                                <X
                                    size={30}
                                    color="#FFFFFF"
                                    strokeWidth={3}
                                />
                            </TouchableOpacity>
                            <Text style={styles.bottomOverlayText}>NOPE</Text>
                        </Animated.View>

                        <Animated.View style={[styles.bottomOverlay, styles.likeOverlay]}>
                            <TouchableOpacity
                                style={styles.circleContainer}
                                onPress={() => handleButtonSwipe('right')}
                                activeOpacity={0.7}
                            >
                                {/* Gradient circle border with heart */}
                                <View style={styles.gradientBorderContainer}>
                                    <LinearGradient
                                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                        locations={[0, 0.31, 0.69, 1]}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientBorder}
                                    />
                                    <View style={styles.innerCircle} />
                                    <Animated.View style={[styles.likeFill, likeCircleStyle]}>
                                        <LinearGradient
                                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                            locations={[0, 0.31, 0.69, 1]}
                                            start={{ x: 0, y: 1 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.likeFillGradient}
                                        />
                                    </Animated.View>
                                </View>
                                <MaskedView
                                    style={{ width: 30, height: 30 }}
                                    maskElement={
                                        <Heart
                                            size={30}
                                            color="white"
                                            fill="white"
                                        />
                                    }
                                >
                                    <LinearGradient
                                        colors={["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"]}
                                        locations={[0, 0.31, 0.69, 1]}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ flex: 1 }}
                                    />
                                </MaskedView>
                            </TouchableOpacity>
                            <Text style={styles.bottomOverlayText}>LIKE</Text>
                        </Animated.View>
                    </View>
                )}
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>

                {currentIndex >= cards.length && (
                    <Text style={[styles.completedTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Đã xem hết tất cả địa điểm!
                    </Text>
                )}
            </View>

        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    countdownLabel: {
        fontSize: 14,
        marginRight: 8,
    },
    countdownTime: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F48C06',
    },
    expiredTimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    expiredTimerText: {
        fontSize: 14,
        fontWeight: '600',
    },
    expiredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    expiredText: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    expiredSubText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    swiperContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',

        marginTop: 30
    },
    card: {
        position: 'absolute',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,

    },
    cardImage: {
        width: '100%',
        aspectRatio: 1, // Tạo hình vuông (1:1)
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        resizeMode: 'cover',
    },
    locationPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationText: {
        alignItems: 'center',
        marginTop: 12,
    },
    locationLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    cardOverlay: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        flex: 1,
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    cardAddress: {
        fontSize: 16,
        marginBottom: 12,
        opacity: 0.9,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    progressText: {
        fontSize: 18,
        fontWeight: '600',
    },
    bottomOverlayContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
    },
    bottomOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    nopeOverlay: {
        // Left side
    },
    likeOverlay: {
        // Right side
    },
    circleContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 8,
    },
    redBorderContainer: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    redBorder: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        borderWidth: 3,
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
    },
    redFill: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 35,
        backgroundColor: 'transparent',
    },
    likeFill: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 35,
        backgroundColor: 'transparent',
    },
    likeFillGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    gradientBorderContainer: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    gradientBorder: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    innerCircle: {
        position: 'absolute',
        top: 3,
        left: 3,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#000000', // Black background to cover gradient
    },
    bottomOverlayText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        marginBottom: 20,
    },
    emptyIcon: {
        fontSize: 64,
        textAlign: 'center',
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: 8,
    },
    completedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    completedIconContainer: {
        marginBottom: 20,
    },
    completedIcon: {
        fontSize: 64,
        textAlign: 'center',
    },
    completedTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    completedSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: 8,
    },
});

export default CustomSwipeScreen;