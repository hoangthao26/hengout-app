import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { ActivityResult } from '../types/activity';

export interface CreateActivityRequest {
    conversationId: string;
    name: string;
    purpose: string;
    latitude: number;
    longitude: number;
}

export interface ActivityResponse {
    id: string;
    name: string;
    purpose: string;
    status: string;
    submitStartTime: string;
    submitEndTime: string;
    voteStartTime: string;
    voteEndTime: string;
    createdBy: string;
    createdAt: string;
}

export interface CreateActivityResponse {
    status: string;
    data: ActivityResponse;
    message: string;
    errorCode: number;
}

class ActivityService {
    private readonly baseUrl = SERVICES_CONFIG.SOCIAL_SERVICE.BASE_URL;

    /**
     * Create a new activity
     * POST /api/v1/activities
     */
    async createActivity(activityData: CreateActivityRequest): Promise<CreateActivityResponse> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'CREATE_ACTIVITY');
            const response = await axiosInstance.post<CreateActivityResponse>(endpoint, activityData);

            return response.data;
        } catch (error: any) {
            if (error.message?.includes('User logged out')) {
                throw new Error('User logged out');
            }
            console.error('[ActivityService] Failed to create activity:', error);

            throw new Error(error.response?.data?.message || 'Failed to create activity');
        }
    }

    /**
     * Get activities for a conversation
     * GET /api/v1/activities/conversation/{conversationId}
     */
    async getActivitiesByConversation(conversationId: string): Promise<ActivityResponse[]> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'GET_CONVERSATION_ACTIVITIES', { conversationId });
            const response = await axiosInstance.get<ActivityResponse[]>(endpoint);
            return response.data;
        } catch (error: any) {
            // DEFENSIVE: Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                return [];
            }
            console.error(`[ActivityService] Failed to get activities for conversation ${conversationId}:`, error);
            throw new Error(error.response?.data?.message || 'Failed to fetch activities');
        }
    }

    /**
     * Get activity by ID
     * GET /api/v1/activities/{activityId}
     */
    async getActivityById(activityId: string): Promise<ActivityResponse> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'GET_ACTIVITY_BY_ID', { activityId });
            const response = await axiosInstance.get<ActivityResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`[ActivityService] Failed to get activity ${activityId}:`, error);
            throw new Error(error.response?.data?.message || 'Failed to fetch activity');
        }
    }

    /**
     * Update activity
     * PUT /api/v1/activities/{activityId}
     */
    async updateActivity(activityId: string, updateData: Partial<CreateActivityRequest>): Promise<ActivityResponse> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'UPDATE_ACTIVITY', { activityId });
            const response = await axiosInstance.put<ActivityResponse>(endpoint, updateData);
            return response.data;
        } catch (error: any) {
            console.error(`[ActivityService] Failed to update activity ${activityId}:`, error);
            throw new Error(error.response?.data?.message || 'Failed to update activity');
        }
    }

    /**
     * Delete activity
     * DELETE /api/v1/activities/{activityId}
     */
    async deleteActivity(activityId: string): Promise<void> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'DELETE_ACTIVITY', { activityId });
            await axiosInstance.delete(endpoint);
        } catch (error: any) {
            console.error(`[ActivityService] Failed to delete activity ${activityId}:`, error);
            throw new Error(error.response?.data?.message || 'Failed to delete activity');
        }
    }

    /**
     * Submit activity preference
     * POST /api/v1/activities/preferences
     */
    async submitActivityPreference(preferenceData: {
        activityId: string;
        contentType: 'NLP';
        nlpText: string;
    }): Promise<{ message: string }> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'SUBMIT_ACTIVITY_PREFERENCE');
            const response = await axiosInstance.post<{ message: string }>(endpoint, preferenceData);

            return response.data;
        } catch (error: any) {
            if (error.message?.includes('User logged out')) {
                throw new Error('User logged out');
            }
            console.error('[ActivityService] Failed to submit activity preference:', error);

            throw new Error(error.response?.data?.message || 'Failed to submit activity preference');
        }
    }

    /**
     * Get activity suggestions for voting
     * GET /api/activities/{activityId}/suggestions
     */
    async getActivitySuggestions(activityId: string): Promise<{
        status: string;
        data: Array<{
            id: string;
            activityId: string;
            location: {
                id: string;
                name: string;
                address: string;
                categories: string[];
                tags: string[];
                imageUrls: string[];
                lat: number;
                lng: number;
            };
            acceptCount: number;
            rejectCount: number;
            hasUserVoted: boolean;
            userVoteType: string;
        }>;
        message: string;
        errorCode: number;
    }> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'GET_ACTIVITY_SUGGESTIONS', { activityId });
            const response = await axiosInstance.get(endpoint);

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Failed to get activity suggestions:', error);
            throw error;
        }
    }

    /**
     * Vote for an activity suggestion
     * POST /api/activities/{activityId}/suggestions/{suggestionId}/vote
     */
    async voteForSuggestion(activityId: string, suggestionId: string, voteType: 'ACCEPT' | 'REJECT'): Promise<{
        status: string;
        data: string;
        message: string;
        errorCode: number;
    }> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'VOTE_FOR_SUGGESTION');
            const response = await axiosInstance.post(endpoint, {
                activityId,
                suggestionId,
                voteType
            });

            return response.data;
        } catch (error: any) {
            // Handle case where user already voted
            if (error.response?.status === 409 || error.response?.status === 400) {
                // User already voted, treat as success
                return { status: 'success', data: 'Vote already submitted', message: 'Already voted', errorCode: 0 };
            }
            console.error('[ActivityService] Failed to vote for suggestion:', error);
            throw error;
        }
    }

    /**
     * Get activity result
     */
    async getActivityResult(activityId: string): Promise<{
        status: string;
        data: ActivityResult;
        message: string;
        errorCode: number;
    }> {
        try {
            const url = buildEndpointUrl('ACTIVITIES_BASE_URL', 'GET_ACTIVITY_RESULT', { activityId });
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Failed to get activity result:', error);
            throw error;
        }
    }

    /**
     * Get conversation activities with pagination
     */
    async getConversationActivities(
        conversationId: string,
        page: number = 0,
        size: number = 20
    ): Promise<{
        status: string;
        data: Array<{
            id: string;
            name: string;
            purpose: string;
            status: 'ON_GOING' | 'ANALYZING' | 'VOTING' | 'COMPLETED';
            submitStartTime: string;
            submitEndTime: string;
            voteStartTime?: string;
            voteEndTime?: string;
            createdBy: string;
            creatorName: string;
            creatorAvatar: string;
            hasSubmitted?: boolean;
            createdAt: string;
        }>;
        message: string;
        errorCode: number;
    }> {
        try {
            const endpoint = buildEndpointUrl('ACTIVITIES_BASE_URL', 'GET_CONVERSATION_ACTIVITIES', { conversationId });
            const response = await axiosInstance.get(endpoint, {
                params: { page, size }
            });

            return response.data;
        } catch (error) {
            console.error('[ActivityService] Error getting conversation activities:', error);
            throw error;
        }
    }
}

export const activityService = new ActivityService();