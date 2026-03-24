import { useState, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { LocationDetails } from '../types/location';

interface UseNLPRecommendationsProps {
    onError?: (error: string) => void;
}

export const useNLPRecommendations = ({ onError }: UseNLPRecommendationsProps = {}) => {
    const [results, setResults] = useState<LocationDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Generate UUID v4 session ID for tracking NLP recommendation requests
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
     * - Suitable for session tracking across multiple requests
     * 
     * @returns UUID v4 formatted string
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
     * Search locations using natural language processing
     * Parses user query to find relevant locations nearby
     * @param query - Natural language search query (e.g., "cà phê gần đây")
     * @param coordinates - User's current coordinates
     * @returns Array of matching location recommendations
     */
    const search = useCallback(async (
        query: string,
        { lat, lng }: { lat: number; lng: number }
    ) => {
        if (!query.trim()) {
            setResults([]);
            return [];
        }

        try {
            setLoading(true);
            setError(null);

            const sessionId = generateSessionId();

            const requestData = {
                sessionId,
                nlp: query.trim(),
                latitude: lat,
                longitude: lng,
            };

            const response = await locationService.getNLPRecommendations(requestData);

            if (response.status === 'success') {
                setResults(response.data);
                return response.data;
            } else {
                const errorMessage = response.message || 'Failed to get NLP recommendations';
                setError(errorMessage);
                onError?.(errorMessage);
                return [];
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Network error occurred';
            console.error('[useNLPRecommendations] Network error:', err);
            setError(errorMessage);
            onError?.(errorMessage);
            return [];
        } finally {
            setLoading(false);
        }
    }, [generateSessionId, onError]);

    // Clear results
    const clear = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);

    return {
        results,
        loading,
        error,
        search,
        clear,
    };
};
