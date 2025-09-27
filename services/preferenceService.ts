import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { PreferenceResponse, UserPreferences } from '../types/preference';

class PreferenceService {
    private readonly baseUrl = SERVICES_CONFIG.USER_SERVICE.BASE_URL;

    /**
     * Get user preferences
     * GET /api/v1/preference
     */
    async getUserPreferences(): Promise<PreferenceResponse> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'PREFERENCES');
            const response = await axiosInstance.get<PreferenceResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get user preferences:', error);
            throw error;
        }
    }

    /**
     * Update user preferences
     * PUT /api/v1/preference
     */
    async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<PreferenceResponse> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'UPDATE_PREFERENCES');
            const response = await axiosInstance.put<PreferenceResponse>(endpoint, preferences);
            return response.data;
        } catch (error: any) {
            console.error('Failed to update user preferences:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const preferenceService = new PreferenceService();
export default preferenceService;
