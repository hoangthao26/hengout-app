// API Configuration
export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hengout.tranquocdat.com/auth-service/api/v1',
    TIMEOUT: 15000, // 15 seconds (increased for better reliability)
    RETRY_ATTEMPTS: 3,
    // Add API key if needed
    API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/auth/user/login',
        REGISTER_SEND_OTP: '/auth/user/register/send-otp',
        REGISTER_VERIFY_OTP: '/auth/user/register/verify-otp',
        REGISTER_RESEND_OTP: '/auth/user/register/resend-otp',
        GOOGLE_OAUTH: '/auth/user/oauth/google',
    },
    // Password Management
    PASSWORD: {
        STATUS: '/password/status',
        FORGOT: '/password/user/forgot',
        SET: '/password/set',
        RESET: '/password/forgot/reset',
        RESEND_OTP: '/password/forgot/resend-otp',
        CONFIRM_OTP: '/password/forgot/confirm-otp',
        CHANGE: '/password/change',
        ADMIN_FORGOT: '/password/admin/forgot',
    },
    // Session Management
    SESSION: {
        REFRESH: '/session/refresh',
        LOGOUT: '/session/logout',
    },
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};
