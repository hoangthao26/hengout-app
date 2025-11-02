import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Alert, TextInput, TouchableOpacity, useColorScheme, ActivityIndicator, Keyboard, TouchableWithoutFeedback, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Search, X, MapPinHouse, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { MapErrorBoundary } from '../../components/errorBoundaries';
import { useFilterRecommendations } from '../../hooks/useFilterRecommendations';
import MapView from '../../components/MapView';
import MapPin from '../../components/MapPin';
import LocationCard from '../../components/LocationCard';
import { useLocation } from '../../hooks/useLocation';
import { useRandomRecommendations } from '../../hooks/useRandomRecommendations';
import { useNLPRecommendations } from '../../hooks/useNLPRecommendations';
import { locationService } from '../../services/locationService';
import { useAuthStore } from '../../store';
import { LocationDetails } from '../../types/location';
import { useModal } from '../../contexts/ModalContext';

export default function DiscoverScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Get location data from splash screen navigation params
    const { lat, lng, accuracy, locationId, latitude, longitude, autoOpenCard, locationData } = useLocalSearchParams<{
        lat?: string;
        lng?: string;
        accuracy?: string;
        locationId?: string;
        latitude?: string;
        longitude?: string;
        autoOpenCard?: string;
        locationData?: string;
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
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    // Filter modal is handled globally via ModalContext
    const searchInputRef = useRef<TextInput>(null);
    const [mapController, setMapController] = useState<{
        centerMapOnLocation: (latitude: number, longitude: number, delta?: number) => void;
        goToInitialLocation: () => void;
    } | null>(null);
    const [selectedLocationForDetail, setSelectedLocationForDetail] = useState<LocationDetails | null>(null);
    const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);

    // Use ModalContext for LocationDetailModal
    const { openLocationDetailModal, openFilterVibesModal } = useModal();

    // NLP Search hook
    const {
        results: searchResults,
        loading: searchLoading,
        search: performNLPSearch,
        clear: clearNLPSearch
    } = useNLPRecommendations({
        onError: (error) => {
            Alert.alert('Lỗi tìm kiếm', 'Không thể tìm kiếm địa điểm. Vui lòng thử lại.');
        }
    });

    // Filter hook
    const { results: filterResults, fetchByFilter, clear: clearFilter } = useFilterRecommendations({
        onError: (error) => {
            Alert.alert('Lỗi filter', error);
        }
    });

    const handleLocationSelect = useCallback((location: { lat: number; lng: number }) => {
        setSelectedLocation(location);
        setIsDetailSheetVisible(false);
        setSelectedLocationForDetail(null);
    }, []);

    // Handle MapPin selection
    const handleMapPinSelect = useCallback((locationDetails: LocationDetails) => {
        // Prefetch reviews immediately on pin select to warm cache for modal
        locationService.prefetchLocationReviews(locationDetails.id, 0, 20);

        // Use setTimeout to ensure state updates happen after any map click events
        setTimeout(() => {
            setSelectedLocationDetails(locationDetails);
            setSelectedLocation({
                lat: locationDetails.latitude,
                lng: locationDetails.longitude
            });

            setSelectedLocationForDetail(locationDetails);
        }, 0);
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
            // Silently fail - recommendations will load when location is available
            console.error('[Discover] Failed to load random recommendations:', error);
        }
    }, [tokens.accessToken, getRandomRecommendations, getAddressFromCoordinates]);

    // Refresh recommendations

    // Search functions with debounce
    const performSearch = useCallback(async (query: string) => {
        if (!location || !tokens.accessToken) {
            return;
        }

        // Clear random recommendations when searching
        clearRecommendations();

        await performNLPSearch(query, {
            lat: location.latitude,
            lng: location.longitude
        });
    }, [location, tokens.accessToken, performNLPSearch, clearRecommendations]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (!query.trim()) {
            clearNLPSearch();
            // Load random recommendations when input is empty
            if (location) {
                refreshRecommendations(location.latitude, location.longitude);
            }
            return;
        }

        // Debounce search by 500ms
        const timeout = setTimeout(() => {
            performSearch(query);
        }, 500);

        setSearchTimeout(timeout);
    }, [searchTimeout, performSearch, clearNLPSearch, location, refreshRecommendations]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        clearNLPSearch();
        Keyboard.dismiss();

        // Reload random recommendations when clearing search
        if (location) {
            refreshRecommendations(location.latitude, location.longitude);
        }
    }, [clearNLPSearch, location, refreshRecommendations]);

    const dismissKeyboard = useCallback(() => {
        Keyboard.dismiss();
        // Only close search if no search query (empty input)
        if (isSearchOpen && !searchQuery.trim()) {
            setIsSearchOpen(false);
        }
    }, [isSearchOpen, searchQuery]);

    // Handle map controller reference
    const handleMapRef = useCallback((controller: {
        centerMapOnLocation: (latitude: number, longitude: number, delta?: number) => void;
        goToInitialLocation: () => void;
    } | null) => {
        setMapController(controller);
    }, []);

    // Handle detail sheet close
    const handleDetailSheetClose = useCallback(() => {
        setIsDetailSheetVisible(false);
        setSelectedLocationForDetail(null);
    }, []);

    // Handle opening detail modal from card
    const handleOpenDetailModal = useCallback((locationDetails: LocationDetails) => {
        // Keep the LocationCard visible when opening modal
        setSelectedLocationForDetail(locationDetails);
        openLocationDetailModal(locationDetails);
    }, [openLocationDetailModal]);

    // Handle navigation to location
    const handleNavigateToLocation = useCallback((locationDetails: LocationDetails) => {
        // Center map on the location
        if (mapController) {
            mapController.centerMapOnLocation(locationDetails.latitude, locationDetails.longitude, 0.005);
        }

        // Keep LocationCard visible - don't close it

        // You can add navigation logic here (e.g., open external maps app)
        Alert.alert(
            'Chỉ đường',
            `Mở ứng dụng bản đồ để chỉ đường đến ${locationDetails.name}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Mở bản đồ', onPress: () => {
                        // Logic to open external maps app
                    }
                }
            ]
        );
    }, [mapController]);

    // Handle go to initial location
    const handleGoToInitialLocation = useCallback(() => {
        if (mapController) {
            // Use current GPS location if available, otherwise use initial location
            if (location) {
                mapController.centerMapOnLocation(location.latitude, location.longitude, 0.01);
            } else {
                mapController.goToInitialLocation();
            }
        }
    }, [mapController, location]);

    // Stable callback for centering map
    const handleCenterMap = useCallback((latitude: number, longitude: number, delta?: number) => {
        if (mapController) {
            mapController.centerMapOnLocation(latitude, longitude, delta);
        }
    }, [mapController]);

    // Handle search button press
    const handleSearchButtonPress = useCallback(() => {
        setIsSearchOpen(true);
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
    }, []);

    // Auto focus when opening search
    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isSearchOpen]);

    // Handle call action
    const handleCallLocation = useCallback((phoneNumber: string) => {
        Alert.alert(
            'Gọi điện',
            `Gọi đến số ${phoneNumber}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Gọi', onPress: () => {
                        // Logic to make phone call
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
                        // Logic to save location
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
                        // Logic to share location
                    }
                }
            ]
        );
    }, []);

    // Error handling for location errors
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

    // Remove duplicate initializeLocation function

    // Initialize location on mount - use splash data if available
    useEffect(() => {
        let isMounted = true;

        const initLocation = async () => {
            if (!isMounted) return;

            try {
                // Check if we have location data from splash screen
                if (lat && lng) {
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

                // Try to get better location using smart location service
                const { smartLocationService } = await import('../../services/smartLocationService');

                const smartLocation = await smartLocationService.getCurrentLocation({
                    accuracy: Location.Accuracy.High,
                    timeout: 10000,
                    retries: 3,
                    useCache: true
                });

                if (smartLocation && isMounted) {
                    setInitialLocation({
                        lat: smartLocation.latitude,
                        lng: smartLocation.longitude
                    });

                    // Start watching location for real-time updates
                    await watchLocation();
                    setIsInitialized(true);

                    // Load random recommendations
                    await loadRandomRecommendations(smartLocation.latitude, smartLocation.longitude);
                } else {
                    // Fallback: Use existing useLocation hook
                    const hasPermission = await requestLocationPermission();

                    if (hasPermission && isMounted) {
                        const currentLocation = await getCurrentLocation();

                        if (currentLocation && isMounted) {
                            setInitialLocation({
                                lat: currentLocation.latitude,
                                lng: currentLocation.longitude
                            });

                            await watchLocation();
                            setIsInitialized(true);
                            await loadRandomRecommendations(currentLocation.latitude, currentLocation.longitude);
                        } else {
                            setIsInitialized(true);
                        }
                    } else {
                        setIsInitialized(true);
                    }
                }
            } catch (error) {
                console.error('[Discover] Location initialization error:', error);
                if (isMounted) {
                    setIsInitialized(true);
                    // Fallback: Show map with default location (Ho Chi Minh City)
                }
            }
        };

        initLocation();

        // Cleanup on unmount
        return () => {
            isMounted = false;
            stopWatching();
            // Clear search timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [lat, lng, accuracy]); // Dependencies include splash location data

    // Center map on GPS location when initialLocation is set and mapController is ready
    useEffect(() => {
        if (initialLocation && mapController && isInitialized) {
            // Use setTimeout to ensure map is fully rendered
            const timeoutId = setTimeout(() => {
                mapController.centerMapOnLocation(initialLocation.lat, initialLocation.lng, 0.01);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [initialLocation, mapController, isInitialized]);

    // Handle auto-open location card from collection detail
    useEffect(() => {
        if (locationId && latitude && longitude && autoOpenCard === 'true') {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);

            setSelectedLocation({ lat, lng });

            // Move map center to the location
            setTimeout(() => {
                if (mapController) {
                    mapController.centerMapOnLocation(lat, lng, 0.005);
                } else {
                    setTimeout(() => {
                        if (mapController) {
                            (mapController as any).centerMapOnLocation(lat, lng, 0.005);
                        }
                    }, 1000);
                }
            }, 500);

            // Fetch full location details and open card
            const fetchLocationDetails = async () => {
                try {
                    const response = await locationService.getLocationDetails(locationId);
                    if (response.status === 'success') {
                        setSelectedLocationDetails(response.data);
                        setSelectedLocationForDetail(response.data);
                    }
                } catch (error) {
                    // Silently fail - location card won't show details
                    console.error('[Discover] Error fetching location details:', error);
                }
            };

            // Use location data if available, otherwise fetch from API
            if (locationData) {
                try {
                    const locationDetails = JSON.parse(locationData);
                    setSelectedLocationDetails(locationDetails);
                    setSelectedLocationForDetail(locationDetails);
                } catch (error) {
                    // Failed to parse location data - fetch from API instead
                    console.error('[Discover] Failed to parse location data:', error);
                    fetchLocationDetails();
                }
            } else {
                fetchLocationDetails();
            }
        }
    }, [locationId, latitude, longitude, autoOpenCard, mapController, locationData]);

    return (
        <MapErrorBoundary>
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <View style={styles.container}>
                    {/* Search Bar (only when opened) */}
                    {isSearchOpen && (
                        <View style={styles.searchContainer}>
                            <TextInput
                                ref={searchInputRef}
                                style={styles.searchInput}
                                placeholder="Tìm quán cà phê gần đây..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoFocus={true}
                            />
                            {searchLoading ? (
                                <ActivityIndicator size="small" color="#F48C06" style={styles.searchButton} />
                            ) : (
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={() => {
                                        if (searchQuery) {
                                            clearSearch();
                                        } else {
                                            setIsSearchOpen(false);
                                            Keyboard.dismiss();
                                        }
                                    }}
                                >
                                    <X size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Floating Filter Button - only show when search is open */}
                    {isSearchOpen && (
                        <TouchableOpacity
                            style={styles.filterFloating}
                            onPress={() => {
                                if (!location) return;
                                openFilterVibesModal(async ({ categories, purposes, tags }) => {
                                    const isEmpty = (!categories || categories.length === 0) && (!purposes || purposes.length === 0) && (!tags || tags.length === 0);

                                    if (isEmpty) {
                                        clearFilter();
                                        clearNLPSearch();
                                        clearRecommendations();
                                        await refreshRecommendations(location.latitude, location.longitude);
                                        return;
                                    }

                                    clearRecommendations();

                                    try {
                                        await fetchByFilter({
                                            categories,
                                            purposes,
                                            tags,
                                            latitude: location.latitude,
                                            longitude: location.longitude,
                                            address: ''
                                        });
                                    } catch (err) {
                                        console.error('[Discover] Filter API error:', err);
                                    }
                                });
                            }}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Filter size={28} color="#FFFFFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Bottom Container - Buttons + LocationCard */}
                    <View style={styles.bottomContainer}>
                        {/* Control Buttons */}
                        <View style={styles.controlButtons}>
                            {/* Search Button */}
                            <TouchableOpacity
                                style={styles.homeButton}
                                onPress={handleSearchButtonPress}
                            >
                                <LinearGradient
                                    colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                    locations={[0, 0.31, 0.69, 1]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    <Search size={28} color="#FFFFFF" />
                                </LinearGradient>
                            </TouchableOpacity>


                            {/* Go to Initial Location Button */}
                            <TouchableOpacity
                                style={styles.homeButton}
                                onPress={handleGoToInitialLocation}
                            >
                                <LinearGradient
                                    colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                    locations={[0, 0.31, 0.69, 1]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    <MapPinHouse size={28} color="#FFFFFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Location Card */}
                        <LocationCard
                            location={selectedLocationForDetail}
                            visible={!!selectedLocationForDetail}
                            onClose={handleDetailSheetClose}
                            onNavigate={handleNavigateToLocation}
                            onCall={handleCallLocation}
                            onOpenDetail={handleOpenDetailModal}
                        />
                    </View>

                    <MapView
                        onLocationSelect={handleLocationSelect}
                        showUserLocation={true}
                        initialLocation={initialLocation || undefined}
                        currentLocation={location}
                        style={styles.fullMap}
                        onMapRef={handleMapRef}
                    >
                        {/* Render MapPins - Show search results if searching, otherwise show random recommendations */}
                        {searchResults.length > 0 ? (
                            // Show search results when searching
                            searchResults.map((locationDetails) => (
                                <MapPin
                                    key={`search_${locationDetails.id}`}
                                    location={locationDetails}
                                    onPress={handleMapPinSelect}
                                    onCenterMap={handleCenterMap}
                                    isSelected={selectedLocationDetails?.id === locationDetails.id}
                                    size="medium"
                                />
                            ))
                        ) : filterResults.length > 0 ? (
                            filterResults.map((locationDetails) => (
                                <MapPin
                                    key={`filter_${locationDetails.id}`}
                                    location={locationDetails}
                                    onPress={handleMapPinSelect}
                                    onCenterMap={handleCenterMap}
                                    isSelected={selectedLocationDetails?.id === locationDetails.id}
                                    size="medium"
                                />
                            ))
                        ) : (
                            // Show random recommendations when not searching
                            recommendations.map((locationDetails) => (
                                <MapPin
                                    key={locationDetails.id}
                                    location={locationDetails}
                                    onPress={handleMapPinSelect}
                                    onCenterMap={handleCenterMap}
                                    isSelected={selectedLocationDetails?.id === locationDetails.id}
                                    size="medium"
                                />
                            ))
                        )}
                    </MapView>

                </View>
            </TouchableWithoutFeedback>
        </MapErrorBoundary>
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
        right: 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
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
        minHeight: 55,
    },
    filterFloating: {
        position: 'absolute',
        top: 50,
        right: 16,
        width: 55,
        height: 55,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.75,
        shadowRadius: 12,
        elevation: 12,
        zIndex: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 4,
        color: '#000000',
    },
    searchButton: {
        marginLeft: 8,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
    },
    controlButtons: {
        flexDirection: 'column',
        gap: 16,
    },
    homeButton: {
        width: 55,
        height: 55,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.75,
        shadowRadius: 12,
        elevation: 12,
        zIndex: 1,
        overflow: 'hidden',
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullMap: {
        flex: 1,
    },
});
