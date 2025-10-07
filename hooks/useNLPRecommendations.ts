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

    // Generate session ID in UUID format (same as useRandomRecommendations)
    const generateSessionId = useCallback(() => {
        // Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }, []);

    // Search using NLP
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

            console.log('🔍 [useNLPRecommendations] Request:', requestData);

            const response = await locationService.getNLPRecommendations(requestData);

            console.log('📋 [useNLPRecommendations] Response:', response);

            if (response.status === 'success') {
                setResults(response.data);
                console.log('✅ [useNLPRecommendations] Search results:', response.data.length, 'locations');
                return response.data;
            } else {
                const errorMessage = response.message || 'Failed to get NLP recommendations';
                console.log('❌ [useNLPRecommendations] API Error:', errorMessage);
                setError(errorMessage);
                onError?.(errorMessage);
                return [];
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Network error occurred';
            console.log('💥 [useNLPRecommendations] Network Error:', {
                message: errorMessage,
                status: err.response?.status,
                data: err.response?.data,
                fullError: err
            });
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
