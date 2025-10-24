// ============================================================================
// LOCATION SERVICE
// ============================================================================

import axiosInstance from '../config/axios';
import {
    buildEndpointUrl,
    SERVICES_CONFIG
} from '../config/services';
import {
    LocationDetailsResponse,
    LocationReviewsResponse,
    LocationRecommendationsResponse,
    UserVibesResponse,
    InitVibesResponse,
    RandomRecommendationsRequest,
    NLPRecommendationsRequest,
    FilteredRecommendationsRequest
} from '../types/location';

class LocationService {
    private readonly baseUrl = SERVICES_CONFIG.LOCATION_SERVICE.BASE_URL;
    // Simple in-memory cache for small app usage
    private reviewsCache = new Map<string, { timestamp: number; data: LocationReviewsResponse }>();
    private inflightReviews = new Map<string, Promise<LocationReviewsResponse>>();
    private static readonly REVIEWS_TTL_MS = 2 * 60 * 1000; // 2 minutes

    // ============================================================================
    // LOCATION DETAILS
    // ============================================================================

    /**
     * Get detailed information about a specific location by ID
     * GET /api/v1/recommendation/locations/{locationId}
     */
    async getLocationDetails(locationId: string): Promise<LocationDetailsResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GET_LOCATION_DETAILS')
                .replace(':locationId', locationId);
            const response = await axiosInstance.get<LocationDetailsResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get location details ${locationId}:`, error);
            throw error;
        }
    }

    /**
     * Get paginated reviews for a specific location
     * GET /api/v1/recommendation/locations/{locationId}/reviews
     */
    async getLocationReviews(
        locationId: string,
        page: number = 0,
        size: number = 10
    ): Promise<LocationReviewsResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GET_LOCATION_REVIEWS')
                .replace(':locationId', locationId);
            const response = await axiosInstance.get<LocationReviewsResponse>(endpoint, {
                params: { page, size }
            });
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get location reviews ${locationId}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================

    /**
     * Get random location recommendations
     * POST /api/v1/recommendation/random
     */
    async getRandomRecommendations(
        request: RandomRecommendationsRequest
    ): Promise<LocationRecommendationsResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GET_RANDOM_RECOMMENDATIONS');
            const response = await axiosInstance.post<LocationRecommendationsResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get random recommendations');
            throw error;
        }
    }

    /**
     * Get location recommendations using natural language processing
     * POST /api/v1/recommendation/nlp
     */
    async getNLPRecommendations(
        request: NLPRecommendationsRequest
    ): Promise<LocationRecommendationsResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GET_NLP_RECOMMENDATIONS');
            const response = await axiosInstance.post<LocationRecommendationsResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get NLP recommendations:', error);
            throw error;
        }
    }

    /**
     * Get location recommendations using structured filters
     * POST /api/v1/recommendation/filter
     */
    async getFilteredRecommendations(
        request: FilteredRecommendationsRequest
    ): Promise<LocationRecommendationsResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GET_FILTERED_RECOMMENDATIONS');
            const response = await axiosInstance.post<LocationRecommendationsResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get filtered recommendations:', error);
            throw error;
        }
    }

    // ============================================================================
    // USER VIBES
    // ============================================================================

    /**
     * Get current vibes for user
     * GET /api/v1/recommendation/current-vibes
     */
    async getCurrentVibes(): Promise<UserVibesResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GET_CURRENT_VIBES');
            const response = await axiosInstance.get<UserVibesResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get current vibes:', error);
            throw error;
        }
    }

    /**
     * Initialize current vibes for user
     * POST /api/v1/recommendation/current-vibes/init
     */
    async initCurrentVibes(): Promise<InitVibesResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'INIT_CURRENT_VIBES');
            const response = await axiosInstance.post<InitVibesResponse>(endpoint);
            try {
                console.log('✅ [LocationService] initCurrentVibes success:', response.data?.status || 'unknown');
            } catch { }
            return response.data;
        } catch (error: any) {
            console.error('Failed to initialize current vibes:', error);
            throw error;
        }
    }

    /**
     * Generate new current vibes for user
     * POST /api/v1/recommendation/current-vibes/new
     */
    async generateNewVibes(): Promise<UserVibesResponse> {
        try {
            const endpoint = buildEndpointUrl('LOCATION_SERVICE', 'GENERATE_NEW_VIBES');
            const response = await axiosInstance.post<UserVibesResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to generate new vibes:', error);
            throw error;
        }
    }

    /**
     * Get reviews with simple in-memory cache and request de-duplication
     */
    async getLocationReviewsCached(
        locationId: string,
        page: number = 0,
        size: number = 10
    ): Promise<LocationReviewsResponse> {
        const cacheKey = `${locationId}:${page}:${size}`;
        const now = Date.now();
        const cached = this.reviewsCache.get(cacheKey);
        if (cached && now - cached.timestamp < LocationService.REVIEWS_TTL_MS) {
            return cached.data;
        }

        const inflightKey = cacheKey;
        const existing = this.inflightReviews.get(inflightKey);
        if (existing) return existing;

        const promise = this.getLocationReviews(locationId, page, size)
            .then((data) => {
                this.reviewsCache.set(cacheKey, { timestamp: Date.now(), data });
                this.inflightReviews.delete(inflightKey);
                return data;
            })
            .catch((err) => {
                this.inflightReviews.delete(inflightKey);
                throw err;
            });

        this.inflightReviews.set(inflightKey, promise);
        return promise;
    }

    /** Prefetch reviews without awaiting (fire-and-forget), uses cache/dedupe */
    prefetchLocationReviews(locationId: string, page: number = 0, size: number = 10) {
        // Trigger but don't throw
        this.getLocationReviewsCached(locationId, page, size).catch(() => { });
    }

    /** Try get cached reviews immediately; returns null if not fresh */
    getCachedLocationReviews(
        locationId: string,
        page: number = 0,
        size: number = 10
    ): LocationReviewsResponse | null {
        const cacheKey = `${locationId}:${page}:${size}`;
        const cached = this.reviewsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < LocationService.REVIEWS_TTL_MS) {
            return cached.data;
        }
        return null;
    }
}

// Export singleton instance
export const locationService = new LocationService();
