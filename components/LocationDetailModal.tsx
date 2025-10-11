import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Image,
    FlatList,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark } from 'lucide-react-native';
import { LocationDetails, LocationReview } from '../types/location';
import { FeatureErrorBoundary } from './FeatureErrorBoundary';
import { locationService } from '../services/locationService';
import { useModal } from '../contexts/ModalContext';

interface LocationDetailModalProps {
    isVisible: boolean;
    onClose: () => void;
    location: LocationDetails | null;
    onSuccess?: () => void;
    onNavigate?: (location: LocationDetails) => void;
    onCall?: (phoneNumber: string) => void;
    onSave?: (location: LocationDetails) => void;
    onShare?: (location: LocationDetails) => void;
}

// Removed Dimensions import to simplify

const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
    isVisible,
    onClose,
    location,
    onSuccess,
    onNavigate,
    onCall,
    onSave,
    onShare,
}) => {
    const isDark = useColorScheme() === 'dark';
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { openSaveLocationModal } = useModal();

    // State for reviews with images
    const [reviewsWithImages, setReviewsWithImages] = useState<LocationReview[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    // State for image gallery
    const [showImageGallery, setShowImageGallery] = useState(false);
    const [selectedReview, setSelectedReview] = useState<LocationReview | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Get screen dimensions for responsive design
    const { width: screenWidth } = Dimensions.get('window');
    const reviewImageSize = useMemo(() => {
        // Responsive sizing based on screen width
        if (screenWidth < 375) {
            return 240; // Small screens (iPhone SE, etc.)
        } else if (screenWidth < 414) {
            return 270; // Medium screens (iPhone 12, etc.)
        } else {
            return 300; // Large screens (iPhone Pro Max, etc.)
        }
    }, [screenWidth]);

    // Bottom sheet snap points - smaller size to avoid crash
    const snapPoints = useMemo(() => ['86%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        console.log('BottomSheet index changed:', index);
        if (index === -1) {
            // Only call onClose if modal is still visible
            if (isVisible) {
                console.log('BottomSheet closed, calling onClose');
                onClose();
            }
        }
    }, [onClose, isVisible]);

    // Open/close effect
    React.useEffect(() => {
        console.log('LocationDetailModal visibility changed:', isVisible);
        if (isVisible) {
            // Small delay to ensure proper mounting
            setTimeout(() => {
                console.log('Expanding BottomSheet');
                bottomSheetRef.current?.expand();
            }, 50);
        } else {
            console.log('Closing BottomSheet');
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    // Load reviews with images when modal opens (use cached for instant paint if available)
    useEffect(() => {
        if (isVisible && location?.id) {
            // Try cached first
            const cached = locationService.getCachedLocationReviews(location.id, 0, 50);
            if (cached) {
                const cachedWithImages = cached.data.content.filter(
                    review => review.imageUrls && review.imageUrls.length > 0
                );
                setReviewsWithImages(cachedWithImages);
            }
            // Then ensure fresh data
            loadReviewsWithImages();
        }
    }, [isVisible, location?.id]);

    const loadReviewsWithImages = async () => {
        if (!location?.id) return;

        setLoadingReviews(true);
        try {
            const response = await locationService.getLocationReviewsCached(location.id, 0, 50);
            if (response.status === 'success') {
                // Filter only reviews that have images
                const reviewsWithImages = response.data.content.filter(
                    review => review.imageUrls && review.imageUrls.length > 0
                );
                setReviewsWithImages(reviewsWithImages);
            }
        } catch (error) {
            console.log('Failed to load reviews:', error);
            setReviewsWithImages([]);
        } finally {
            setLoadingReviews(false);
        }
    };

    // Custom backdrop
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    const handleClose = () => {
        console.log('handleClose called');
        // Force close the sheet first
        bottomSheetRef.current?.close();
        // Call onClose immediately - no delay needed
        onClose();
    };

    const handleSave = () => {
        if (location) {
            // Open SaveLocationModal instead of calling onSave directly
            openSaveLocationModal(location, () => {
                // Call original onSave callback if provided
                if (onSave) {
                    onSave(location);
                }
                // Gọi onSuccess callback (nhưng không đóng modal vì đã comment out trong _layout.tsx)
                if (onSuccess) {
                    onSuccess();
                }
            });
        }
    };

    const handleViewImageGallery = (review: LocationReview) => {
        if (review.imageUrls.length > 0) {
            setSelectedReview(review);
            setCurrentImageIndex(0); // Reset to first image
            setShowImageGallery(true);
        }
    };

    const handleCloseImageGallery = () => {
        setShowImageGallery(false);
        setSelectedReview(null);
        setCurrentImageIndex(0);
    };

    const handleImageScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const viewSize = event.nativeEvent.layoutMeasurement.width;
        const currentIndex = Math.round(contentOffsetX / viewSize);
        setCurrentImageIndex(currentIndex);
    };

    if (!isVisible || !location) return null;

    return (
        <FeatureErrorBoundary feature="LocationDetailModal">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetChanges}
                backdropComponent={renderBackdrop}
                enablePanDownToClose={true}
                backgroundStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                }}
                handleIndicatorStyle={{
                    backgroundColor: '#FFFFFF',
                    width: 40,
                    height: 4,
                }}
            >
                <BottomSheetView style={styles.container}>
                    {/* Header - Location Card Style */}
                    <View style={styles.header}>
                        <View style={styles.locationCard}>
                            {/* Left Section - Image */}
                            <View style={styles.imageContainer}>
                                {location.imageUrls && location.imageUrls.length > 0 ? (
                                    <Image
                                        source={{ uri: location.imageUrls[0] }}
                                        style={styles.locationImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Ionicons
                                            name={getLocationIcon(location.categories[0] || 'location')}
                                            size={32}
                                            color="#9CA3AF"
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Right Section - Text Info */}
                            <View style={styles.textContainer}>
                                {/* Name */}
                                <Text style={styles.locationName} numberOfLines={1}>
                                    {location.name}
                                </Text>

                                {/* Rating */}
                                {location.totalRating > 0 && (
                                    <View style={styles.ratingRow}>
                                        <View style={styles.stars}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Ionicons
                                                    key={star}
                                                    name={star <= location.totalRating ? 'star' : 'star-outline'}
                                                    size={20}
                                                    color="#FFD700"
                                                />
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Address */}
                                <View style={styles.addressRow}>
                                    <Text style={styles.addressText}>
                                        {location.address}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Content - Simplified */}
                    <View style={styles.content}>
                        {/* Description - Simple */}
                        {location.description && (
                            <View style={styles.descriptionSection}>
                                <Text style={styles.descriptionText}>
                                    <Text style={styles.descriptionTitle}>Mô tả: </Text>
                                    {location.description}
                                </Text>
                                <View style={styles.divider} />
                            </View>
                        )}

                        {/* Review Images Section */}
                        <View style={styles.reviewImagesSection}>
                            {loadingReviews ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#F48C06" />
                                    <Text style={styles.loadingText}>Đang tải hình ảnh...</Text>
                                </View>
                            ) : reviewsWithImages.length > 0 ? (
                                <FlatList
                                    data={reviewsWithImages}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.reviewImagesList}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.reviewImageContainer, { width: reviewImageSize }]}
                                            onPress={() => handleViewImageGallery(item)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.reviewImageWrapper}>
                                                <Image
                                                    source={{ uri: item.imageUrls[0] }}
                                                    style={[styles.reviewImage, {
                                                        width: reviewImageSize,
                                                        height: reviewImageSize
                                                    }]}
                                                    resizeMode="cover"
                                                />
                                                {item.imageUrls.length > 1 && (
                                                    <View style={styles.moreImagesOverlay}>
                                                        <Text style={styles.moreImagesText}>+{item.imageUrls.length - 1}</Text>
                                                    </View>
                                                )}
                                                {/* Review text overlay - only show if text exists */}
                                                {item.text && item.text.trim() && (
                                                    <View style={styles.reviewTextOverlay}>
                                                        <Text style={styles.reviewText} numberOfLines={2}>
                                                            {item.text}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <Text style={styles.noImagesText}>Chưa có hình ảnh đánh giá</Text>
                            )}
                        </View>
                    </View>

                    {/* Bottom Action Bar */}
                    <View style={styles.bottomActionBar}>
                        {/* Save Button */}
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSave}
                        >
                            <Bookmark size={20} color="#F48C06" />
                            <Text style={styles.saveButtonText}>Lưu</Text>
                        </TouchableOpacity>
                    </View>
                </BottomSheetView>
            </BottomSheet>

            {/* Image Gallery Modal */}
            {showImageGallery && selectedReview && (
                <View style={styles.imageGalleryOverlay}>
                    <View style={styles.imageGalleryContainer}>
                        {/* Header */}
                        <View style={styles.imageGalleryHeader}>
                            <Text style={styles.imageGalleryTitle}>
                                Hình ảnh đánh giá ({currentImageIndex + 1}/{selectedReview.imageUrls.length})
                            </Text>
                            <TouchableOpacity
                                style={styles.imageGalleryCloseButton}
                                onPress={handleCloseImageGallery}
                            >
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Images Container */}
                        <View style={styles.imageGalleryContent}>
                            <FlatList
                                data={selectedReview.imageUrls}
                                keyExtractor={(item, index) => `${selectedReview.id}-${index}`}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onMomentumScrollEnd={handleImageScroll}
                                renderItem={({ item }) => (
                                    <View style={styles.imageGalleryItem}>
                                        <Image
                                            source={{ uri: item }}
                                            style={styles.imageGalleryImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                )}
                            />
                        </View>

                        {/* Review Text - Fixed below images */}
                        {selectedReview.text && selectedReview.text.trim() && (
                            <View style={styles.imageGalleryTextContainer}>
                                <Text style={styles.imageGalleryReviewText}>
                                    {selectedReview.text}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </FeatureErrorBoundary>
    );
};

// Helper function to get appropriate icon based on category
const getLocationIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('cafe') || categoryLower.includes('coffee')) {
        return 'cafe-outline';
    } else if (categoryLower.includes('restaurant') || categoryLower.includes('quán') || categoryLower.includes('nhà hàng')) {
        return 'restaurant-outline';
    } else if (categoryLower.includes('bank') || categoryLower.includes('atm')) {
        return 'business-outline';
    } else if (categoryLower.includes('fitness') || categoryLower.includes('gym') || categoryLower.includes('yoga')) {
        return 'fitness-outline';
    } else if (categoryLower.includes('hotel') || categoryLower.includes('khách sạn')) {
        return 'bed-outline';
    } else if (categoryLower.includes('gas') || categoryLower.includes('xăng')) {
        return 'car-outline';
    } else if (categoryLower.includes('market') || categoryLower.includes('chợ') || categoryLower.includes('siêu thị')) {
        return 'storefront-outline';
    } else {
        return 'location-outline';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 12,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 16,
    },
    locationImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    locationName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 6,
    },
    ratingRow: {
        marginBottom: 8,
    },
    stars: {
        flexDirection: 'row',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
    },
    addressText: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 0,
        flex: 1,
        flexWrap: 'wrap',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    descriptionSection: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    descriptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F48C06',
    },
    descriptionText: {
        fontSize: 16,
        color: '#E5E7EB',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.32)',
        marginTop: 16,
        marginHorizontal: 4,
    },
    reviewImagesSection: {

        paddingHorizontal: 4,
    },
    reviewImagesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F48C06',
        marginBottom: 12,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#E5E7EB',
        marginLeft: 8,
    },
    reviewImagesList: {
        paddingRight: 16,
    },
    reviewImageContainer: {
        marginRight: 16,
        // width will be set dynamically based on screen size
    },
    reviewImageWrapper: {
        position: 'relative',
    },
    reviewImage: {
        // width and height will be set dynamically based on screen size
        borderRadius: 24,
    },
    moreImagesOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 20,
        paddingHorizontal: 6,
        paddingVertical: 3,
        minWidth: 20,
        alignItems: 'center',
    },
    moreImagesText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    reviewTextOverlay: {
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '80%',
    },
    reviewText: {
        fontSize: 14,
        color: '#000000',
        lineHeight: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    noImagesText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 20,
        fontStyle: 'italic',
    },
    // Image Gallery Modal Styles
    imageGalleryOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
    },
    imageGalleryContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000000',
        paddingBottom: 50, // Extra safe area for iPhone home indicator
    },
    imageGalleryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 50, // Account for status bar
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    imageGalleryTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    imageGalleryCloseButton: {
        padding: 8,
    },
    imageGalleryContent: {
        flex: 1,
    },
    imageGalleryItem: {
        width: Dimensions.get('window').width,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    imageGalleryImage: {
        width: Dimensions.get('window').width - 10,
        height: Dimensions.get('window').width - 10,
        maxHeight: '60%',
        borderRadius: 12,
    },
    imageGalleryTextContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '80%',
        alignSelf: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    imageGalleryReviewText: {
        fontSize: 16,
        color: '#000000',
        lineHeight: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    bottomActionBar: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 32,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 12,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F48C06',
        marginLeft: 8,
    },
});

export default LocationDetailModal;

