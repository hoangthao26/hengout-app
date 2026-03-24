import { useState, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { LocationDetails } from '../types/location';

interface UseRandomRecommendationsProps {
    onError?: (error: string) => void;
}

export const useRandomRecommendations = ({ onError }: UseRandomRecommendationsProps = {}) => {
    const [recommendations, setRecommendations] = useState<LocationDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Generate UUID v4 session ID for tracking random recommendation requests
     * 
     * UUID v4 generation algorithm:
     * 1. Template: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
     * 2. For 'x': Random hex digit (0-9, a-f)
     * 3. For 'y': Random hex digit with variant bits set (8, 9, a, b)
     * 4. Version field (4th group): Always starts with '4' (UUID v4 indicator)
     * 
     * Variant bits logic (RFC 4122):
     * - y position: First hex digit must be one of: 8, 9, a, b
     * - Ensures: (r & 0x3 | 0x8) = bits 10 and 11 are set
     * - This creates valid UUID v4 variant identifier
     * 
     * Uniqueness:
     * - 122 random bits ensure high uniqueness
     * - Used for session tracking across multiple recommendation requests
     * - Enables server-side session management and caching
     * 
     * @returns UUID v4 formatted string (e.g., "550e8400-e29b-41d4-a716-446655440000")
     */
    const generateSessionId = useCallback(() => {
        // Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            // Variant bits: For 'y', ensure bits 10 and 11 are set (8, 9, a, b)
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }, []);

    /**
     * Get random location recommendations based on coordinates
     * Uses session ID for tracking and caching
     * @param latitude - User's latitude
     * @param longitude - User's longitude
     * @param address - Optional address for better recommendations
     * @returns Array of location recommendations
     */
    const getRandomRecommendations = useCallback(async (
        latitude: number,
        longitude: number,
        address?: string
    ) => {
        try {
            setLoading(true);
            setError(null);

            const sessionId = generateSessionId();

            // Prepare request body
            const requestBody = {
                sessionId,
                latitude,
                longitude,
                address: '', // Address is optional
            };

            const response = await locationService.getRandomRecommendations(requestBody);

            if (response.status === 'success') {
                setRecommendations(response.data);
                return response.data;
            } else {
                const errorMessage = response.message || 'Failed to get recommendations';
                setError(errorMessage);
                onError?.(errorMessage);
                return [];
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Network error occurred';
            console.error('[useRandomRecommendations] Network error:', err);
            setError(errorMessage);
            onError?.(errorMessage);
            return [];
        } finally {
            setLoading(false);
        }
    }, [generateSessionId, onError]);

    // Clear recommendations
    const clearRecommendations = useCallback(() => {
        setRecommendations([]);
        setError(null);
    }, []);

    // Refresh recommendations
    const refreshRecommendations = useCallback(async (
        latitude: number,
        longitude: number,
        address?: string
    ) => {
        return await getRandomRecommendations(latitude, longitude, address);
    }, [getRandomRecommendations]);

    return {
        recommendations,
        loading,
        error,
        getRandomRecommendations,
        clearRecommendations,
        refreshRecommendations,
    };
};
