import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { Friend, GetFriendsResponse, RemoveFriendResponse } from '../types/social';

class FriendsService {
    private readonly baseUrl = SERVICES_CONFIG.SOCIAL_SERVICE.BASE_URL;

    /**
     * Get friends list
     * GET /api/v1/friendship
     */
    async getFriends(): Promise<Friend[]> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_FRIENDS');
            const response = await axiosInstance.get<GetFriendsResponse>(endpoint);
            return response.data.data;
        } catch (error: any) {
            console.error('Failed to get friends:', error);
            throw error;
        }
    }

    /**
     * Remove friend
     * DELETE /api/v1/friendship/{friendId}
     */
    async removeFriend(friendId: string): Promise<void> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'REMOVE_FRIEND').replace(':friendId', friendId);
            const response = await axiosInstance.delete<RemoveFriendResponse>(endpoint);
            // No need to return anything for void methods
        } catch (error: any) {
            console.error(`Failed to remove friend ${friendId}:`, error);
            throw error;
        }
    }
}

export const friendsService = new FriendsService();
