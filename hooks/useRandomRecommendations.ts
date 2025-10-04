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

    // Generate session ID in UUID format
    const generateSessionId = useCallback(() => {
        // Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }, []);

    // Get random recommendations
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

            console.log('🔍 [useRandomRecommendations] Request body:', JSON.stringify(requestBody, null, 2));

            const response = await locationService.getRandomRecommendations(requestBody);

            console.log('✅ [useRandomRecommendations] Response:', JSON.stringify(response, null, 2));

            if (response.status === 'success') {
                setRecommendations(response.data);
                console.log(`📍 [useRandomRecommendations] Loaded ${response.data.length} recommendations`);
                return response.data;
            } else {
                const errorMessage = response.message || 'Failed to get recommendations';
                console.log('❌ [useRandomRecommendations] API Error:', errorMessage);
                setError(errorMessage);
                onError?.(errorMessage);
                return [];
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Network error occurred';
            console.log('💥 [useRandomRecommendations] Network Error:', {
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
