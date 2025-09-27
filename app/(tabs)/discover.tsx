import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView from '../../components/MapView';
import { useLocation } from '../../hooks/useLocation';

export default function DiscoverScreen() {
    // Get location data from splash screen navigation params
    const { lat, lng, accuracy } = useLocalSearchParams<{
        lat?: string;
        lng?: string;
        accuracy?: string;
    }>();

    const {
        location,
        loading,
        error,
        getCurrentLocation,
        requestLocationPermission,
        watchLocation,
        stopWatching
    } = useLocation();

    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const handleLocationSelect = useCallback((location: { lat: number; lng: number }) => {
        setSelectedLocation(location);
        // Enterprise: Remove debug logs in production
    }, []);

    // Enterprise: Error handling for location errors
    useEffect(() => {
        if (error) {
            Alert.alert(
                'Location Error',
                error,
                [
                    {
                        text: 'Retry', onPress: () => {
                            // Simple retry without complex dependencies
                            requestLocationPermission().then(hasPermission => {
                                if (hasPermission) {
                                    getCurrentLocation().then(currentLocation => {
                                        if (currentLocation) {
                                            setInitialLocation({
                                                lat: currentLocation.latitude,
                                                lng: currentLocation.longitude
                                            });
                                            watchLocation();
                                        }
                                    });
                                }
                            });
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    }, [error, requestLocationPermission, getCurrentLocation, watchLocation]);

    // Enterprise: Remove duplicate initializeLocation function

    // Enterprise: Initialize location on mount - use splash data if available
    useEffect(() => {
        let isMounted = true;

        const initLocation = async () => {
            if (!isMounted) return;

            try {
                // Check if we have location data from splash screen
                if (lat && lng) {
                    console.log('📍 [DiscoverScreen] Using location from splash:', { lat, lng, accuracy });

                    setInitialLocation({
                        lat: parseFloat(lat),
                        lng: parseFloat(lng)
                    });

                    // Start watching location for real-time updates
                    await watchLocation();
                    setIsInitialized(true);
                    return;
                }

                // Fallback: Request permission and get current location
                const hasPermission = await requestLocationPermission();

                if (hasPermission && isMounted) {
                    // Get current location
                    const currentLocation = await getCurrentLocation();

                    if (currentLocation && isMounted) {
                        setInitialLocation({
                            lat: currentLocation.latitude,
                            lng: currentLocation.longitude
                        });

                        // Start watching location for real-time updates
                        await watchLocation();
                        setIsInitialized(true);
                    }
                }
            } catch (error) {
                if (isMounted) {
                    Alert.alert(
                        'Location Initialization Failed',
                        'Unable to get your current location. Please check your location settings.',
                        [
                            { text: 'Retry', onPress: () => initLocation() },
                            { text: 'Continue', style: 'cancel' }
                        ]
                    );
                }
            }
        };

        initLocation();

        // Enterprise: Cleanup on unmount
        return () => {
            isMounted = false;
            stopWatching();
        };
    }, [lat, lng, accuracy]); // ✅ Dependencies include splash location data

    return (
        <View style={styles.container}>
            <MapView
                onLocationSelect={handleLocationSelect}
                showUserLocation={true}
                initialLocation={initialLocation || undefined}
                currentLocation={location}
                style={styles.fullMap}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullMap: {
        flex: 1,
    },
});
