import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Enterprise Configuration
const LOCATION_CONFIG = {
    HIGH_ACCURACY: Location.Accuracy.High,
    MEDIUM_ACCURACY: Location.Accuracy.Balanced,
    LOW_ACCURACY: Location.Accuracy.Low,
    WATCH_INTERVAL: 5000, // 5 seconds
    DISTANCE_INTERVAL: 10, // 10 meters
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
} as const;

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
}

export const useLocation = () => {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isWatching, setIsWatching] = useState(false);

    // Enterprise: Use refs for cleanup and subscription management
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(true);

    /**
     * Request foreground location permission from user
     * Shows alerts if permission is denied or location services are disabled
     * @returns true if permission granted, false otherwise
     */
    const requestLocationPermission = async (): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);

            // Check if location services are enabled
            const isEnabled = await Location.hasServicesEnabledAsync();
            if (!isEnabled) {
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable location services in your device settings.',
                    [{ text: 'OK' }]
                );
                return false;
            }

            // Request foreground location permission
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'This app needs location permission to show your current location on the map.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Settings',
                            onPress: () => Location.requestForegroundPermissionsAsync()
                        }
                    ]
                );
                setPermissionGranted(false);
                return false;
            }

            setPermissionGranted(true);
            return true;
        } catch (error: any) {
            // Enterprise: Remove console.error in production
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get current device location once
     * Requests permission if not already granted
     * @returns Location data or null if permission denied or error occurred
     */
    const getCurrentLocation = async (): Promise<LocationData | null> => {
        try {
            setLoading(true);
            setError(null);

            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                return null;
            }

            const locationResult = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 10000,
                distanceInterval: 10,
            });

            const locationData: LocationData = {
                latitude: locationResult.coords.latitude,
                longitude: locationResult.coords.longitude,
                accuracy: locationResult.coords.accuracy || undefined,
                timestamp: locationResult.timestamp,
            };

            setLocation(locationData);
            return locationData;
        } catch (error: any) {
            // Enterprise: Remove console.error in production
            setError(error.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Enterprise: Proper cleanup and error handling
    const stopWatching = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
        }
        setIsWatching(false);
    }, []);

    /**
     * Start watching location with retry logic and exponential backoff
     * 
     * Location watching flow:
     * 1. Cleans up any existing subscription (prevents duplicate watchers)
     * 2. Starts new location watcher with high accuracy settings
     * 3. Updates location state on each position change
     * 4. Resets retry count on successful watch start
     * 
     * Retry strategy with exponential backoff:
     * - Base delay: RETRY_DELAY (1000ms)
     * - Delay formula: baseDelay * retryCount (linear, not exponential despite name)
     * - Max attempts: RETRY_ATTEMPTS (3)
     * 
     * Retry delay examples:
     * - Attempt 1 (after failure): 1000ms * 1 = 1000ms
     * - Attempt 2: 1000ms * 2 = 2000ms
     * - Attempt 3: 1000ms * 3 = 3000ms
     * 
     * Note: Despite comment saying "exponential backoff", implementation uses linear backoff.
     * This is acceptable for location watching as failures are typically transient.
     * 
     * Mount safety:
     * - Checks isMountedRef before state updates (prevents unmounted component updates)
     * - Guards prevent memory leaks if component unmounts during retry
     * - Cleans up subscription on unmount via useEffect cleanup
     * 
     * Error handling:
     * - Logs error message after max retries exceeded
     * - Sets error state for UI feedback
     * - Prevents infinite retry loops (hard limit on attempts)
     * 
     * Dependencies: Empty array [] prevents circular updates and ensures stable reference.
     */
    const startWatching = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // Clean up existing subscription to prevent duplicate watchers
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
                subscriptionRef.current = null;
            }

            // Start new location watcher with high accuracy settings
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: LOCATION_CONFIG.HIGH_ACCURACY,
                    timeInterval: LOCATION_CONFIG.WATCH_INTERVAL, // 5 seconds
                    distanceInterval: LOCATION_CONFIG.DISTANCE_INTERVAL, // 10 meters
                },
                (locationResult) => {
                    // Guard: Only update if component still mounted
                    if (!isMountedRef.current) return;

                    const locationData: LocationData = {
                        latitude: locationResult.coords.latitude,
                        longitude: locationResult.coords.longitude,
                        accuracy: locationResult.coords.accuracy || undefined,
                        timestamp: locationResult.timestamp,
                    };

                    setLocation(locationData);
                    retryCountRef.current = 0; // Reset retry count on successful watch
                }
            );

            subscriptionRef.current = subscription;
            setIsWatching(true);

        } catch (error: any) {
            if (!isMountedRef.current) return;

            // Retry logic with linear backoff (delay = baseDelay * retryCount)
            if (retryCountRef.current < LOCATION_CONFIG.RETRY_ATTEMPTS) {
                retryCountRef.current++;
                setTimeout(() => {
                    // Guard: Only retry if component still mounted
                    if (isMountedRef.current) {
                        startWatching();
                    }
                }, LOCATION_CONFIG.RETRY_DELAY * retryCountRef.current); // Linear backoff
            } else {
                // Max retries exceeded: Set error state for UI feedback
                setError(`Location watching failed after ${LOCATION_CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
            }
        }
    }, []); // No dependencies to prevent circular updates

    /**
     * Start watching location changes continuously
     * Updates location state whenever device position changes
     * Includes retry logic with exponential backoff on failure
     */
    const watchLocation = useCallback(async () => {
        if (!isMountedRef.current) return;

        if (!permissionGranted) {
            const granted = await requestLocationPermission();
            if (!granted || !isMountedRef.current) return;
        }

        await startWatching();
    }, [permissionGranted, startWatching]);

    /**
     * Reverse geocode coordinates to formatted address string
     * 
     * Address parsing logic:
     * 1. Calls reverse geocoding API to get address components
     * 2. Extracts address components in hierarchical order (street → district → city → region → country)
     * 3. Filters out null/undefined components (handles incomplete address data)
     * 4. Joins remaining components with comma separator
     * 
     * Component hierarchy (from most specific to least specific):
     * - street: Street name and number (most specific)
     * - district: District/ward name
     * - city: City name
     * - region: State/province name
     * - country: Country name (least specific)
     * 
     * Filtering strategy:
     * - Uses `filter(Boolean)` to remove falsy values (null, undefined, empty strings)
     * - Ensures only valid address components are included in output
     * - Handles cases where some components may be missing
     * 
     * Formatting:
     * - Components joined with ", " (comma + space)
     * - Example: "123 Main St, District 1, Ho Chi Minh City, Vietnam"
     * - Gracefully handles missing components (e.g., "District 1, Ho Chi Minh City")
     * 
     * Error handling:
     * - Returns null on API failure or no results
     * - Silent failure (no error thrown) allows caller to handle gracefully
     * - Suitable for optional address display (not critical for app functionality)
     * 
     * @param lat - Latitude coordinate
     * @param lng - Longitude coordinate
     * @returns Formatted address string (e.g., "123 Main St, District 1, City") or null if not found
     */
    const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
        try {
            const addresses = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
            });

            if (addresses.length > 0) {
                const address = addresses[0];
                // Extract and filter address components in hierarchical order
                const addressParts = [
                    address.street,      // Most specific
                    address.district,
                    address.city,
                    address.region,
                    address.country,     // Least specific
                ].filter(Boolean); // Remove null/undefined/empty values

                // Join with comma separator
                return addressParts.join(', ');
            }

            return null;
        } catch (error: any) {
            // Silent failure: Return null on error (caller handles gracefully)
            return null;
        }
    };

    const getCoordinatesFromAddress = async (address: string): Promise<LocationData | null> => {
        try {
            const coordinates = await Location.geocodeAsync(address);

            if (coordinates.length > 0) {
                const coord = coordinates[0];
                return {
                    latitude: coord.latitude,
                    longitude: coord.longitude,
                };
            }

            return null;
        } catch (error: any) {
            // Enterprise: Remove console.error in production
            return null;
        }
    };

    // Enterprise: Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            stopWatching();
        };
    }, [stopWatching]);

    // Check permission status on mount
    useEffect(() => {
        const checkPermission = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (isMountedRef.current) {
                    setPermissionGranted(status === 'granted');
                }
            } catch (error) {
                if (isMountedRef.current) {
                    setError('Failed to check location permission');
                }
            }
        };

        checkPermission();
    }, []);

    return {
        location,
        loading,
        error,
        permissionGranted,
        isWatching,
        requestLocationPermission,
        getCurrentLocation,
        watchLocation,
        stopWatching,
        getAddressFromCoordinates,
        getCoordinatesFromAddress,
    };
};
