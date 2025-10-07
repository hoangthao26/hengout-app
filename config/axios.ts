import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthHelper } from '../services/authHelper';
import { refreshTokenManager } from '../services/refreshTokenManager';
import { API_CONFIG } from './api';

// Create axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'HengoutApp/1.0',
    },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

// Flag to disable interceptor for logout scenarios
let isLoggingOut = false;
let isUserLoggedOut = false; // 🚀 NEW: Track if user is completely logged out

// Function to set logout mode
export const setLogoutMode = (mode: boolean) => {
    isLoggingOut = mode;
};

// 🚀 NEW: Function to set user logged out state
export const setUserLoggedOut = (loggedOut: boolean) => {
    isUserLoggedOut = loggedOut;
};

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });

    failedQueue = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Skip adding auth token for public endpoints (registration, login, etc.)
        const publicEndpoints = [
            '/auth/user/register/send-otp',
            '/auth/user/register/verify-otp',
            '/auth/user/register/resend-otp',
            '/auth/user/login',
            '/auth/user/oauth/google',
            '/password/user/forgot',
            '/password/forgot/confirm-otp',
            '/password/forgot/reset',
        ];

        const isPublicEndpoint = publicEndpoints.some(endpoint =>
            config.url?.includes(endpoint)
        );

        // Add auth token only for protected endpoints
        if (!isPublicEndpoint) {
            try {
                const isAuthenticated = await AuthHelper.isAuthenticated();
                if (isAuthenticated) {
                    const accessToken = await AuthHelper.getAccessToken();
                    if (accessToken) {
                        config.headers.set('Authorization', `Bearer ${accessToken}`);
                    }
                }
            } catch (error) {
                console.warn('Failed to add auth token to request:', error);
            }
        }

        // Add API key to all requests if available
        if (API_CONFIG.API_KEY) {
            config.headers.set('X-API-Key', API_CONFIG.API_KEY);
        }


        return config;
    },
    (error) => {
        console.warn('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {

        return response;
    },
    async (error) => {
        const originalRequest = error.config;


        // Handle specific error cases
        if (error.response?.status === 401) {
            // 🚀 STOP INFINITE LOOP: Don't try to refresh if user is logged out
            if (isLoggingOut || isUserLoggedOut) {
                console.log('🚫 [Axios] User is logged out, silently ignoring 401 error');
                // Return a silent rejection - don't log as error
                return Promise.reject(new Error('User logged out - request cancelled'));
            }

            // Silent log for 401 - don't show error to user
            console.log('🔐 401 Unauthorized - Attempting token refresh');

            if (originalRequest.url?.includes('/auth/user/register/verify-otp') ||
                originalRequest.url?.includes('/auth/user/register/send-otp') ||
                originalRequest.url?.includes('/password/user/forgot') ||
                originalRequest.url?.includes('/password/forgot/confirm-otp') ||
                originalRequest.url?.includes('/password/forgot/reset')) {
                return Promise.reject(error);
            }

            if (originalRequest.url?.includes('/session/refresh')) {
                // Silent log for refresh token failure - don't show error to user
                console.log('🔄 Refresh token expired - redirecting to login');
                await AuthHelper.logoutAndNavigate();
                return Promise.reject(error);
            }

            if (!isRefreshing) {
                isRefreshing = true;

                try {
                    await refreshTokenManager.forceRefresh();
                    const newAccessToken = await AuthHelper.getAccessToken();
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    processQueue(null, newAccessToken);
                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    // Silent log for token refresh error - don't show error to user
                    console.log('🔄 Token refresh failed:', (refreshError as any)?.message || 'Unknown error');
                    processQueue(refreshError, null);

                    const isAuthError = (refreshError as any)?.response?.status === 401 || (refreshError as any)?.message?.includes('401');
                    const isNetworkError = (refreshError as any)?.code === 'NETWORK_ERROR' || (refreshError as any)?.message?.includes('network');
                    const isTimeoutError = (refreshError as any)?.code === 'TIMEOUT' || (refreshError as any)?.message?.includes('timeout');

                    if (isAuthError) {
                        await AuthHelper.logoutAndNavigate();
                    } else if (isNetworkError || isTimeoutError) {
                        // Keep user logged in for network errors
                    }

                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axiosInstance(originalRequest);
                }).catch((err) => {
                    return Promise.reject(err);
                });
            }
        } else if (error.response?.status === 400) {
            console.warn('📝 400 Bad Request - Check request data format');
        } else if (error.response?.status === 404) {
            console.warn('🔍 404 Not Found - Check API endpoint');
        } else if (error.response?.status === 500) {
            console.warn('💥 500 Server Error - Server issue');
        }

        return Promise.reject(error);
    }
);

// API request helper function
export const apiRequest = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    data?: any,
    config?: AxiosRequestConfig
): Promise<T> => {
    try {
        const response = await axiosInstance.request({
            method,
            url: endpoint,
            data,
            ...config,
        });

        return response.data;
    } catch (error: any) {
        // Handle axios errors
        if (error.response) {
            // Server responded with error status
            const errorMessage = error.response.data?.message ||
                error.response.data?.error ||
                `HTTP ${error.response.status}: ${error.response.statusText}`;
            throw new Error(errorMessage);
        } else if (error.request) {
            // Request was made but no response received
            throw new Error('Network error: No response from server');
        } else {
            // Something else happened
            throw new Error(error.message || 'Unknown error occurred');
        }
    }
};

// Export axios instance for direct use if needed
export default axiosInstance;
