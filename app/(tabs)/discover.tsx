import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, TextInput, TouchableOpacity, useColorScheme, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import MapView from '../../components/MapView';
import { useLocation } from '../../hooks/useLocation';
import { locationService } from '../../services/locationService';
import { useAuthStore } from '../../store';
import { LocationDetails } from '../../types/location';

export default function DiscoverScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

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

    const { tokens } = useAuthStore();

    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<LocationDetails[]>([]);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleLocationSelect = useCallback((location: { lat: number; lng: number }) => {
        setSelectedLocation(location);
        // Enterprise: Remove debug logs in production
    }, []);

    // Search functions with debounce
    const performSearch = useCallback(async (query: string) => {
        if (!location || !tokens.accessToken) {
            return;
        }

        try {
            setSearchLoading(true);

            const response = await locationService.getNLPRecommendations({
                sessionId: `session_${Date.now()}`,
                nlp: query.trim(),
                latitude: location.latitude,
                longitude: location.longitude,
            });

            if (response.status === 'success') {
                setSearchResults(response.data);
            }
        } catch (error) {
            console.error('Search error:', error);
            Alert.alert('Lỗi tìm kiếm', 'Không thể tìm kiếm địa điểm. Vui lòng thử lại.');
        } finally {
            setSearchLoading(false);
        }
    }, [location, tokens.accessToken]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        // Debounce search by 500ms
        const timeout = setTimeout(() => {
            performSearch(query);
        }, 500);

        setSearchTimeout(timeout);
    }, [searchTimeout, performSearch]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        Keyboard.dismiss();
    }, []);

    const dismissKeyboard = useCallback(() => {
        Keyboard.dismiss();
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
            // Clear search timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [lat, lng, accuracy]); // ✅ Dependencies include splash location data

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm địa điểm..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchLoading ? (
                        <ActivityIndicator size="small" color="#F48C06" style={styles.searchButton} />
                    ) : (
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={searchQuery ? clearSearch : undefined}
                        >
                            {searchQuery ? (
                                <X
                                    size={20}
                                    color="#9CA3AF"
                                />
                            ) : (
                                <Search
                                    size={20}
                                    color="#9CA3AF"
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <MapView
                    onLocationSelect={handleLocationSelect}
                    showUserLocation={true}
                    initialLocation={initialLocation || undefined}
                    currentLocation={location}
                    style={styles.fullMap}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        color: '#000000',
    },
    searchButton: {
        marginLeft: 8,
    },
    fullMap: {
        flex: 1,
    },
});
