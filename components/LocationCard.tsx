import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    ScrollView,
    useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LocationDetails } from '../types/location';

interface LocationCardProps {
    location: LocationDetails | null;
    visible?: boolean;
    onClose?: () => void;
    onNavigate?: (location: LocationDetails) => void;
    onCall?: (phoneNumber: string) => void;
    onOpenDetail?: (location: LocationDetails) => void;
    variant?: 'overlay' | 'list';
    style?: any;
    // Additional props for list variant
    addedAt?: string;
    updatedAt?: string;
    note?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const LocationCard: React.FC<LocationCardProps> = ({
    location,
    visible = true,
    onClose,
    onNavigate,
    onCall,
    onOpenDetail,
    variant = 'overlay',
    style,
    addedAt,
    updatedAt,
    note,
}) => {
    const isDark = useColorScheme() === 'dark';

    if (!location || !visible) {
        return null;
    }

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleNavigate = () => {
        if (onNavigate) {
            onNavigate(location);
        }
    };

    const handleCall = () => {
        const phoneContact = location.contacts.find(contact => contact.type === 'phone');
        if (onCall && phoneContact) {
            onCall(phoneContact.value);
        }
    };


    const containerStyle = variant === 'overlay'
        ? [styles.overlayContainer, {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            shadowColor: isDark ? '#FFFFFF' : '#000000'
        }, style]
        : [styles.listContainer, {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            shadowColor: isDark ? '#FFFFFF' : '#000000',
        }, style];

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={() => onOpenDetail && onOpenDetail(location)}
            activeOpacity={1}
        >
            {/* Card Content */}
            <View style={styles.cardContent}>
                {/* Left Section - Image */}
                <View style={variant === 'overlay' ? styles.imageContainer : styles.listImageContainer}>
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
                    <Text style={[
                        variant === 'overlay' ? styles.locationName : styles.listLocationName,
                        { color: isDark ? '#FFFFFF' : '#000000' }
                    ]} numberOfLines={1}>
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
                        <Text style={[
                            variant === 'overlay' ? styles.addressText : styles.listAddressText,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            {location.address}
                        </Text>
                    </View>

                    {/* Additional info for list variant */}
                    {variant === 'list' && (
                        <>
                            {/* Note */}
                            {note && note.trim() && (
                                <View style={styles.noteRow}>
                                    <Ionicons name="document-text-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <Text style={[
                                        styles.noteText,
                                        { color: isDark ? '#9CA3AF' : '#6B7280' }
                                    ]} numberOfLines={2}>
                                        {note}
                                    </Text>
                                </View>
                            )}

                            {/* Date info */}
                            <View style={styles.dateRow}>
                                {addedAt && (
                                    <Text style={[
                                        styles.dateText,
                                        { color: isDark ? '#6B7280' : '#9CA3AF' }
                                    ]}>
                                        Thêm: {formatDate(addedAt)}
                                    </Text>
                                )}
                            </View>
                        </>
                    )}
                </View>


            </View>
        </TouchableOpacity>
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
    overlayContainer: {
        borderRadius: 20,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 3,
        zIndex: 2,
        width: '100%', // Full width
    },
    listContainer: {
        borderRadius: 20,
        // marginHorizontal: 12, // Đã được xử lý bởi container wrapper

        shadowOffset: {
            width: 0,
            height: 2, // Giảm từ 4 xuống 2
        },
        shadowOpacity: 0.2, // Giảm từ 0.4 xuống 0.2
        shadowRadius: 3, // Giảm từ 6 xuống 3
        elevation: 2, // Giảm từ 3 xuống 2
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        position: 'relative',
        minHeight: 100,
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 16,
    },
    listImageContainer: {
        width: 100,
        height: 100,
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
        marginBottom: 6,
    },
    listLocationName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
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
        marginLeft: 0,
        flex: 1,
        flexWrap: 'wrap',
    },
    listAddressText: {
        fontSize: 13,
        marginLeft: 0,
        flex: 1,
        flexWrap: 'wrap',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 4,
        marginBottom: 4,
    },
    noteText: {
        fontSize: 12,
        marginLeft: 4,
        flex: 1,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    dateRow: {
        marginTop: 4,
    },
    dateText: {
        fontSize: 11,
    },
});

export default LocationCard;


