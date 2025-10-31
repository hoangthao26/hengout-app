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

    const startWatching = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            // Clean up existing subscription
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
                subscriptionRef.current = null;
            }

            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: LOCATION_CONFIG.HIGH_ACCURACY,
                    timeInterval: LOCATION_CONFIG.WATCH_INTERVAL,
                    distanceInterval: LOCATION_CONFIG.DISTANCE_INTERVAL,
                },
                (locationResult) => {
                    if (!isMountedRef.current) return;

                    const locationData: LocationData = {
                        latitude: locationResult.coords.latitude,
                        longitude: locationResult.coords.longitude,
                        accuracy: locationResult.coords.accuracy || undefined,
                        timestamp: locationResult.timestamp,
                    };

                    setLocation(locationData);
                    retryCountRef.current = 0; // Reset retry count on success
                }
            );

            subscriptionRef.current = subscription;
            setIsWatching(true);

        } catch (error: any) {
            if (!isMountedRef.current) return;

            // Enterprise: Retry logic with exponential backoff
            if (retryCountRef.current < LOCATION_CONFIG.RETRY_ATTEMPTS) {
                retryCountRef.current++;
                setTimeout(() => {
                    if (isMountedRef.current) {
                        startWatching();
                    }
                }, LOCATION_CONFIG.RETRY_DELAY * retryCountRef.current);
            } else {
                setError(`Location watching failed after ${LOCATION_CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
            }
        }
    }, []); // No dependencies to prevent circular updates

    const watchLocation = useCallback(async () => {
        if (!isMountedRef.current) return;

        if (!permissionGranted) {
            const granted = await requestLocationPermission();
            if (!granted || !isMountedRef.current) return;
        }

        await startWatching();
    }, [permissionGranted, startWatching]);

    const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
        try {
            const addresses = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
            });

            if (addresses.length > 0) {
                const address = addresses[0];
                const addressParts = [
                    address.street,
                    address.district,
                    address.city,
                    address.region,
                    address.country,
                ].filter(Boolean);

                return addressParts.join(', ');
            }

            return null;
        } catch (error: any) {
            // Enterprise: Remove console.error in production
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
