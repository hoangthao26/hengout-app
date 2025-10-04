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
    visible: boolean;
    onClose: () => void;
    onNavigate?: (location: LocationDetails) => void;
    onCall?: (phoneNumber: string) => void;
    onOpenDetail?: (location: LocationDetails) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const LocationCard: React.FC<LocationCardProps> = ({
    location,
    visible,
    onClose,
    onNavigate,
    onCall,
    onOpenDetail,
}) => {
    const isDark = useColorScheme() === 'dark';

    console.log('LocationModal render:', { visible, location: location?.name });

    if (!location) {
        console.log('LocationModal: No location, returning null');
        return null;
    }

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

    console.log('LocationModal: About to render modal');

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: '#FFFFFF' }]}
            onPress={() => onOpenDetail && onOpenDetail(location)}
            activeOpacity={1}
        >
            {/* Card Content */}
            <View style={styles.cardContent}>
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
    container: {
        position: 'absolute',
        bottom: 16, // 16px margin from bottom tabs
        left: 16,
        right: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        position: 'relative',
        minHeight: 120,
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
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default LocationCard;
