// ============================================================================
// API CONFIGURATION TYPES
// ============================================================================

export interface ApiConfig {
    BASE_URL: string;
    TIMEOUT: number;
    RETRY_ATTEMPTS: number;
}

export interface ApiEndpoints {
    AUTH: {
        LOGIN: string;
        REGISTER_SEND_OTP: string;
        REGISTER_VERIFY_OTP: string;
        REGISTER_RESEND_OTP: string;
        GOOGLE_OAUTH: string;
    };
    PASSWORD: {
        STATUS: string;
        FORGOT: string;
        SET: string;
        RESET: string;
        RESEND_OTP: string;
        CONFIRM_OTP: string;
        CHANGE: string;
        ADMIN_FORGOT: string;
    };
    SESSION: {
        REFRESH: string;
        LOGOUT: string;
    };
}

// ============================================================================
// BASE API TYPES
// ============================================================================

export interface BaseApiResponse<T = any> {
    status: string;
    data: T;
    message: string;
    errorCode: number;
}

export interface ApiError {
    message: string;
    errorCode: number;
    status: string;
    details?: any;
}


// ============================================================================
// PASSWORD MANAGEMENT TYPES
// ============================================================================

// Forgot Password Request
export interface ForgotPasswordRequest {
    email: string;
}

// Reset Password Request
export interface ResetPasswordRequest {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
}

// Change Password Request
export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

// Password Status Response
export interface PasswordStatusResponse extends BaseApiResponse<{
    hasPassword: boolean;
    requiresPasswordChange: boolean;
}> { }
