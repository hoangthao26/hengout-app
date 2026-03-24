import { ChevronRight, FileText, MapPin, UserPen, XCircle } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { LocationInFolder } from '../types/locationFolder';

interface CollectionDetailCardProps {
    location: LocationInFolder;
    onPress: (location: LocationInFolder) => void;
    onRemove?: (locationId: string) => void;
    onEdit?: (location: LocationInFolder) => void;
    showActions?: boolean;
    isProtected?: boolean;
}

const CollectionDetailCard: React.FC<CollectionDetailCardProps> = ({
    location,
    onPress,
    onRemove,
    onEdit,
    showActions = false,
    isProtected = false
}) => {
    const isDark = useColorScheme() === 'dark';

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

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? '#232024' : '#FFFFFF',
                }
            ]}
            onPress={() => onPress(location)}
            activeOpacity={0.7}
        >
            {/* Image */}
            <View style={styles.imageContainer}>
                {location.imageUrl ? (
                    <Image
                        source={{ uri: location.imageUrl }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                        <MapPin
                            size={32}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text
                        style={[
                            styles.locationName,
                            { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}
                        numberOfLines={1}
                    >
                        {location.locationName}
                    </Text>

                    {showActions && (
                        <View style={styles.actionsContainer}>
                            {onEdit && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => !isProtected && onEdit(location)}
                                    disabled={isProtected}
                                    activeOpacity={isProtected ? 1 : 0.7}
                                >
                                    <UserPen
                                        size={18}
                                        color={isProtected
                                            ? (isDark ? '#4B5563' : '#9CA3AF')
                                            : (isDark ? '#9CA3AF' : '#6B7280')
                                        }
                                    />
                                </TouchableOpacity>
                            )}
                            {onRemove && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => !isProtected && onRemove(location.id)}
                                    disabled={isProtected}
                                    activeOpacity={isProtected ? 1 : 0.7}
                                >
                                    <XCircle
                                        size={20}
                                        color={isProtected ? '#9CA3AF' : '#EF4444'}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Address */}
                <View style={styles.addressContainer}>
                    <MapPin
                        size={14}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                    <Text
                        style={[
                            styles.address,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}
                        numberOfLines={2}
                    >
                        {location.address}
                    </Text>
                </View>

                {/* Note */}
                {location.note && (
                    <View style={styles.noteContainer}>
                        <FileText
                            size={14}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                        <Text
                            style={[
                                styles.note,
                                { color: isDark ? '#9CA3AF' : '#6B7280' }
                            ]}
                            numberOfLines={2}
                        >
                            {location.note}
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text
                        style={[
                            styles.dateText,
                            { color: isDark ? '#6B7280' : '#9CA3AF' }
                        ]}
                    >
                        Thêm vào {formatDate(location.addedAt)}
                    </Text>
                </View>
            </View>

            {/* Arrow Icon */}
            <View style={styles.arrowContainer}>
                <ChevronRight
                    size={20}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    imageContainer: {
        marginRight: 12,

    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 4,
        marginLeft: 4,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    address: {
        fontSize: 14,
        marginLeft: 4,
        flex: 1,
        lineHeight: 18,
    },
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    note: {
        fontSize: 13,
        marginLeft: 4,
        flex: 1,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    footer: {
        marginTop: 'auto',
    },
    dateText: {
        fontSize: 12,
    },
    arrowContainer: {
        justifyContent: 'center',
        paddingLeft: 8,
    },
});

export default CollectionDetailCard;
