// ============================================================================
// LOCATION TYPES
// ============================================================================

export interface LocationContact {
    id: string;
    value: string;
    type: string;
    description: string;
    isMain: boolean;
    displayOrder: number;
}

export interface LocationDetails {
    id: string;
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    totalRating: number;
    categories: string[];
    purposes: string[];
    tags: string[];
    imageUrls: string[];
    contacts: LocationContact[];
}

export interface LocationReview {
    id: string;
    text: string;
    origin: 'GOOGLE' | 'FACEBOOK' | 'YELP' | 'INTERNAL';
    imageUrls: string[];
}

export interface PaginatedReviews {
    totalElements: number;
    totalPages: number;
    size: number;
    content: LocationReview[];
    number: number;
    sort: {
        empty: boolean;
        sorted: boolean;
        unsorted: boolean;
    };
    first: boolean;
    last: boolean;
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
    empty: boolean;
}

export interface UserVibe {
    id: string;
    userId: string;
    batchId: string;
    description: string;
    categories: string[];
    purposes: string[];
    tags: string[];
    isNewest: boolean;
}

// Request Types
export interface RandomRecommendationsRequest {
    sessionId: string;
    latitude: number;
    longitude: number;
    address: string;
}

export interface NLPRecommendationsRequest {
    sessionId: string;
    nlp: string;
    latitude: number;
    longitude: number;
}

export interface FilteredRecommendationsRequest {
    sessionId: string;
    categories?: string[];
    purposes?: string[];
    tags?: string[];
    latitude: number;
    longitude: number;
    address: string;
}

// Response Types
export interface LocationServiceResponse<T> {
    status: 'success' | 'error';
    data: T;
    message: string;
    errorCode: number;
}

export type LocationDetailsResponse = LocationServiceResponse<LocationDetails>;
export type LocationReviewsResponse = LocationServiceResponse<PaginatedReviews>;
export type LocationRecommendationsResponse = LocationServiceResponse<LocationDetails[]>;
export type UserVibesResponse = LocationServiceResponse<UserVibe[]>;
export type InitVibesResponse = LocationServiceResponse<{}>;
