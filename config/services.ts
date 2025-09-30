// ============================================================================
// SERVICES CONFIGURATION
// ============================================================================

export const SERVICES_CONFIG = {
    // Authentication Service
    AUTH_SERVICE: {
        BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hengout.tranquocdat.com/auth-service/api/v1',
        ENDPOINTS: {
            LOGIN: '/auth/user/login',
            REGISTER_SEND_OTP: '/auth/user/register/send-otp',
            REGISTER_VERIFY_OTP: '/auth/user/register/verify-otp',
            REGISTER_RESEND_OTP: '/auth/user/register/resend-otp',
            GOOGLE_OAUTH: '/auth/user/oauth/google',
            FORGOT_PASSWORD_SEND_OTP: '/password/user/forgot',
            FORGOT_PASSWORD_VERIFY_OTP: '/password/forgot/confirm-otp',
            FORGOT_PASSWORD_RESET: '/password/forgot/reset',
            REFRESH_TOKEN: '/session/refresh',
            LOGOUT: '/session/logout',
        }
    },

    // User Service
    USER_SERVICE: {
        BASE_URL: process.env.EXPO_PUBLIC_USER_SERVICE_URL || 'https://hengout.tranquocdat.com/user-service/api/v1',
        ENDPOINTS: {
            PROFILE: '/profile',
            INITIALIZE_PROFILE: '/profile/initialize',
            UPDATE_PROFILE: '/profile',
            DELETE_PROFILE: '/profile/delete',
            PREFERENCES: '/preference',
            UPDATE_PREFERENCES: '/preference',
            SEARCH_USERS: '/profile/search',
            SEARCH_USERS_DETAIL: '/profile/search-detail',
            // Location Folder endpoints
            GET_ALL_FOLDERS: '/folder',
            GET_FOLDER_BY_ID: '/folder/:folderId',
            CREATE_FOLDER: '/folder',
            UPDATE_FOLDER: '/folder/:folderId',
            DELETE_FOLDER: '/folder/:folderId',
            GET_LOCATIONS_IN_FOLDER: '/folder/:folderId/locations',
            ADD_LOCATION_TO_FOLDER: '/folder/:folderId/locations',
            UPDATE_LOCATION_IN_FOLDER: '/folder/:folderId/locations/:locationId',
            REMOVE_LOCATION_FROM_FOLDER: '/folder/:folderId/locations/:locationId',
        }
    },

    // Location Service
    LOCATION_SERVICE: {
        BASE_URL: process.env.EXPO_PUBLIC_LOCATION_SERVICE_URL || 'https://hengout.tranquocdat.com/location-service/api/v1',
        ENDPOINTS: {
            // Location Details
            GET_LOCATION_DETAILS: '/recommendation/locations/:locationId',
            GET_LOCATION_REVIEWS: '/recommendation/locations/:locationId/reviews',

            // Recommendations
            GET_RANDOM_RECOMMENDATIONS: '/recommendation/random',
            GET_NLP_RECOMMENDATIONS: '/recommendation/nlp',
            GET_FILTERED_RECOMMENDATIONS: '/recommendation/filter',

            // User Vibes
            GET_CURRENT_VIBES: '/recommendation/current-vibes',
            INIT_CURRENT_VIBES: '/recommendation/current-vibes/init',
            GENERATE_NEW_VIBES: '/recommendation/current-vibes/new',
        }
    },

    // Social Service
    SOCIAL_SERVICE: {
        BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_SERVICE_URL || 'https://hengout.tranquocdat.com/social-service/api/v1',
        ENDPOINTS: {
            FOLLOW_USER: '/users/:id/follow',
            UNFOLLOW_USER: '/users/:id/unfollow',
            GET_FOLLOWERS: '/users/:id/followers',
            GET_FOLLOWING: '/users/:id/following',
            GET_FEED: '/feed',
            CREATE_POST: '/posts',
            LIKE_POST: '/posts/:id/like',
            UNLIKE_POST: '/posts/:id/unlike',
            COMMENT_POST: '/posts/:id/comments',
            // Friend Request endpoints
            GET_PENDING_REQUESTS: '/friendship/requests/pending',
            GET_SENT_REQUESTS: '/friendship/requests/sent',
            HANDLE_FRIEND_REQUEST: '/friendship/request/:id',
            SEND_FRIEND_REQUEST: '/friendship/request/:friendId',
            CANCEL_SENT_REQUEST: '/friendship/request/:friendRequestId',
            // Friends endpoints
            GET_FRIENDS: '/friendship',
            REMOVE_FRIEND: '/friendship/:friendId',
            BLOCK_FRIEND: '/friendship/block/:friendId',
            // Chat endpoints
            GET_CONVERSATIONS: '/chat/conversations',
            GET_CONVERSATION: '/chat/conversations/:conversationId',
            CREATE_GROUP: '/chat/conversations/group',
            UPDATE_CONVERSATION_NAME: '/chat/conversations/:conversationId/name',
            UPDATE_CONVERSATION_AVATAR: '/chat/conversations/:conversationId/avatar',
            GET_MESSAGES: '/chat/conversations/:conversationId/messages',
            SEND_MESSAGE: '/chat/messages',
            GET_GROUP_MEMBERS: '/chat/conversations/:conversationId/members',
            ADD_MEMBER: '/chat/conversations/:conversationId/members/:memberId',
            REMOVE_MEMBER: '/chat/conversations/:conversationId/members/:memberId',
        }
    },

    // Gateway Management
    GATEWAY: {
        BASE_URL: process.env.EXPO_PUBLIC_GATEWAY_URL || 'https://hengout.tranquocdat.com/gateway/api/v1',
        ENDPOINTS: {
            HEALTH_CHECK: '/health',
            API_STATUS: '/status',
        }
    }
} as const;

// Helper function to get service URL
export const getServiceUrl = (service: keyof typeof SERVICES_CONFIG, endpoint?: string): string => {
    const serviceConfig = SERVICES_CONFIG[service];
    if (endpoint) {
        return `${serviceConfig.BASE_URL}${endpoint}`;
    }
    return serviceConfig.BASE_URL;
};

// Helper function to build full endpoint URL
export const buildEndpointUrl = (service: keyof typeof SERVICES_CONFIG, endpointKey: string): string => {
    const serviceConfig = SERVICES_CONFIG[service];
    const endpoint = (serviceConfig.ENDPOINTS as any)[endpointKey];
    if (!endpoint) {
        throw new Error(`Endpoint ${endpointKey} not found in ${service} service`);
    }
    return `${serviceConfig.BASE_URL}${endpoint}`;
};

// Export individual service configs for convenience
export const AUTH_SERVICE = SERVICES_CONFIG.AUTH_SERVICE;
export const USER_SERVICE = SERVICES_CONFIG.USER_SERVICE;
export const LOCATION_SERVICE = SERVICES_CONFIG.LOCATION_SERVICE;
export const SOCIAL_SERVICE = SERVICES_CONFIG.SOCIAL_SERVICE;
export const GATEWAY = SERVICES_CONFIG.GATEWAY;
