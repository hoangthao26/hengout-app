import { ErrorCategory, ErrorSeverity, createAppError } from '../types/error';
import { useError } from '../contexts/ErrorContext';

// ============================================================================
// RETRY STRATEGY TYPES
// ============================================================================

export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    exponentialBackoff?: boolean;
    jitter?: boolean;
    retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: any;
    attempts: number;
    totalTime: number;
}

// ============================================================================
// RETRY STRATEGIES
// ============================================================================

export const RETRY_STRATEGIES = {
    // Network requests - retry on network errors
    network: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        exponentialBackoff: true,
        jitter: true,
        retryCondition: (error: any) => {
            // Retry on network errors, timeouts, 5xx errors
            return error.code === 'NETWORK_ERROR' ||
                error.code === 'TIMEOUT' ||
                (error.response?.status >= 500 && error.response?.status < 600);
        }
    },

    // Auth requests - limited retries
    auth: {
        maxRetries: 2,
        baseDelay: 2000,
        maxDelay: 5000,
        exponentialBackoff: true,
        jitter: false,
        retryCondition: (error: any) => {
            // Retry on network errors, not on auth failures
            return error.code === 'NETWORK_ERROR' ||
                error.code === 'TIMEOUT' ||
                error.response?.status === 503;
        }
    },

    // Critical operations - more retries
    critical: {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 15000,
        exponentialBackoff: true,
        jitter: true,
        retryCondition: (error: any) => {
            // Retry on most errors except client errors
            return !(error.response?.status >= 400 && error.response?.status < 500);
        }
    },

    // Quick operations - minimal retries
    quick: {
        maxRetries: 1,
        baseDelay: 500,
        maxDelay: 2000,
        exponentialBackoff: false,
        jitter: false,
        retryCondition: (error: any) => {
            return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT';
        }
    }
};

// ============================================================================
// RETRY SERVICE
// ============================================================================

export class RetryService {
    /**
     * Execute function with retry logic
     */
    static async executeWithRetry<T>(
        operation: () => Promise<T>,
        strategy: keyof typeof RETRY_STRATEGIES | RetryOptions = 'network'
    ): Promise<RetryResult<T>> {
        const options = typeof strategy === 'string'
            ? RETRY_STRATEGIES[strategy]
            : { ...RETRY_STRATEGIES.network, ...strategy };

        const {
            maxRetries = 3,
            baseDelay = 1000,
            maxDelay = 10000,
            exponentialBackoff = true,
            jitter = true,
            retryCondition = () => true
        } = options;

        let lastError: any;
        const startTime = Date.now();

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                const totalTime = Date.now() - startTime;

                return {
                    success: true,
                    data: result,
                    attempts: attempt + 1,
                    totalTime
                };
            } catch (error: any) {
                lastError = error;

                // Don't retry if condition not met
                if (!retryCondition(error)) {
                    break;
                }

                // Don't retry on last attempt
                if (attempt === maxRetries) {
                    break;
                }

                // Calculate delay
                const delay = this.calculateDelay(attempt, baseDelay, maxDelay, exponentialBackoff, jitter);

                console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`);
                await this.sleep(delay);
            }
        }

        const totalTime = Date.now() - startTime;

        return {
            success: false,
            error: lastError,
            attempts: maxRetries + 1,
            totalTime
        };
    }

    /**
     * Calculate delay with exponential backoff and jitter
     */
    private static calculateDelay(
        attempt: number,
        baseDelay: number,
        maxDelay: number,
        exponentialBackoff: boolean,
        jitter: boolean
    ): number {
        let delay = baseDelay;

        if (exponentialBackoff) {
            delay = baseDelay * Math.pow(2, attempt);
        }

        // Apply jitter to prevent thundering herd
        if (jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }

        return Math.min(delay, maxDelay);
    }

    /**
     * Sleep utility
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry with error reporting
     */
    static async executeWithRetryAndErrorReporting<T>(
        operation: () => Promise<T>,
        strategy: keyof typeof RETRY_STRATEGIES | RetryOptions = 'network',
        context?: { [key: string]: any }
    ): Promise<T> {
        const result = await this.executeWithRetry(operation, strategy);

        if (!result.success) {
            // Report retry failure to error context
            const appError = createAppError(
                result.error,
                ErrorCategory.NETWORK,
                ErrorSeverity.HIGH,
                {
                    component: 'RetryService',
                    action: 'executeWithRetryAndErrorReporting',
                    attempts: result.attempts,
                    totalTime: result.totalTime,
                    strategy: typeof strategy === 'string' ? strategy : 'custom',
                    ...context
                }
            );

            // In a real app, you'd report this to your error context
            console.log('🔄 Retry failed after all attempts:', appError);

            // 🚀 SHOW TOAST TO USER: Notify user about retry failure
            try {
                const { useToast } = await import('../contexts/ToastContext');
                const toast = useToast();

                // Show user-friendly message based on error type
                let userMessage = 'Request failed. Please try again.';
                let shouldLogout = false;

                if (result.error?.response?.status === 401) {
                    userMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
                    shouldLogout = true;
                } else if (result.error?.response?.status >= 500) {
                    userMessage = 'Lỗi máy chủ. Vui lòng thử lại sau.';
                } else if (result.error?.code === 'NETWORK_ERROR' || result.error?.message?.includes('network')) {
                    userMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
                }

                toast.error('Lỗi', userMessage);
                console.log('📱 [RetryService] Toast shown to user:', userMessage);

                // 🚀 LOGOUT ON 401: Trigger logout when authentication fails
                if (shouldLogout) {
                    try {
                        const { AuthHelper } = await import('./authHelper');
                        console.log('🔐 [RetryService] Authentication failed - triggering logout');
                        await AuthHelper.logoutAndNavigate();
                    } catch (logoutError) {
                        console.error('❌ [RetryService] Failed to logout:', logoutError);
                        // Don't throw - logout failure shouldn't block error propagation
                    }
                }
            } catch (toastError) {
                console.error('❌ [RetryService] Failed to show toast:', toastError);
                // Don't throw - toast failure shouldn't block error propagation
            }

            throw result.error;
        }

        return result.data!;
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Retry network requests
 */
export const retryNetwork = <T>(operation: () => Promise<T>): Promise<T> => {
    return RetryService.executeWithRetryAndErrorReporting(operation, 'network');
};

/**
 * Retry auth requests
 */
export const retryAuth = <T>(operation: () => Promise<T>): Promise<T> => {
    return RetryService.executeWithRetryAndErrorReporting(operation, 'auth');
};

/**
 * Retry critical operations
 */
export const retryCritical = <T>(operation: () => Promise<T>): Promise<T> => {
    return RetryService.executeWithRetryAndErrorReporting(operation, 'critical');
};

/**
 * Retry quick operations
 */
export const retryQuick = <T>(operation: () => Promise<T>): Promise<T> => {
    return RetryService.executeWithRetryAndErrorReporting(operation, 'quick');
};

