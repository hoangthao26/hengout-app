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
        console.log('🚀 [RequestManager] Initializing...');
        this.cancelTokenSource = axios.CancelToken.source();
        this.activeRequests.clear();
        this.isShuttingDown = false;
        console.log('✅ [RequestManager] Initialized');
    }

    /**
     * Get cancel token for requests
     */
    getCancelToken() {
        if (!this.cancelTokenSource) {
            console.warn('⚠️ [RequestManager] No cancel token available, creating new one');
            this.cancelTokenSource = axios.CancelToken.source();
        }
        return this.cancelTokenSource.token;
    }

    /**
     * Track active request
     */
    trackRequest(requestId: string): void {
        if (this.isShuttingDown) {
            console.log('🚫 [RequestManager] Shutting down, rejecting new request:', requestId);
            throw new Error('Request manager is shutting down');
        }
        this.activeRequests.add(requestId);
        console.log(`📊 [RequestManager] Tracking request: ${requestId} (${this.activeRequests.size} active)`);
    }

    /**
     * Untrack completed request
     */
    untrackRequest(requestId: string): void {
        this.activeRequests.delete(requestId);
        console.log(`📊 [RequestManager] Untracked request: ${requestId} (${this.activeRequests.size} active)`);
    }

    /**
     * Cancel all pending requests (call when user logs out)
     */
    cancelAllRequests(): void {
        console.log('🚫 [RequestManager] Cancelling all requests...');
        this.isShuttingDown = true;

        if (this.cancelTokenSource) {
            this.cancelTokenSource.cancel('User logged out');
            console.log(`✅ [RequestManager] Cancelled ${this.activeRequests.size} pending requests`);
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
        console.log('🔄 [RequestManager] Reset');
    }
}

// Export singleton instance
export const requestManager = RequestManager.getInstance();
export default requestManager;
