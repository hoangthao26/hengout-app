import { publicAxios } from '../config/publicAxios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import {
    AuthResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshTokenRequest,
} from '../types/auth';

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

            // 🔥 ENTERPRISE BEST PRACTICE: No Authorization header needed
            // Backend supports refresh token rotation independently
            console.log('🔄 [SessionService] Refreshing token with rotation:', {
                hasRefreshToken: !!refreshToken,
                refreshTokenLength: refreshToken?.length || 0,
                endpoint: endpoint,
                enterpriseMode: true,
            });

            // Use publicAxios - no Authorization header will be added
            const response = await publicAxios.post<AuthResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('❌ [SessionService] Failed to refresh token:', error);
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
            const response = await publicAxios.post<LogoutResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('Failed to logout user:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;
