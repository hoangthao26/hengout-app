import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Swiper, type SwiperCardRefType } from 'rn-swiper-list';
import { Heart, X, RotateCcw, MapPin, Star, Users } from 'lucide-react-native';
import Header from '../../components/Header';
import NavigationService from '../../services/navigationService';

// Sample data based on your API structure
const sampleData = [
    {
        id: "1",
        activityId: "act-1",
        location: {
            id: "loc-1",
            name: "Café Phố Cổ",
            address: "123 Hàng Bạc, Hoàn Kiếm, Hà Nội",
            categories: ["Café", "Đồ uống"],
            tags: ["Lãng mạn", "Yên tĩnh", "WiFi miễn phí"],
            imageUrls: [
                "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
                "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"
            ],
            lat: 21.0285,
            lng: 105.8542
        },
        acceptCount: 12,
        rejectCount: 3,
        hasUserVoted: false,
        userVoteType: ""
    },
    {
        id: "2",
        activityId: "act-2",
        location: {
            id: "loc-2",
            name: "Nhà Hàng Hải Sản",
            address: "456 Nguyễn Huệ, Quận 1, TP.HCM",
            categories: ["Nhà hàng", "Hải sản"],
            tags: ["Tươi ngon", "Giá hợp lý", "Không gian rộng"],
            imageUrls: [
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
                "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400"
            ],
            lat: 10.7769,
            lng: 106.7009
        },
        acceptCount: 8,
        rejectCount: 1,
        hasUserVoted: true,
        userVoteType: "accept"
    },
    {
        id: "3",
        activityId: "act-3",
        location: {
            id: "loc-3",
            name: "Công Viên Thống Nhất",
            address: "789 Lê Duẩn, Đống Đa, Hà Nội",
            categories: ["Công viên", "Giải trí"],
            tags: ["Không gian xanh", "Tập thể dục", "Gia đình"],
            imageUrls: [
                "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
            ],
            lat: 21.0175,
            lng: 105.8369
        },
        acceptCount: 15,
        rejectCount: 2,
        hasUserVoted: false,
        userVoteType: ""
    },
    {
        id: "4",
        activityId: "act-4",
        location: {
            id: "loc-4",
            name: "Rạp Chiếu Phim CGV",
            address: "321 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
            categories: ["Giải trí", "Phim ảnh"],
            tags: ["Phim mới", "Âm thanh tốt", "Ghế thoải mái"],
            imageUrls: [
                "https://images.unsplash.com/photo-1489599804151-0e1b3b3b3b3b?w=400",
                "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400"
            ],
            lat: 21.0285,
            lng: 105.8542
        },
        acceptCount: 20,
        rejectCount: 5,
        hasUserVoted: true,
        userVoteType: "reject"
    },
    {
        id: "5",
        activityId: "act-5",
        location: {
            id: "loc-5",
            name: "Quán Bún Bò Huế",
            address: "654 Lý Thường Kiệt, Quận 10, TP.HCM",
            categories: ["Ăn uống", "Món Huế"],
            tags: ["Đậm đà", "Gia vị chuẩn", "Giá rẻ"],
            imageUrls: [
                "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400",
                "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400"
            ],
            lat: 10.7769,
            lng: 106.7009
        },
        acceptCount: 25,
        rejectCount: 1,
        hasUserVoted: false,
        userVoteType: ""
    }
];

const { width, height } = Dimensions.get('window');

export default function SwipeTestScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const swiperRef = useRef<SwiperCardRefType>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const renderCard = useCallback((item: any, index: number) => {
        return (
            <View style={styles.renderCardContainer}>
                <Image
                    source={{ uri: item.location.imageUrls[0] }}
                    style={styles.renderCardImage}
                    resizeMode="cover"
                />
                <View style={styles.cardOverlay}>
                    <Text style={styles.locationName}>{item.location.name}</Text>
                    <Text style={styles.locationAddress}>{item.location.address}</Text>
                    <View style={styles.statsRow}>
                        <Text style={styles.statText}>Accept: {item.acceptCount}</Text>
                        <Text style={styles.statText}>Reject: {item.rejectCount}</Text>
                    </View>
                </View>
            </View>
        );
    }, []);

    const OverlayLabelRight = useCallback(() => (
        <View style={[styles.overlayLabel, styles.overlayRight]}>
            <Heart size={60} color="#10B981" />
            <Text style={styles.overlayText}>THÍCH</Text>
        </View>
    ), []);

    const OverlayLabelLeft = useCallback(() => (
        <View style={[styles.overlayLabel, styles.overlayLeft]}>
            <X size={60} color="#EF4444" />
            <Text style={styles.overlayText}>KHÔNG THÍCH</Text>
        </View>
    ), []);

    const handleSwipeRight = (cardIndex: number) => {
        const item = sampleData[cardIndex];
        console.log(`Đã thích: ${item.location.name}`);
        console.log(`Tổng lượt thích: ${item.acceptCount + 1}`);
    };

    const handleSwipeLeft = (cardIndex: number) => {
        const item = sampleData[cardIndex];
        console.log(`Đã không thích: ${item.location.name}`);
        console.log(`Tổng lượt không thích: ${item.rejectCount + 1}`);
    };

    const handleSwipedAll = () => {
        console.log('Đã xem hết tất cả địa điểm!');
    };

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F9FAFB' }]}>
            <Header
                title="Swipe Test - Tinder Style"
                onBackPress={() => NavigationService.goBack()}
                variant="settings"
            />

            <View style={styles.swiperContainer}>
                <Swiper
                    ref={swiperRef}
                    data={sampleData}
                    cardStyle={styles.cardStyle}
                    overlayLabelContainerStyle={styles.overlayLabelContainerStyle}
                    renderCard={renderCard}
                    keyExtractor={(item, index) => item.id}
                    prerenderItems={3}
                    onIndexChange={(index) => {
                        setCurrentIndex(index);
                        console.log('Current Active index', index);
                    }}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipedAll={handleSwipedAll}
                    OverlayLabelRight={OverlayLabelRight}
                    OverlayLabelLeft={OverlayLabelLeft}
                    onSwipeStart={() => console.log('Swipe started')}
                    onSwipeEnd={() => console.log('Swipe ended')}
                    onSwipeActive={() => console.log('Swipe active')}
                    onPress={() => console.log('Card pressed')}
                />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
                    onPress={() => swiperRef.current?.swipeBack()}
                >
                    <RotateCcw size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => swiperRef.current?.swipeLeft()}
                >
                    <X size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => swiperRef.current?.swipeRight()}
                >
                    <Heart size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
                <Text style={[styles.progressText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {currentIndex + 1} / {sampleData.length}
                </Text>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    swiperContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    cardStyle: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    renderCardContainer: {
        borderRadius: 15,
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    renderCardImage: {
        height: '100%',
        width: '100%',
        borderRadius: 15,
    },
    cardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 16,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
    },
    locationName: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    locationAddress: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 8,
        opacity: 0.9,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    overlayLabel: {
        position: 'absolute',
        top: '50%',
        transform: [{ translateY: -50 }],
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
    },
    overlayRight: {
        right: 20,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    overlayLeft: {
        left: 20,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    overlayText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    overlayLabelContainerStyle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 20,
    },
    actionButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    progressContainer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
