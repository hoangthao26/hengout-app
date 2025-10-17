// ============================================================================
// ACTIVITY TYPES
// ============================================================================

// Import BaseApiResponse from api.ts to avoid conflicts
import { BaseApiResponse } from './api';

// Base Activity Type
export interface Activity {
    id: string;
    name: string;
    purpose: string;
    status: 'ON_GOING' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
    submitStartTime: string; // ISO 8601 datetime format
    submitEndTime: string; // ISO 8601 datetime format
    voteStartTime: string; // ISO 8601 datetime format
    voteEndTime: string; // ISO 8601 datetime format
    createdBy: string; // UUID format
    createdAt: string; // ISO 8601 datetime format
}

// Activity Suggestion Type
export interface ActivitySuggestion {
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
}

// Activity Result Type
export interface ActivityResult {
    activityId: string;
    activityName: string;
    activityPurpose: string;
    status: string;
    completedAt: string; // ISO 8601 datetime format
    suggestions: ActivitySuggestion[];
    winnerSuggestion: ActivitySuggestion;
    totalParticipants: number;
    totalVotes: number;
}

// Activity Preference Type
export interface ActivityPreference {
    activityId: string;
    contentType: 'NLP' | 'CATEGORY' | 'TAG';
    nlpText?: string;
    categories?: string[];
    tags?: string[];
}

// Vote Request Type
export interface ActivityVoteRequest {
    activityId: string;
    suggestionId: string;
    voteType: 'ACCEPT' | 'REJECT';
}

// Paginated Activity Response
export interface PaginatedActivityResponse {
    totalPages: number;
    totalElements: number;
    size: number;
    content: Activity[];
    number: number;
    sort: {
        empty: boolean;
        sorted: boolean;
        unsorted: boolean;
    };
    numberOfElements: number;
    pageable: {
        offset: number;
        sort: {
            empty: boolean;
            sorted: boolean;
            unsorted: boolean;
        };
        paged: boolean;
        pageNumber: number;
        pageSize: number;
        unpaged: boolean;
    };
    first: boolean;
    last: boolean;
    empty: boolean;
}

// API Request Types
export interface GetActivitiesRequest {
    conversationId: string;
    page?: number;
    size?: number;
}

export interface GetActivitySuggestionsRequest {
    activityId: string;
}

export interface SubmitActivityPreferenceRequest {
    activityId: string;
    contentType: 'NLP' | 'CATEGORY' | 'TAG';
    nlpText?: string;
    categories?: string[];
    tags?: string[];
}

export interface VoteForSuggestionRequest {
    activityId: string;
    suggestionId: string;
    voteType: string;
}

export interface CreateActivityRequest {
    conversationId: string;
    name: string;
    purpose: string;
    latitude: number;
    longitude: number;
}

// API Response Types
export interface ActivityResponse extends BaseApiResponse<Activity> { }
export interface ActivitiesResponse extends BaseApiResponse<Activity[]> { }
export interface PaginatedActivitiesResponse extends BaseApiResponse<PaginatedActivityResponse> { }
export interface ActivitySuggestionsResponse extends BaseApiResponse<ActivitySuggestion[]> { }
export interface ActivityResultResponse extends BaseApiResponse<ActivityResult> { }
export interface ActivityPreferenceResponse extends BaseApiResponse<string> { }
export interface ActivityVoteResponse extends BaseApiResponse<string> { }

// Error Types
export interface ActivityApiError {
    status: 'error';
    message: string;
    errorCode: number;
    data?: any;
}
