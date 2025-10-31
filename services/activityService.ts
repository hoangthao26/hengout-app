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

            // Log request body for debugging
            console.log('[ActivityService] Creating activity with data:', {
                endpoint,
                baseUrl: this.baseUrl,
                fullUrl: endpoint,
                requestBody: activityData,
                timestamp: new Date().toISOString()
            });

            const response = await axiosInstance.post<CreateActivityResponse>(endpoint, activityData);

            // Log response for debugging
            console.log('[ActivityService] Activity created successfully:', {
                status: response.status,
                responseData: response.data,
                timestamp: new Date().toISOString()
            });

            return response.data;
        } catch (error: any) {
            // Log error details for debugging
            console.error('[ActivityService] Failed to create activity:', {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestData: activityData,
                timestamp: new Date().toISOString()
            });

            //Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                console.log('[ActivityService] User logged out, skipping activity creation');
                throw new Error('User logged out');
            }

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
                console.log('[ActivityService] User logged out, skipping activities fetch');
                return [];
            }
            console.error(`Failed to get activities for conversation ${conversationId}:`, error);
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
            console.error(`Failed to get activity ${activityId}:`, error);
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
            console.error(`Failed to update activity ${activityId}:`, error);
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
            console.error(`Failed to delete activity ${activityId}:`, error);
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

            console.log('[ActivityService] Submitting activity preference:', {
                endpoint,
                preferenceData,
                timestamp: new Date().toISOString()
            });

            const response = await axiosInstance.post<{ message: string }>(endpoint, preferenceData);

            console.log('[ActivityService] Activity preference submitted successfully:', {
                status: response.status,
                responseData: response.data,
                timestamp: new Date().toISOString()
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Failed to submit activity preference:', {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestData: preferenceData,
                timestamp: new Date().toISOString()
            });

            // DEFENSIVE: Don't throw error if user logged out
            if (error.message?.includes('User logged out')) {
                console.log('[ActivityService] User logged out, skipping preference submission');
                throw new Error('User logged out');
            }

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

            console.log('[ActivityService] Getting activity suggestions:', {
                endpoint,
                activityId,
                timestamp: new Date().toISOString()
            });

            const response = await axiosInstance.get(endpoint);

            console.log('[ActivityService] Activity suggestions retrieved successfully:', {
                response: response.data,
                timestamp: new Date().toISOString()
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Failed to get activity suggestions:', {
                error: error.response?.data || error.message,
                activityId,
                timestamp: new Date().toISOString()
            });
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

            console.log('[ActivityService] Voting for suggestion:', {
                endpoint,
                activityId,
                suggestionId,
                voteType,
                timestamp: new Date().toISOString()
            });

            const response = await axiosInstance.post(endpoint, {
                activityId,
                suggestionId,
                voteType
            });

            console.log('[ActivityService] Vote submitted successfully:', {
                response: response.data,
                timestamp: new Date().toISOString()
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Failed to vote for suggestion:', {
                error: error.response?.data || error.message,
                activityId,
                suggestionId,
                voteType,
                timestamp: new Date().toISOString()
            });

            // Don't throw 409 errors (already voted) - just log and return
            if (error.response?.status === 409) {
                console.log('[ActivityService] User already voted, treating as success');
                return {
                    status: 'success',
                    data: 'Already voted',
                    message: 'User already voted for this suggestion',
                    errorCode: 0
                };
            }

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
            console.log('[ActivityService] Getting activity result:', {
                activityId,
                timestamp: new Date().toISOString()
            });

            const url = buildEndpointUrl('ACTIVITIES_BASE_URL', 'GET_ACTIVITY_RESULT', { activityId });
            const response = await axiosInstance.get(url);

            console.log('[ActivityService] Activity result retrieved successfully:', {
                activityId,
                totalSuggestions: response.data.data?.suggestions?.length || 0,
                totalParticipants: response.data.data?.totalParticipants || 0,
                totalVotes: response.data.data?.totalVotes || 0,
                timestamp: new Date().toISOString()
            });

            return response.data;
        } catch (error: any) {
            console.error('[ActivityService] Failed to get activity result:', {
                error: error.response?.data || error.message,
                activityId,
                timestamp: new Date().toISOString()
            });

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
            console.error('Error getting conversation activities:', error);
            throw error;
        }
    }
}

export const activityService = new ActivityService();