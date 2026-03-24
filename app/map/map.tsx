import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, User } from 'lucide-react-native';
import Header from '../../components/Header';
import MapView from '../../components/MapView';
import { MapErrorBoundary } from '../../components/errorBoundaries';
import { useLocation } from '../../hooks/useLocation';

export default function MapScreen() {
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';
    const { location, getCurrentLocation, loading } = useLocation();
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    const handleLocationSelect = (location: { lat: number; lng: number }) => {
        setSelectedLocation(location);
    };

    const handleGetCurrentLocation = async () => {
        const currentLocation = await getCurrentLocation();
        if (currentLocation) {
            Alert.alert(
                'Current Location',
                `Lat: ${currentLocation.latitude.toFixed(6)}\nLng: ${currentLocation.longitude.toFixed(6)}`,
                [{ text: 'OK' }]
            );
        }
    };

    const handleShareLocation = () => {
        if (selectedLocation) {
            Alert.alert(
                'Share Location',
                `Share this location?\nLat: ${selectedLocation.lat.toFixed(6)}\nLng: ${selectedLocation.lng.toFixed(6)}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Share', onPress: () => {
                        // TODO: Implement location sharing functionality
                    }}
                ]
            );
        } else {
            Alert.alert('No Location Selected', 'Please select a location on the map first.');
        }
    };

    return (
        <MapErrorBoundary>
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <Header
                    title="Map"
                    showBackButton
                    onBackPress={() => router.back()}
                    rightIcon={{
                        icon: Navigation,
                        size: 28,
                        onPress: handleGetCurrentLocation
                    }}
                />

                {/* Map Container */}
                <View style={styles.mapContainer}>
                    <MapView
                        onLocationSelect={handleLocationSelect}
                        showUserLocation={true}
                        style={styles.map}
                    />
                </View>

                {/* Bottom Panel */}
                <View style={[styles.bottomPanel, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                    {selectedLocation ? (
                        <View style={styles.selectedLocationInfo}>
                            <View style={styles.locationHeader}>
                                <MapPin size={20} color="#F48C06" />
                                <Text style={[styles.locationTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Selected Location
                                </Text>
                            </View>
                            <Text style={[styles.locationText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Lat: {selectedLocation.lat.toFixed(6)}
                            </Text>
                            <Text style={[styles.locationText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Lng: {selectedLocation.lng.toFixed(6)}
                            </Text>
                            <TouchableOpacity
                                style={[styles.shareButton, { backgroundColor: '#F48C06' }]}
                                onPress={handleShareLocation}
                            >
                                <Text style={styles.shareButtonText}>Share Location</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.instructionPanel}>
                            <MapPin size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text style={[styles.instructionText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Tap on the map to select a location
                            </Text>
                        </View>
                    )}

                    {location && (
                        <View style={styles.currentLocationInfo}>
                            <View style={styles.locationHeader}>
                                <User size={16} color="#3B82F6" />
                                <Text style={[styles.currentLocationText, { color: isDark ? '#3B82F6' : '#2563EB' }]}>
                                    Your Location
                                </Text>
                            </View>
                            <Text style={[styles.locationText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Lat: {location.latitude.toFixed(6)}
                            </Text>
                            <Text style={[styles.locationText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Lng: {location.longitude.toFixed(6)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </MapErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapContainer: {
        flex: 1,
        margin: 16,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    map: {
        flex: 1,
    },
    bottomPanel: {
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    selectedLocationInfo: {
        marginBottom: 16,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    locationText: {
        fontSize: 14,
        marginBottom: 4,
    },
    shareButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    instructionPanel: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    instructionText: {
        fontSize: 16,
        marginTop: 8,
        textAlign: 'center',
    },
    currentLocationInfo: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(156, 163, 175, 0.2)',
    },
    currentLocationText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
});
