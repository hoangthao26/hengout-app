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
     * Get location with multi-tier fallback strategy
     * 
     * Location acquisition strategy (priority order):
     * 1. Cached location (if valid and not stale) - fastest, no permission needed
     * 2. GPS location with retry (high accuracy, requires permission)
     * 3. Network-based location (IP geolocation, lower accuracy)
     * 4. Stale cache as last resort (better than nothing)
     * 
     * Each tier is only attempted if previous tiers fail.
     * Successful locations are cached for future requests.
     * 
     * @param options - Location options (accuracy, timeout, retries, useCache)
     * @returns LocationData with source indicator, or null if all strategies fail
     */
    async getCurrentLocation(options: LocationOptions = {}): Promise<LocationData | null> {
        const {
            accuracy = LOCATION_CONFIG.HIGH_ACCURACY,
            timeout = 10000,
            retries = LOCATION_CONFIG.RETRY_ATTEMPTS,
            useCache = true
        } = options;

        // Tier 1: Check cache first (fastest, no permission/network needed)
        if (useCache) {
            const cachedLocation = await this.getCachedLocation();
            if (cachedLocation && !this.isLocationStale(cachedLocation)) {
                return cachedLocation;
            }
        }

        // Tier 2: Try GPS with exponential backoff retry
        const gpsLocation = await this.getLocationWithRetry(accuracy, timeout, retries);
        if (gpsLocation) {
            await this.cacheLocation(gpsLocation);
            return gpsLocation;
        }

        // Tier 3: Try network-based location (IP geolocation)
        const networkLocation = await this.getNetworkLocation();
        if (networkLocation) {
            await this.cacheLocation(networkLocation);
            return networkLocation;
        }

        // Tier 4: Return stale cache as last resort (better than nothing)
        if (useCache && this.cache) {
            return this.cache;
        }

        return null;
    }

    /**
     * Get GPS location with exponential backoff retry mechanism
     * 
     * Retry strategy:
     * 1. Validates location services enabled (one-time check)
     * 2. Requests permission (required before getting location)
     * 3. Attempts location acquisition with timeout race condition
     * 4. Uses exponential backoff between retries: delay = baseDelay * 2^(attempt-1)
     * 
     * Exponential backoff examples (baseDelay=1000ms):
     * - Attempt 1: immediate
     * - Attempt 2: wait 1000ms
     * - Attempt 3: wait 2000ms
     * - Attempt 4: wait 4000ms
     * 
     * Timeout handling: Uses Promise.race to enforce timeout even if GPS takes too long.
     * 
     * @param accuracy - Location accuracy level (High, Balanced, Low)
     * @param timeout - Max time to wait for location (ms)
     * @param retries - Number of retry attempts
     * @returns LocationData if successful, null if all attempts fail
     */
    private async getLocationWithRetry(
        accuracy: Location.Accuracy,
        timeout: number,
        retries: number
    ): Promise<LocationData | null> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Check if location services are enabled (one-time validation)
                const isLocationEnabled = await Location.hasServicesEnabledAsync();
                if (!isLocationEnabled) {
                    return null; // Location services disabled, no point retrying
                }

                // Request permission (required before getting location)
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    return null; // Permission denied, no point retrying
                }

                // Get current position with timeout enforcement
                // Uses Promise.race to enforce timeout even if GPS hangs
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

                    return locationData;
                }
            } catch (error) {
                // Retry with exponential backoff (except on last attempt)
                if (attempt < retries) {
                    // Exponential backoff: delay doubles each attempt
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
            // This would typically use a geolocation API
            // For now, we'll return null as we don't have network geolocation
            // In production, you might use services like:
            // - Google Maps Geocoding API
            // - IP Geolocation services
            // - Network cell tower location

            return null;
        } catch (error) {
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
        } catch (error) {
            // Silent failure for caching
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
            // Silent failure for getting cached location
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
        } catch (error) {
            // Silent failure for clearing cache
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
