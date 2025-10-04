import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, TextInput, TouchableOpacity, useColorScheme, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Search, X, RefreshCw } from 'lucide-react-native';
import MapView from '../../components/MapView';
import MapPin from '../../components/MapPin';
import LocationCard from '../../components/LocationDetailSheet';
import { useLocation } from '../../hooks/useLocation';
import { useRandomRecommendations } from '../../hooks/useRandomRecommendations';
import { locationService } from '../../services/locationService';
import { useAuthStore } from '../../store';
import { LocationDetails } from '../../types/location';
import { useModal } from '../../contexts/ModalContext';

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
        stopWatching,
        getAddressFromCoordinates
    } = useLocation();

    const { tokens } = useAuthStore();

    // Random recommendations hook
    const {
        recommendations,
        loading: recommendationsLoading,
        error: recommendationsError,
        getRandomRecommendations,
        clearRecommendations,
        refreshRecommendations,
    } = useRandomRecommendations({
        onError: (error) => {
            Alert.alert('Lỗi tải địa điểm', error);
        }
    });

    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedLocationDetails, setSelectedLocationDetails] = useState<LocationDetails | null>(null);
    const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<LocationDetails[]>([]);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [mapController, setMapController] = useState<{ centerMapOnLocation: (latitude: number, longitude: number, delta?: number) => void } | null>(null);
    const [selectedLocationForDetail, setSelectedLocationForDetail] = useState<LocationDetails | null>(null);
    const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);

    // Use ModalContext for LocationDetailModal
    const { openLocationDetailModal } = useModal();

    const handleLocationSelect = useCallback((location: { lat: number; lng: number }) => {
        console.log('handleLocationSelect called - closing modal');
        setSelectedLocation(location);
        // Close modal when clicking on map
        setIsDetailSheetVisible(false);
        setSelectedLocationForDetail(null);
        // Enterprise: Remove debug logs in production
    }, []);

    // Handle MapPin selection
    const handleMapPinSelect = useCallback((locationDetails: LocationDetails) => {
        console.log('handleMapPinSelect called:', locationDetails.name);

        // Use setTimeout to ensure state updates happen after any map click events
        setTimeout(() => {
            setSelectedLocationDetails(locationDetails);
            setSelectedLocation({
                lat: locationDetails.latitude,
                lng: locationDetails.longitude
            });

            // Show detail sheet
            setSelectedLocationForDetail(locationDetails);
            setIsDetailSheetVisible(true);
            console.log('Modal should be visible now');
        }, 100);
    }, []);

    // Load random recommendations when location is available
    const loadRandomRecommendations = useCallback(async (lat: number, lng: number) => {
        if (!tokens.accessToken) {
            return;
        }

        try {
            // Get address from coordinates (optional)
            const address = await getAddressFromCoordinates(lat, lng);

            await getRandomRecommendations(lat, lng, address || undefined);
        } catch (error) {
            console.error('Failed to load random recommendations:', error);
        }
    }, [tokens.accessToken, getRandomRecommendations, getAddressFromCoordinates]);

    // Refresh recommendations
    const handleRefreshRecommendations = useCallback(async () => {
        if (location) {
            await refreshRecommendations(location.latitude, location.longitude);
        }
    }, [location, refreshRecommendations]);

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

    // Handle map controller reference
    const handleMapRef = useCallback((controller: { centerMapOnLocation: (latitude: number, longitude: number, delta?: number) => void } | null) => {
        setMapController(controller);
    }, []);

    // Handle detail sheet close
    const handleDetailSheetClose = useCallback(() => {
        setIsDetailSheetVisible(false);
        setSelectedLocationForDetail(null);
    }, []);

    // Handle opening detail modal from card
    const handleOpenDetailModal = useCallback((locationDetails: LocationDetails) => {
        openLocationDetailModal(locationDetails);
    }, [openLocationDetailModal]);

    // Handle navigation to location
    const handleNavigateToLocation = useCallback((locationDetails: LocationDetails) => {
        // Center map on the location
        if (mapController) {
            mapController.centerMapOnLocation(locationDetails.latitude, locationDetails.longitude, 0.005);
        }

        // Close the detail sheet
        handleDetailSheetClose();

        // You can add navigation logic here (e.g., open external maps app)
        Alert.alert(
            'Chỉ đường',
            `Mở ứng dụng bản đồ để chỉ đường đến ${locationDetails.name}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Mở bản đồ', onPress: () => {
                        // Add logic to open external maps app
                        console.log('Opening maps app for:', locationDetails.name);
                    }
                }
            ]
        );
    }, [mapController, handleDetailSheetClose]);

    // Handle call action
    const handleCallLocation = useCallback((phoneNumber: string) => {
        Alert.alert(
            'Gọi điện',
            `Gọi đến số ${phoneNumber}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Gọi', onPress: () => {
                        // Add logic to make phone call
                        console.log('Calling:', phoneNumber);
                    }
                }
            ]
        );
    }, []);

    // Handle save location
    const handleSaveLocation = useCallback((locationDetails: LocationDetails) => {
        Alert.alert(
            'Lưu địa điểm',
            `Lưu "${locationDetails.name}" vào bộ sưu tập?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Lưu', onPress: () => {
                        // Add logic to save location
                        console.log('Saving location:', locationDetails.name);
                    }
                }
            ]
        );
    }, []);

    // Handle share location
    const handleShareLocation = useCallback((locationDetails: LocationDetails) => {
        Alert.alert(
            'Chia sẻ địa điểm',
            `Chia sẻ "${locationDetails.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Chia sẻ', onPress: () => {
                        // Add logic to share location
                        console.log('Sharing location:', locationDetails.name);
                    }
                }
            ]
        );
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

                    // Load random recommendations
                    await loadRandomRecommendations(parseFloat(lat), parseFloat(lng));
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

                        // Load random recommendations
                        await loadRandomRecommendations(currentLocation.latitude, currentLocation.longitude);
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

                {/* Refresh Button */}
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefreshRecommendations}
                    disabled={recommendationsLoading}
                >
                    {recommendationsLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <RefreshCw size={20} color="#FFFFFF" />
                    )}
                </TouchableOpacity>

                <MapView
                    onLocationSelect={handleLocationSelect}
                    showUserLocation={true}
                    initialLocation={initialLocation || undefined}
                    currentLocation={location}
                    style={styles.fullMap}
                    onMapRef={handleMapRef}
                >
                    {/* Render MapPins for recommendations */}
                    {recommendations.map((locationDetails) => {
                        console.log('Rendering recommendation:', locationDetails.name);
                        return (
                            <MapPin
                                key={locationDetails.id}
                                location={locationDetails}
                                onPress={handleMapPinSelect}
                                onCenterMap={mapController?.centerMapOnLocation}
                                isSelected={selectedLocationDetails?.id === locationDetails.id}
                                size="medium"
                            />
                        );
                    })}

                    {/* Render MapPins for search results */}
                    {searchResults.map((locationDetails) => (
                        <MapPin
                            key={`search_${locationDetails.id}`}
                            location={locationDetails}
                            onPress={handleMapPinSelect}
                            onCenterMap={mapController?.centerMapOnLocation}
                            isSelected={selectedLocationDetails?.id === locationDetails.id}
                            size="small"
                            customIcon="search"
                        />
                    ))}
                </MapView>

                {/* Location Card */}
                <LocationCard
                    location={selectedLocationForDetail}
                    visible={isDetailSheetVisible}
                    onClose={handleDetailSheetClose}
                    onNavigate={handleNavigateToLocation}
                    onCall={handleCallLocation}
                    onOpenDetail={handleOpenDetailModal}
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
    refreshButton: {
        position: 'absolute',
        top: 50,
        right: 16,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F48C06',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 1,
    },
    fullMap: {
        flex: 1,
    },
});
