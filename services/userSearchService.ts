import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { SearchParams, SearchResponse } from '../types/userSearch';

class UserSearchService {
    private readonly baseUrl = SERVICES_CONFIG.USER_SERVICE.BASE_URL;

    /**
     * Search users by display name with pagination
     * GET /api/v1/profile/search-detail
     */
    async searchUsers(params: SearchParams): Promise<SearchResponse> {
        try {
            const { query, page = 0, size = 10 } = params;
            const endpoint = buildEndpointUrl('USER_SERVICE', 'SEARCH_USERS_DETAIL');
            const response = await axiosInstance.get<SearchResponse>(endpoint, {
                params: { query, page, size }
            });
            return response.data;
        } catch (error: any) {
            console.error('[UserSearchService] Failed to search users:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const userSearchService = new UserSearchService();
export default userSearchService;
