import { useCallback, useState } from 'react';

interface RetryOptions {
    maxRetries?: number;
    delay?: number;
    exponentialBackoff?: boolean;
}

export const useRetry = () => {
    const [retryCount, setRetryCount] = useState(0);

    const executeWithRetry = useCallback(async <T>(
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> => {
        const { maxRetries = 3, delay = 1000, exponentialBackoff = true } = options;

        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                setRetryCount(attempt);
                const result = await operation();
                setRetryCount(0); // Reset on success
                return result;
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    setRetryCount(0); // Reset on final failure
                    throw lastError;
                }

                // Calculate delay with exponential backoff
                const currentDelay = exponentialBackoff
                    ? delay * Math.pow(2, attempt)
                    : delay;

                console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1} after ${currentDelay}ms`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
            }
        }

        throw lastError!;
    }, []);

    return {
        executeWithRetry,
        retryCount,
        isRetrying: retryCount > 0
    };
};
