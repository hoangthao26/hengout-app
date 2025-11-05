import { useState, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { LocationDetails } from '../types/location';

export interface FilterRequest {
    sessionId: string;
    categories?: string[];
    purposes?: string[];
    tags?: string[];
    latitude: number;
    longitude: number;
    address: string;
}

export const useFilterRecommendations = ({ onError }: { onError?: (error: string) => void } = {}) => {
    const [results, setResults] = useState<LocationDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Generate UUID v4 session ID for tracking filtered recommendation requests
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
     * - Used for tracking filter session across multiple API calls
     * 
     * @returns UUID v4 formatted string
     */
    const generateSessionId = useCallback(() => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            // Variant bits: For 'y', ensure bits 10 and 11 are set (8, 9, a, b)
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }, []);

    const fetchByFilter = useCallback(async (payload: Omit<FilterRequest, 'sessionId'>) => {
        try {
            setLoading(true);
            setError(null);

            const request: FilterRequest = { sessionId: generateSessionId(), ...payload };

            const response = await locationService.getFilteredRecommendations(request);
            if (response.status === 'success') {
                setResults(response.data);
                return response.data;
            } else {
                const msg = response.message || 'Failed to get filtered recommendations';
                setError(msg);
                onError?.(msg);
                return [];
            }
        } catch (err: any) {
            const msg = err.message || 'Network error occurred';
            setError(msg);
            onError?.(msg);
            return [];
        } finally {
            setLoading(false);
        }
    }, [generateSessionId, onError]);

    const clear = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);

    return { results, loading, error, fetchByFilter, clear };
};



