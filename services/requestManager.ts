import axios, { CancelTokenSource } from 'axios';

/**
 * Request Manager - Centralized request cancellation system
 * 
 * Features:
 * - Global request cancellation
 * - Request tracking
 * - Graceful shutdown
 */
class RequestManager {
    private static instance: RequestManager;
    private cancelTokenSource: CancelTokenSource | null = null;
    private activeRequests: Set<string> = new Set();
    private isShuttingDown = false;

    static getInstance(): RequestManager {
        if (!RequestManager.instance) {
            RequestManager.instance = new RequestManager();
        }
        return RequestManager.instance;
    }

    /**
     * Initialize request manager (call when user logs in)
     */
    initialize(): void {
        this.cancelTokenSource = axios.CancelToken.source();
        this.activeRequests.clear();
        this.isShuttingDown = false;
    }

    /**
     * Get cancel token for requests
     */
    getCancelToken() {
        if (!this.cancelTokenSource) {
            // No cancel token available - create new one (should not happen in normal flow)
            this.cancelTokenSource = axios.CancelToken.source();
        }
        return this.cancelTokenSource.token;
    }

    /**
     * Track active request
     */
    trackRequest(requestId: string): void {
        if (this.isShuttingDown) {
            throw new Error('Request manager is shutting down');
        }
        this.activeRequests.add(requestId);
    }

    /**
     * Untrack completed request
     */
    untrackRequest(requestId: string): void {
        this.activeRequests.delete(requestId);
    }

    /**
     * Cancel all pending requests (call when user logs out)
     */
    cancelAllRequests(): void {
        this.isShuttingDown = true;

        if (this.cancelTokenSource) {
            this.cancelTokenSource.cancel('User logged out');
        }

        this.activeRequests.clear();
        this.cancelTokenSource = null;
    }

    /**
     * Get active requests count
     */
    getActiveRequestsCount(): number {
        return this.activeRequests.size;
    }

    /**
     * Check if shutting down
     */
    isShuttingDownState(): boolean {
        return this.isShuttingDown;
    }

    /**
     * Reset manager (for testing)
     */
    reset(): void {
        this.cancelAllRequests();
        this.isShuttingDown = false;
    }
}

// Export singleton instance
export const requestManager = RequestManager.getInstance();
export default requestManager;
