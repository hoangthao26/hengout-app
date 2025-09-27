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
        console.error('❌ Public API Request Error:', error);
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
        console.error('❌ Public API Response Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.response?.data?.message || error.message
        });
        return Promise.reject(error);
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

