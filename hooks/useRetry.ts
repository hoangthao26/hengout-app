import { useCallback, useState } from 'react';
import { RetryService, RetryOptions, RetryResult } from '../services/retryService';
import { useError } from '../contexts/ErrorContext';

// ============================================================================
// RETRY HOOK
// ============================================================================

interface UseRetryOptions {
    strategy?: keyof typeof import('../services/retryService').RETRY_STRATEGIES;
    customOptions?: RetryOptions;
    enableErrorReporting?: boolean;
}

interface UseRetryReturn {
    executeWithRetry: <T>(operation: () => Promise<T>) => Promise<T>;
    isRetrying: boolean;
    retryCount: number;
    lastError: any;
    reset: () => void;
}

export const useRetry = (options: UseRetryOptions = {}): UseRetryReturn => {
    const {
        strategy = 'network',
        customOptions,
        enableErrorReporting = true
    } = options;
    
    const { addNetworkError } = useError();
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastError, setLastError] = useState<any>(null);
    
    const executeWithRetry = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
        setIsRetrying(true);
        setRetryCount(0);
        setLastError(null);
        
        try {
            const retryOptions = customOptions || strategy;
            const result: RetryResult<T> = await RetryService.executeWithRetry(operation, retryOptions);
            
            setRetryCount(result.attempts);
            
            if (!result.success) {
                setLastError(result.error);
                
                if (enableErrorReporting) {
                    addNetworkError(result.error, {
                        component: 'useRetry',
                        action: 'executeWithRetry',
                        attempts: result.attempts,
                        totalTime: result.totalTime,
                        strategy: typeof retryOptions === 'string' ? retryOptions : 'custom'
                    });
                }
                
                throw result.error;
            }
            
            return result.data!;
        } finally {
            setIsRetrying(false);
        }
    }, [strategy, customOptions, enableErrorReporting, addNetworkError]);
    
    const reset = useCallback(() => {
        setIsRetrying(false);
        setRetryCount(0);
        setLastError(null);
    }, []);
    
    return {
        executeWithRetry,
        isRetrying,
        retryCount,
        lastError,
        reset
    };
};