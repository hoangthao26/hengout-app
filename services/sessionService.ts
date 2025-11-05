import { publicAxios } from '../config/publicAxios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import {
    AuthResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshTokenRequest,
} from '../types/auth';
import axiosInstance from '../config/axios';

// ============================================================================
// SESSION MANAGEMENT SERVICE
// ============================================================================

class SessionService {
    private readonly baseUrl = SERVICES_CONFIG.AUTH_SERVICE.BASE_URL;

    /**
     * Refresh access token - ENTERPRISE BEST PRACTICE: No Authorization header needed
     * POST /api/v1/session/refresh
     * Backend supports refresh token rotation without requiring access token
     */
    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        try {
            const request: RefreshTokenRequest = { refreshToken };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'REFRESH_TOKEN');

            // ENTERPRISE BEST PRACTICE: No Authorization header needed
            // Backend supports refresh token rotation independently

            // Use publicAxios - no Authorization header will be added
            const response = await publicAxios.post<AuthResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    }

    /**
     * Logout user - using publicAxios (no Authorization header needed)
     * POST /api/v1/session/logout
     */
    async logoutUser(refreshToken: string): Promise<LogoutResponse> {
        try {
            const request: LogoutRequest = { refreshToken };
            const endpoint = buildEndpointUrl('AUTH_SERVICE', 'LOGOUT');

            // USE AXIOS INSTANCE: Include access token in header for logout
            const response = await axiosInstance.post<LogoutResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('[SessionService] Failed to logout user:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;
