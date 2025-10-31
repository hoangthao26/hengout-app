import { publicAxios } from '../config/publicAxios';
import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
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
            const request: LoginRequest = { email, password };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'LOGIN');
            const response = await publicAxios.post<AuthResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.warn('Failed to login user:', error);
            throw error;
        }
    }

    /**
     * Change password for logged-in user
     * POST /api/v1/password/change
     */
    async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<AuthResponse> {
        try {
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'CHANGE_PASSWORD');
            const request = { currentPassword, newPassword, confirmPassword };
            const response = await axiosInstance.post<AuthResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.warn('Failed to change password:', error);
            throw error;
        }
    }

    /**
     * Check password status and OAuth linkage
     * GET /api/v1/password/status
     */
    async getPasswordStatus(): Promise<any> {
        try {
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'PASSWORD_STATUS');
            const response = await axiosInstance.get(endpoint);
            return response.data;
        } catch (error: any) {
            console.warn('Failed to get password status:', error);
            throw error;
        }
    }

    /**
     * Set password for OAuth users (first time)
     * POST /api/v1/password/set
     */
    async setPassword(password: string, confirmPassword: string): Promise<any> {
        try {
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'PASSWORD_SET');
            const request = { password, confirmPassword };
            const response = await axiosInstance.post(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.warn('Failed to set password:', error);
            throw error;
        }
    }

    /**
     * Register user and send OTP
     * POST /api/v1/auth/user/register/send-otp
     */
    async registerSendOTP(email: string, password: string, confirmPassword: string): Promise<OTPResponse> {
        try {
            const request: RegisterRequest = { email, password, confirmPassword };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REGISTER_SEND_OTP');
            const response = await publicAxios.post<OTPResponse>(endpoint, request);
            return response.data;
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
            const request: OTPVerificationRequest = { sessionToken, otp };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REGISTER_VERIFY_OTP');
            const response = await publicAxios.post<AuthResponse>(endpoint, request);
            return response.data;
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
            const request: OTPResendRequest = { sessionToken };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REGISTER_RESEND_OTP');
            const response = await publicAxios.post<OTPResponse>(endpoint, request);
            return response.data;
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
            const request: GoogleOAuthRequest = { idToken };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'GOOGLE_OAUTH');
            const response = await publicAxios.post<AuthResponse>(endpoint, request);
            return response.data;
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
            const request = { email };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'FORGOT_PASSWORD_SEND_OTP');
            const response = await publicAxios.post<OTPResponse>(endpoint, request);
            return response.data;
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
            const request: OTPVerificationRequest = { sessionToken, otp };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'FORGOT_PASSWORD_VERIFY_OTP');
            const response = await publicAxios.post<OTPResponse>(endpoint, request);
            return response.data;
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
            const request = { sessionToken, newPassword, confirmPassword };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'FORGOT_PASSWORD_RESET');
            const response = await publicAxios.post<AuthResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.warn('Failed to reset password:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
