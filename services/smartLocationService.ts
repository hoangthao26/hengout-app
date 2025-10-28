import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const LOCATION_CONFIG = {
    HIGH_ACCURACY: Location.Accuracy.High,
    MEDIUM_ACCURACY: Location.Accuracy.Balanced,
    LOW_ACCURACY: Location.Accuracy.Low,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    CACHE_DURATION: 300000, // 5 minutes
    MAX_AGE: 600000, // 10 minutes
} as const;

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
    source: 'gps' | 'network' | 'cached' | 'fallback';
}

interface LocationOptions {
    accuracy?: Location.Accuracy;
    timeout?: number;
    retries?: number;
    useCache?: boolean;
}

class SmartLocationService {
    private static instance: SmartLocationService;
    private cache: LocationData | null = null;

    static getInstance(): SmartLocationService {
        if (!SmartLocationService.instance) {
            SmartLocationService.instance = new SmartLocationService();
        }
        return SmartLocationService.instance;
    }

    /**
     * Get location with smart retry and caching
     */
    async getCurrentLocation(options: LocationOptions = {}): Promise<LocationData | null> {
        const {
            accuracy = LOCATION_CONFIG.HIGH_ACCURACY,
            timeout = 10000,
            retries = LOCATION_CONFIG.RETRY_ATTEMPTS,
            useCache = true
        } = options;

        console.log('📍 [SmartLocation] Getting current location...');

        // 1. Check cache first if enabled
        if (useCache) {
            const cachedLocation = await this.getCachedLocation();
            if (cachedLocation && !this.isLocationStale(cachedLocation)) {
                console.log('📍 [SmartLocation] Using cached location');
                return cachedLocation;
            }
        }

        // 2. Try GPS with retry
        const gpsLocation = await this.getLocationWithRetry(accuracy, timeout, retries);
        if (gpsLocation) {
            await this.cacheLocation(gpsLocation);
            return gpsLocation;
        }

        // 3. Try network location
        const networkLocation = await this.getNetworkLocation();
        if (networkLocation) {
            await this.cacheLocation(networkLocation);
            return networkLocation;
        }

        // 4. Return stale cache if available
        if (useCache && this.cache) {
            console.log('📍 [SmartLocation] Using stale cached location');
            return this.cache;
        }

        console.log('📍 [SmartLocation] No location available');
        return null;
    }

    /**
     * Get location with retry mechanism
     */
    private async getLocationWithRetry(
        accuracy: Location.Accuracy,
        timeout: number,
        retries: number
    ): Promise<LocationData | null> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`📍 [SmartLocation] GPS attempt ${attempt}/${retries}`);

                // Check if location services are enabled
                const isLocationEnabled = await Location.hasServicesEnabledAsync();
                if (!isLocationEnabled) {
                    console.log('📍 [SmartLocation] Location services disabled');
                    return null;
                }

                // Request permission
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('📍 [SmartLocation] Location permission denied');
                    return null;
                }

                // Get current position with timeout
                const location = await Promise.race([
                    Location.getCurrentPositionAsync({
                        accuracy,
                        timeInterval: timeout,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Location timeout')), timeout)
                    )
                ]);

                if (location) {
                    const locationData: LocationData = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy || undefined,
                        timestamp: Date.now(),
                        source: 'gps'
                    };

                    console.log('📍 [SmartLocation] GPS location obtained:', {
                        lat: locationData.latitude,
                        lng: locationData.longitude,
                        accuracy: locationData.accuracy,
                        source: locationData.source
                    });

                    return locationData;
                }
            } catch (error) {
                console.log(`📍 [SmartLocation] GPS attempt ${attempt} failed:`, error);

                if (attempt < retries) {
                    // Wait before retry with exponential backoff
                    const delay = LOCATION_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        return null;
    }

    /**
     * Get network-based location (IP geolocation)
     */
    private async getNetworkLocation(): Promise<LocationData | null> {
        try {
            console.log('📍 [SmartLocation] Trying network location...');

            // This would typically use a geolocation API
            // For now, we'll return null as we don't have network geolocation
            // In production, you might use services like:
            // - Google Maps Geocoding API
            // - IP Geolocation services
            // - Network cell tower location

            return null;
        } catch (error) {
            console.log('📍 [SmartLocation] Network location failed:', error);
            return null;
        }
    }

    /**
     * Cache location data
     */
    private async cacheLocation(location: LocationData): Promise<void> {
        try {
            this.cache = location;
            await AsyncStorage.setItem('smart_location_cache', JSON.stringify(location));
            console.log('📍 [SmartLocation] Location cached');
        } catch (error) {
            console.log('📍 [SmartLocation] Failed to cache location:', error);
        }
    }

    /**
     * Get cached location
     */
    private async getCachedLocation(): Promise<LocationData | null> {
        try {
            if (this.cache) {
                return this.cache;
            }

            const cached = await AsyncStorage.getItem('smart_location_cache');
            if (cached) {
                const location = JSON.parse(cached) as LocationData;
                this.cache = location;
                return location;
            }
        } catch (error) {
            console.log('📍 [SmartLocation] Failed to get cached location:', error);
        }
        return null;
    }

    /**
     * Check if location is stale
     */
    private isLocationStale(location: LocationData): boolean {
        const age = Date.now() - location.timestamp;
        return age > LOCATION_CONFIG.CACHE_DURATION;
    }

    /**
     * Get location with user choice
     */
    async getLocationWithUserChoice(): Promise<LocationData | null> {
        // Try to get location
        const location = await this.getCurrentLocation();

        if (location) {
            // Check accuracy
            if (location.accuracy && location.accuracy < 100) {
                // Good accuracy
                return location;
            } else if (location.accuracy && location.accuracy < 500) {
                // Medium accuracy - could show warning
                return location;
            } else {
                // Poor accuracy - might want to retry
                return location;
            }
        }

        return null;
    }

    /**
     * Clear location cache
     */
    async clearCache(): Promise<void> {
        try {
            this.cache = null;
            await AsyncStorage.removeItem('smart_location_cache');
            console.log('📍 [SmartLocation] Cache cleared');
        } catch (error) {
            console.log('📍 [SmartLocation] Failed to clear cache:', error);
        }
    }

    /**
     * Get fallback location (HCMC)
     */
    getFallbackLocation(): LocationData {
        return {
            latitude: 10.8231,
            longitude: 106.6297,
            accuracy: 0,
            timestamp: Date.now(),
            source: 'fallback'
        };
    }
}

export const smartLocationService = SmartLocationService.getInstance();
export default smartLocationService;
