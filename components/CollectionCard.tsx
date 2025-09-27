import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Globe, Lock, MapPin, ChevronRight } from 'lucide-react-native';
import { LocationFolder } from '../types/locationFolder';

interface CollectionCardProps {
    collection: LocationFolder;
    onPress: (collection: LocationFolder) => void;
    locationCount?: number;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
    collection,
    onPress,
    locationCount = 0
}) => {
    const isDark = useColorScheme() === 'dark';

    const getVisibilityIcon = () => {
        return collection.visibility === 'PUBLIC' ? Globe : Lock;
    };

    const getVisibilityColor = () => {
        return collection.visibility === 'PUBLIC' ? '#10B981' : '#6B7280';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
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
            onPress={() => onPress(collection)}
            activeOpacity={0.7}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text
                        style={[
                            styles.title,
                            { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}
                        numberOfLines={1}
                    >
                        {collection.name}
                    </Text>
                    {collection.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: '#F59E0B' }]}>
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                        </View>
                    )}
                </View>

                <View style={styles.visibilityContainer}>
                    {(() => {
                        const IconComponent = getVisibilityIcon();
                        return <IconComponent size={16} color={getVisibilityColor()} />;
                    })()}
                </View>
            </View>

            {/* Description */}
            {collection.description && (
                <Text
                    style={[
                        styles.description,
                        { color: isDark ? '#9CA3AF' : '#6B7280' }
                    ]}
                    numberOfLines={2}
                >
                    {collection.description}
                </Text>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.statsContainer}>
                    <MapPin
                        size={14}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                    <Text
                        style={[
                            styles.statsText,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}
                    >
                        {locationCount} địa điểm
                    </Text>
                </View>

                <Text
                    style={[
                        styles.dateText,
                        { color: isDark ? '#6B7280' : '#9CA3AF' }
                    ]}
                >
                    {formatDate(collection.createdAt)}
                </Text>
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
        borderRadius: 12,
        padding: 16,
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginRight: 8,
    },
    defaultBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    defaultBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    visibilityContainer: {
        padding: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statsText: {
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    dateText: {
        fontSize: 12,
    },
    arrowContainer: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -10,
    },
});

export default CollectionCard;
