import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { BaseApiResponse } from '../types/api';
import {
    BlockFriendResponse,
    Friend,
    GetFriendsResponse,
    GetSentRequestsResponse,
    HandleRequestResponse,
    PendingRequestsResponse,
    RemoveFriendResponse,
    SentFriendRequest
} from '../types/social';
import { SearchResponse } from '../types/userSearch';

class SocialService {
    private readonly baseUrl = SERVICES_CONFIG.SOCIAL_SERVICE.BASE_URL;

    /**
     * Get pending friend requests
     * GET /api/v1/friendship/requests/pending
     */
    async getPendingFriendRequests(): Promise<PendingRequestsResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_PENDING_REQUESTS');
            const response = await axiosInstance.get<PendingRequestsResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('[SocialService] Failed to get pending friend requests:', error);
            throw error;
        }
    }

    /**
     * Handle friend request (accept or reject)
     * PUT /api/v1/friendship/request/{id}
     */
    async handleFriendRequest(
        friendRequestId: string,
        status: 'ACCEPTED' | 'REJECTED'
    ): Promise<HandleRequestResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'HANDLE_FRIEND_REQUEST').replace(':id', friendRequestId);
            const response = await axiosInstance.put<HandleRequestResponse>(
                `${endpoint}?status=${status}`
            );
            return response.data;
        } catch (error: any) {
            console.error(`[SocialService] Failed to handle friend request ${friendRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Send friend request
     * POST /api/v1/friendship/request/{friendId}
     */
    async sendFriendRequest(friendId: string): Promise<HandleRequestResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'SEND_FRIEND_REQUEST').replace(':friendId', friendId);
            const response = await axiosInstance.post<HandleRequestResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`[SocialService] Failed to send friend request to ${friendId}:`, error);
            throw error;
        }
    }

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
            console.error('[SocialService] Failed to get friends list:', error);
            throw error;
        }
    }

    /**
     * Remove friend
     * DELETE /api/v1/friendship/{friendId}
     */
    async removeFriend(friendId: string): Promise<RemoveFriendResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'REMOVE_FRIEND').replace(':friendId', friendId);
            const response = await axiosInstance.delete<RemoveFriendResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`[SocialService] Failed to remove friend ${friendId}:`, error);
            throw error;
        }
    }

    /**
     * Get sent friend requests
     * GET /api/v1/friendship/requests/sent
     */
    async getSentFriendRequests(): Promise<SentFriendRequest[]> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_SENT_REQUESTS');
            const response = await axiosInstance.get<GetSentRequestsResponse>(endpoint);
            return response.data.data;
        } catch (error: any) {
            console.error('[SocialService] Failed to get sent friend requests:', error);
            throw error;
        }
    }

    /**
     * Block or unblock friend
     * PUT /api/v1/friendship/block/{friendId}
     */
    async blockFriend(friendId: string, status: 'ACTIVE' | 'BLOCKED'): Promise<BlockFriendResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'BLOCK_FRIEND').replace(':friendId', friendId);
            const response = await axiosInstance.put<BlockFriendResponse>(
                `${endpoint}?status=${status}`
            );
            return response.data;
        } catch (error: any) {
            console.error(`[SocialService] Failed to block/unblock friend ${friendId}:`, error);
            throw error;
        }
    }

    /**
     * Cancel sent friend request
     * DELETE /api/v1/friendship/request/{friendRequestId}
     */
    async cancelSentFriendRequest(friendRequestId: string): Promise<BaseApiResponse<string>> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'CANCEL_SENT_REQUEST').replace(':friendRequestId', friendRequestId);
            const response = await axiosInstance.delete<BaseApiResponse<string>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`[SocialService] Failed to cancel sent friend request ${friendRequestId}:`, error);
            throw error;
        }
    }

    /**
     * Search users with detail info (new API)
     * GET /api/v1/profile/search-detail
     */
    async searchUsersDetail(
        query: string,
        page: number = 0,
        size: number = 10
    ): Promise<SearchResponse> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'SEARCH_USERS_DETAIL');
            const response = await axiosInstance.get<SearchResponse>(endpoint, {
                params: { query, page, size }
            });
            return response.data;
        } catch (error: any) {
            console.error('[SocialService] Failed to search users:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const socialService = new SocialService();
export default socialService;
