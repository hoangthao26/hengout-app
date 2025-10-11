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

    const generateSessionId = useCallback(() => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
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



