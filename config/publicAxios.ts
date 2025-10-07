import axios from 'axios';
import { API_CONFIG } from './api';

// Create a separate axios instance for public APIs (no auth required)
export const publicAxios = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'HengoutApp/1.0'
    }
});

// Request interceptor for logging
publicAxios.interceptors.request.use(
    (config) => {
        console.log('🚀 Public API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data,
            headers: config.headers
        });
        return config;
    },
    (error) => {
        console.warn('❌ Public API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for logging and error handling
publicAxios.interceptors.response.use(
    (response) => {
        console.log('✅ Public API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data
        });
        return response;
    },
    (error) => {
        // Normalize API error and surface backend message for UI
        const status = error.response?.status;
        const url = error.config?.url;
        const backendMessage = error.response?.data?.message || error.response?.data?.error;
        const message = backendMessage || error.message;

        console.warn('❌ Public API Response Error:', { status, url, message });

        const normalizedError = new Error(message);
        (normalizedError as any).status = status;
        (normalizedError as any).url = url;
        (normalizedError as any).isApiError = true;
        (normalizedError as any).raw = error;
        return Promise.reject(normalizedError);
    }
);

// Generic request function for public APIs
export const publicApiRequest = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
): Promise<T> => {
    try {
        const response = await publicAxios.request<T>({
            method,
            url: endpoint,
            data
        });
        return response.data;
    } catch (error: any) {
        // Enhanced error handling
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

