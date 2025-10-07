import { publicAxios } from '../config/publicAxios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { retryAuth } from './retryService';
import {
    AuthResponse,
    GoogleOAuthRequest,
    LoginRequest,
    OTPResendRequest,
    OTPResponse,
    OTPVerificationRequest,
    RegisterRequest,
} from '../types/auth';

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

class AuthService {
    private readonly baseUrl = SERVICES_CONFIG.AUTH_SERVICE.BASE_URL;

    /**
     * Login user with email and password
     * POST /api/v1/auth/user/login
     */
    async loginUser(email: string, password: string): Promise<AuthResponse> {
        try {
            return await retryAuth(async () => {
                const request: LoginRequest = { email, password };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'LOGIN');
                const response = await publicAxios.post<AuthResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to login user:', error);
            throw error;
        }
    }

    /**
     * Register user and send OTP
     * POST /api/v1/auth/user/register/send-otp
     */
    async registerSendOTP(email: string, password: string, confirmPassword: string): Promise<OTPResponse> {
        try {
            return await retryAuth(async () => {
                const request: RegisterRequest = { email, password, confirmPassword };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REGISTER_SEND_OTP');
                const response = await publicAxios.post<OTPResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to register and send OTP:', error);
            throw error;
        }
    }

    /**
     * Verify OTP for registration
     * POST /api/v1/auth/user/register/verify-otp
     */
    async registerVerifyOTP(sessionToken: string, otp: string): Promise<AuthResponse> {
        try {
            return await retryAuth(async () => {
                const request: OTPVerificationRequest = { sessionToken, otp };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REGISTER_VERIFY_OTP');
                const response = await publicAxios.post<AuthResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to verify OTP:', error);
            throw error;
        }
    }

    /**
     * Resend OTP for registration
     * POST /api/v1/auth/user/register/resend-otp
     */
    async registerResendOTP(sessionToken: string): Promise<OTPResponse> {
        try {
            return await retryAuth(async () => {
                const request: OTPResendRequest = { sessionToken };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REGISTER_RESEND_OTP');
                const response = await publicAxios.post<OTPResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to resend OTP:', error);
            throw error;
        }
    }

    /**
     * Google OAuth login
     * POST /api/v1/auth/user/oauth/google
     */
    async googleOAuthLogin(idToken: string): Promise<AuthResponse> {
        try {
            return await retryAuth(async () => {
                const request: GoogleOAuthRequest = { idToken };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'GOOGLE_OAUTH');
                const response = await publicAxios.post<AuthResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to login with Google OAuth:', error);
            throw error;
        }
    }

    /**
     * Forgot Password - Send OTP
     * POST /api/v1/password/user/forgot
     */
    async forgotPasswordSendOTP(email: string): Promise<OTPResponse> {
        try {
            return await retryAuth(async () => {
                const request = { email };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'FORGOT_PASSWORD_SEND_OTP');
                const response = await publicAxios.post<OTPResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to send forgot password OTP:', error);
            throw error;
        }
    }

    /**
     * Forgot Password - Verify OTP
     * POST /api/v1/password/forgot/confirm-otp
     */
    async forgotPasswordVerifyOTP(sessionToken: string, otp: string): Promise<OTPResponse> {
        try {
            return await retryAuth(async () => {
                const request: OTPVerificationRequest = { sessionToken, otp };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'FORGOT_PASSWORD_VERIFY_OTP');
                const response = await publicAxios.post<OTPResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to verify forgot password OTP:', error);
            throw error;
        }
    }

    /**
     * Forgot Password - Reset Password
     * POST /api/v1/password/forgot/reset
     */
    async forgotPasswordReset(sessionToken: string, newPassword: string, confirmPassword: string): Promise<AuthResponse> {
        try {
            return await retryAuth(async () => {
                const request = { sessionToken, newPassword, confirmPassword };
                const endpoint = buildEndpointUrl('AUTH_SERVICE', 'FORGOT_PASSWORD_RESET');
                const response = await publicAxios.post<AuthResponse>(endpoint, request);
                return response.data;
            });
        } catch (error: any) {
            console.warn('Failed to reset password:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
