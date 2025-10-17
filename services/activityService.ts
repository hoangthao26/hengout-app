import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import {
    Activity,
    ActivitySuggestion,
    ActivityPreference,
    ActivityResult,
    ActivityVoteRequest,
    PaginatedActivityResponse,
    ActivityResponse,
    ActivitiesResponse,
    PaginatedActivitiesResponse,
    ActivitySuggestionsResponse,
    ActivityResultResponse,
    ActivityPreferenceResponse,
    ActivityVoteResponse,
    GetActivitiesRequest,
    GetActivitySuggestionsRequest,
    SubmitActivityPreferenceRequest,
    VoteForSuggestionRequest,
    CreateActivityRequest
} from '../types/activity';


class ActivityService {
    private readonly baseUrl = SERVICES_CONFIG.SOCIAL_SERVICE.BASE_URL;

    /**
     * Get activity details by ID
     * GET /api/activities/{activityId}
     */
    async getActivityById(activityId: string): Promise<ActivityResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_ACTIVITY_BY_ID').replace(':activityId', activityId);
            const response = await axiosInstance.get<ActivityResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get activity ${activityId}:`, error);
            throw error;
        }
    }

    /**
     * Get all activities in a conversation with pagination
     * GET /api/activities/conversation/{conversationId}
     */
    async getConversationActivities(
        conversationId: string,
        page: number = 0,
        size: number = 20
    ): Promise<PaginatedActivitiesResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_CONVERSATION_ACTIVITIES').replace(':conversationId', conversationId);
            const response = await axiosInstance.get<PaginatedActivitiesResponse>(endpoint, {
                params: { page, size }
            });

            // Handle server response with errorCode but success status
            if (response.data.status === 'success') {
                console.log(`✅ Successfully loaded ${response.data.data.content.length} activities for conversation ${conversationId}`);
                return response.data;
            } else {
                console.error(`❌ Server error for conversation ${conversationId}:`, response.data.message);
                throw new Error(response.data.message || 'Failed to get activities');
            }
        } catch (error: any) {
            console.error(`Failed to get activities for conversation ${conversationId}:`, error);
            throw error;
        }
    }

    /**
     * Get voting suggestions for an activity
     * GET /api/activities/{activityId}/suggestions
     */
    async getActivitySuggestions(activityId: string): Promise<ActivitySuggestionsResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_ACTIVITY_SUGGESTIONS').replace(':activityId', activityId);
            const response = await axiosInstance.get<ActivitySuggestionsResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get suggestions for activity ${activityId}:`, error);
            throw error;
        }
    }

    /**
     * Get the final result of a completed activity
     * GET /api/activities/{activityId}/result
     */
    async getActivityResult(activityId: string): Promise<ActivityResultResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'GET_ACTIVITY_RESULT').replace(':activityId', activityId);
            const response = await axiosInstance.get<ActivityResultResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get result for activity ${activityId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new activity
     * POST /api/activities
     */
    async createActivity(activityData: CreateActivityRequest): Promise<ActivityResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'CREATE_ACTIVITY');
            const response = await axiosInstance.post<ActivityResponse>(endpoint, activityData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to create activity:', error);
            throw error;
        }
    }

    /**
     * Submit user preference for an activity
     * POST /api/activities/preferences
     */
    async submitActivityPreference(preferenceData: SubmitActivityPreferenceRequest): Promise<ActivityPreferenceResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'SUBMIT_ACTIVITY_PREFERENCE');
            const response = await axiosInstance.post<ActivityPreferenceResponse>(endpoint, preferenceData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to submit activity preference:', error);
            throw error;
        }
    }

    /**
     * Vote for a suggestion in an activity
     * POST /api/activities/vote
     */
    async voteForSuggestion(voteData: VoteForSuggestionRequest): Promise<ActivityVoteResponse> {
        try {
            const endpoint = buildEndpointUrl('SOCIAL_SERVICE', 'VOTE_FOR_SUGGESTION');
            const response = await axiosInstance.post<ActivityVoteResponse>(endpoint, voteData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to vote for suggestion:', error);
            throw error;
        }
    }

}

export const activityService = new ActivityService();
export default activityService;
