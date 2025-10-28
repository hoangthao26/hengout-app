// ============================================================================
// SERVICES CONFIGURATION
// ============================================================================

export const SERVICES_CONFIG = {
    // Authentication Service
    AUTH_SERVICE: {
        BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.hengout.app/auth-service/api/v1',
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
        BASE_URL: process.env.EXPO_PUBLIC_USER_SERVICE_URL || 'https://api.hengout.app/user-service/api/v1',
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
        BASE_URL: process.env.EXPO_PUBLIC_LOCATION_SERVICE_URL || 'https://api.hengout.app/location-service/api/v1',
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
        BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_SERVICE_URL || 'https://api.hengout.app/social-service/api/v1',
        ACTIVITIES_BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_SERVICE_ACTIVITIES_URL || 'https://api.hengout.app/social-service/api',
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
            // Activity endpoints
            GET_ACTIVITY_BY_ID: '/activities/:activityId',
            GET_CONVERSATION_ACTIVITIES: '/activities/conversation/:conversationId',
            GET_ACTIVITY_SUGGESTIONS: '/activities/:activityId/suggestions',
            GET_ACTIVITY_RESULT: '/activities/:activityId/result',
            CREATE_ACTIVITY: '/activities',
            UPDATE_ACTIVITY: '/activities/:activityId',
            DELETE_ACTIVITY: '/activities/:activityId',
            SUBMIT_ACTIVITY_PREFERENCE: '/activities/preferences',
            VOTE_FOR_SUGGESTION: '/activities/vote',
        }
    },

    // Activities Service
    ACTIVITIES_BASE_URL: {
        BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_SERVICE_ACTIVITIES_URL || 'https://api.hengout.app/social-service/api',
        ENDPOINTS: {
            GET_ACTIVITY_BY_ID: '/activities/:activityId',
            GET_CONVERSATION_ACTIVITIES: '/activities/conversation/:conversationId',
            GET_ACTIVITY_SUGGESTIONS: '/activities/:activityId/suggestions',
            GET_ACTIVITY_RESULT: '/activities/:activityId/result',
            CREATE_ACTIVITY: '/activities',
            UPDATE_ACTIVITY: '/activities/:activityId',
            DELETE_ACTIVITY: '/activities/:activityId',
            SUBMIT_ACTIVITY_PREFERENCE: '/activities/preferences',
            VOTE_FOR_SUGGESTION: '/activities/vote',
        }
    },

    // Subscription Service
    SUBSCRIPTION_SERVICE: {
        BASE_URL: process.env.EXPO_PUBLIC_SUBSCRIPTION_SERVICE_URL || 'https://api.hengout.app/subscription-service/api/v1',
        ENDPOINTS: {
            // Plans
            GET_PLANS: '/subscriptions/plans',
            GET_ACTIVE_SUBSCRIPTION: '/subscriptions/active',
            ACTIVATE_SUBSCRIPTION: '/subscriptions/activate',

            // User Limits
            GET_FOLDER_LIMITS: '/users/limits/folder',
            GET_FRIEND_LIMITS: '/users/limits/friend',
            GET_GROUP_LIMITS: '/users/limits/group',

            // Payments
            CHECK_PAYMENT: '/payments/check',
            CREATE_PAYMENT: '/payments/create',
            CONFIRM_WEBHOOK: '/payments/confirm-webhook',
            CANCEL_PAYMENT: '/payments/cancel',

            // Group Management
            GET_GROUP_STATUS: '/groups/:groupId/status',
            INIT_GROUP: '/groups/init',
            APPLY_GROUP_BOOST: '/group-boosts/apply',
        }
    },

    // Gateway Management
    GATEWAY: {
        BASE_URL: process.env.EXPO_PUBLIC_GATEWAY_URL || 'https://api.hengout.app/gateway/api/v1',
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
export const buildEndpointUrl = (service: keyof typeof SERVICES_CONFIG, endpointKey: string, params?: Record<string, string>): string => {
    const serviceConfig = SERVICES_CONFIG[service];
    const endpoint = (serviceConfig.ENDPOINTS as any)[endpointKey];
    if (!endpoint) {
        throw new Error(`Endpoint ${endpointKey} not found in ${service} service`);
    }

    let finalEndpoint = endpoint;
    if (params) {
        Object.keys(params).forEach(key => {
            finalEndpoint = finalEndpoint.replace(`:${key}`, params[key]);
        });
    }

    // Use ACTIVITIES_BASE_URL for activity endpoints
    const baseUrl = (endpointKey.includes('ACTIVITY') && (serviceConfig as any).ACTIVITIES_BASE_URL)
        ? (serviceConfig as any).ACTIVITIES_BASE_URL
        : serviceConfig.BASE_URL;

    return `${baseUrl}${finalEndpoint}`;
};

// Export individual service configs for convenience
export const AUTH_SERVICE = SERVICES_CONFIG.AUTH_SERVICE;
export const USER_SERVICE = SERVICES_CONFIG.USER_SERVICE;
export const LOCATION_SERVICE = SERVICES_CONFIG.LOCATION_SERVICE;
export const SOCIAL_SERVICE = SERVICES_CONFIG.SOCIAL_SERVICE;
export const SUBSCRIPTION_SERVICE = SERVICES_CONFIG.SUBSCRIPTION_SERVICE;
export const GATEWAY = SERVICES_CONFIG.GATEWAY;
