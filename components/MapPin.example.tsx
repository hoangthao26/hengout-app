import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import MapPin from './MapPin';
import { LocationDetails } from '../types/location';

// Example usage of MapPin component
const MapPinExample: React.FC = () => {
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    // Mock location data
    const mockLocations: LocationDetails[] = [
        {
            id: '1',
            name: 'Nhà hàng ABC',
            description: 'Nhà hàng ẩm thực Việt Nam',
            address: '123 Đường ABC, Quận 1, TP.HCM',
            latitude: 10.7769,
            longitude: 106.7009,
            totalRating: 4.5,
            categories: ['restaurant', 'vietnamese'],
            purposes: ['dining', 'family'],
            tags: ['traditional', 'affordable'],
            imageUrls: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'],
            contacts: []
        },
        {
            id: '2',
            name: 'Quán cà phê XYZ',
            description: 'Quán cà phê view đẹp',
            address: '456 Đường XYZ, Quận 3, TP.HCM',
            latitude: 10.7829,
            longitude: 106.7009,
            totalRating: 4.2,
            categories: ['cafe', 'coffee'],
            purposes: ['work', 'meeting'],
            tags: ['cozy', 'wifi'],
            imageUrls: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop'],
            contacts: []
        },
        {
            id: '3',
            name: 'Công viên DEF',
            description: 'Công viên giải trí',
            address: '789 Đường DEF, Quận 7, TP.HCM',
            latitude: 10.7369,
            longitude: 106.7209,
            totalRating: 4.0,
            categories: ['park', 'recreation'],
            purposes: ['exercise', 'family'],
            tags: ['green', 'free'],
            imageUrls: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop'],
            contacts: []
        }
    ];

    const handleLocationPress = (location: LocationDetails) => {
        setSelectedLocation(location.id);
        console.log('Selected location:', location.name);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>MapPin Component Examples</Text>

            {/* Small Size */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Small Size</Text>
                <View style={styles.pinRow}>
                    {mockLocations.slice(0, 2).map((location) => (
                        <MapPin
                            key={location.id}
                            location={location}
                            size="small"
                            onPress={handleLocationPress}
                            isSelected={selectedLocation === location.id}
                        />
                    ))}
                </View>
            </View>

            {/* Medium Size (Default) */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medium Size (Default)</Text>
                <View style={styles.pinRow}>
                    {mockLocations.map((location) => (
                        <MapPin
                            key={location.id}
                            location={location}
                            size="medium"
                            onPress={handleLocationPress}
                            isSelected={selectedLocation === location.id}
                        />
                    ))}
                </View>
            </View>

            {/* Large Size */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Large Size</Text>
                <View style={styles.pinRow}>
                    {mockLocations.slice(0, 2).map((location) => (
                        <MapPin
                            key={location.id}
                            location={location}
                            size="large"
                            onPress={handleLocationPress}
                            isSelected={selectedLocation === location.id}
                        />
                    ))}
                </View>
            </View>

            {/* All pins now display without labels by default */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Map Pins (No Labels)</Text>
                <View style={styles.pinRow}>
                    {mockLocations.map((location) => (
                        <MapPin
                            key={location.id}
                            location={location}
                            onPress={handleLocationPress}
                            isSelected={selectedLocation === location.id}
                        />
                    ))}
                </View>
            </View>

            {/* Custom Icons */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Custom Icons</Text>
                <View style={styles.pinRow}>
                    <MapPin
                        location={mockLocations[0]}
                        customIcon="restaurant"
                        onPress={handleLocationPress}
                        isSelected={selectedLocation === mockLocations[0].id}
                    />
                    <MapPin
                        location={mockLocations[1]}
                        customIcon="cafe"
                        onPress={handleLocationPress}
                        isSelected={selectedLocation === mockLocations[1].id}
                    />
                    <MapPin
                        location={mockLocations[2]}
                        customIcon="leaf"
                        onPress={handleLocationPress}
                        isSelected={selectedLocation === mockLocations[2].id}
                    />
                </View>
            </View>

            {/* Selected Location Info */}
            {selectedLocation && (
                <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>Selected Location:</Text>
                    <Text style={styles.infoText}>
                        {mockLocations.find(loc => loc.id === selectedLocation)?.name}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#555',
    },
    pinRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoSection: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
    },
});

export default MapPinExample;
