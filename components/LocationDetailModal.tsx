import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Image,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Navigation, Bookmark, Share2 } from 'lucide-react-native';
import { LocationDetails } from '../types/location';

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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

    // Bottom sheet snap points - 90% of screen
    const snapPoints = useMemo(() => ['90%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setTimeout(() => {
                onClose();
            }, 100);
        }
    }, [onClose]);

    // Open/close effect
    React.useEffect(() => {
        if (isVisible) {
            // Small delay to ensure proper mounting
            setTimeout(() => {
                bottomSheetRef.current?.expand();
            }, 50);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

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
        // Force close the sheet first
        bottomSheetRef.current?.close();
        // Then reset state and call onClose
        setTimeout(() => {
            onClose();
        }, 100);
    };

    const handleNavigate = () => {
        if (onNavigate && location) {
            onNavigate(location);
        }
    };

    const handleSave = () => {
        if (onSave && location) {
            onSave(location);
        }
    };

    const handleShare = () => {
        if (onShare && location) {
            onShare(location);
        }
    };

    const handleCall = () => {
        const phoneContact = location?.contacts.find(contact => contact.type === 'phone');
        if (onCall && phoneContact) {
            onCall(phoneContact.value);
        }
    };

    if (!isVisible || !location) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={true}
            backgroundStyle={{
                backgroundColor: '#000000', // Dark background like in image
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

                {/* Content */}
                <BottomSheetScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Description */}
                    {location.description && (
                        <View style={styles.descriptionSection}>
                            <View style={styles.descriptionHeader}>
                                <View style={styles.descriptionIconContainer}>
                                    <Ionicons name="document-text-outline" size={20} color="#F48C06" />
                                </View>
                                <Text style={styles.descriptionTitle}>Mô tả</Text>
                            </View>
                            <View style={styles.descriptionContainer}>
                                <Text style={styles.descriptionText}>{location.description}</Text>
                            </View>
                            <View style={styles.divider} />
                        </View>
                    )}

                    {/* Image Gallery */}
                    <View style={styles.imageGallery}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.galleryContent}
                        >
                            {location.imageUrls && location.imageUrls.length > 0 ? (
                                location.imageUrls.map((imageUrl, index) => (
                                    <View key={index} style={styles.galleryImageContainer}>
                                        <Image
                                            source={{ uri: imageUrl }}
                                            style={styles.galleryImage}
                                            resizeMode="cover"
                                        />
                                        {/* Tag */}
                                        <View style={styles.imageTag}>
                                            <Text style={styles.tagText}>Sạch sẽ</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.galleryImageContainer}>
                                    <View style={styles.placeholderGalleryImage}>
                                        <Ionicons
                                            name={getLocationIcon(location.categories[0] || 'location')}
                                            size={48}
                                            color="#9CA3AF"
                                        />
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Share Experience Button */}
                    <TouchableOpacity style={styles.shareExperienceButton}>
                        <MapPin size={20} color="#F48C06" />
                        <Text style={styles.shareExperienceText}>
                            Chia sẻ trải nghiệm của bạn
                        </Text>
                    </TouchableOpacity>
                </BottomSheetScrollView>

                {/* Bottom Action Bar */}
                <View style={styles.bottomActionBar}>
                    {/* Navigate Button */}
                    <TouchableOpacity
                        style={styles.navigateButton}
                        onPress={handleNavigate}
                    >
                        <LinearGradient
                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                            locations={[0, 0.31, 0.69, 1]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.navigateButtonGradient}
                        >
                            <Navigation size={20} color="#FFFFFF" />
                            <Text style={styles.navigateButtonText}>Chỉ đường</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                    >
                        <Bookmark size={20} color="#F48C06" />
                        <Text style={styles.saveButtonText}>Lưu</Text>
                    </TouchableOpacity>

                    {/* Share Button */}
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShare}
                    >
                        <Share2 size={20} color="#F48C06" />
                        <Text style={styles.shareButtonText}>Chia sẻ</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetView>
        </BottomSheet>
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
        paddingTop: 16,
        paddingBottom: 20,
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
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    descriptionSection: {
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    descriptionIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(244, 140, 6, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    descriptionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    descriptionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        borderLeftWidth: 3,
        borderLeftColor: '#F48C06',
        marginBottom: 20,
    },
    descriptionText: {
        fontSize: 16,
        color: '#E5E7EB',
        lineHeight: 26,
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 8,
    },
    imageGallery: {
        marginBottom: 20,
    },
    galleryContent: {
        paddingHorizontal: 4,
    },
    galleryImageContainer: {
        width: screenWidth * 0.7,
        height: 200,
        marginRight: 12,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    placeholderGalleryImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageTag: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    tagText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000000',
    },
    shareExperienceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 20,
    },
    shareExperienceText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        marginLeft: 8,
    },
    bottomActionBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 32,
        gap: 12,
    },
    navigateButton: {
        flex: 1,
    },
    navigateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    navigateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    saveButton: {
        flex: 1,
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
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 12,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F48C06',
        marginLeft: 8,
    },
});

export default LocationDetailModal;

