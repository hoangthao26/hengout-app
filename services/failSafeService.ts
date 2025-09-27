/**
 * Fail-Safe Service
 * Circuit breaker, retry, and fallback strategies for token refresh
 */

import { AuthHelper } from './authHelper';
import { sessionService } from './sessionService';

export interface FailSafeConfig {
    enableCircuitBreaker: boolean;
    maxFailures: number;
    circuitBreakerTimeout: number; // milliseconds
    enableGracefulDegradation: boolean;
    enableEmergencyRecovery: boolean;
    networkRetryAttempts: number;
    networkRetryDelay: number; // milliseconds
}

export interface CircuitBreakerState {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
}

export interface FailSafeResult {
    success: boolean;
    usedFallback: boolean;
    fallbackStrategy: string;
    error?: string;
    recoveryAttempted: boolean;
}

export class FailSafeService {
    private static instance: FailSafeService;
    private circuitBreakerState: CircuitBreakerState = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
    };

    private config: FailSafeConfig = {
        enableCircuitBreaker: true,
        maxFailures: 3,
        circuitBreakerTimeout: 5 * 60 * 1000,
        enableGracefulDegradation: true,
        enableEmergencyRecovery: true,
        networkRetryAttempts: 3,
        networkRetryDelay: 1000
    };

    private constructor() { }

    static getInstance(): FailSafeService {
        if (!FailSafeService.instance) {
            FailSafeService.instance = new FailSafeService();
        }
        return FailSafeService.instance;
    }

    async performFailSafeRefresh(): Promise<FailSafeResult> {
        try {

            // Check circuit breaker
            if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen()) {
                return await this.executeFallbackStrategy('CIRCUIT_BREAKER_OPEN');
            }

            // Attempt primary refresh
            const primaryResult = await this.attemptPrimaryRefresh();
            if (primaryResult.success) {
                this.resetCircuitBreaker();
                return {
                    success: true,
                    usedFallback: false,
                    fallbackStrategy: 'NONE',
                    recoveryAttempted: false
                };
            }

            // Primary failed, increment circuit breaker
            this.recordFailure();

            // Try fallback strategies
            const fallbackResult = await this.executeFallbackStrategy('PRIMARY_FAILED');
            return fallbackResult;

        } catch (error: any) {
            console.error('❌ [FailSafeService] Fail-safe refresh failed:', error);
            return {
                success: false,
                usedFallback: true,
                fallbackStrategy: 'ERROR_HANDLING',
                error: error.message,
                recoveryAttempted: false
            };
        }
    }

    private async attemptPrimaryRefresh(): Promise<{ success: boolean; error?: string }> {
        try {

            const refreshToken = await AuthHelper.getRefreshToken();
            if (!refreshToken) {
                return { success: false, error: 'No refresh token available' };
            }

            // Network resilience with retry
            const response = await this.executeWithNetworkResilience(async () => {
                return await sessionService.refreshToken(refreshToken);
            });

            // Save new tokens
            await AuthHelper.saveTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
                tokenType: response.data.tokenType,
                expiresIn: response.data.expiresIn,
                expiresAt: Date.now() + response.data.expiresIn,
                role: response.data.role,
            });

            return { success: true };

        } catch (error: any) {
            console.error('❌ [FailSafeService] Primary refresh failed:', error);
            return { success: false, error: error.message };
        }
    }

    private async executeFallbackStrategy(reason: string): Promise<FailSafeResult> {

        // Strategy 1: Graceful degradation
        if (this.config.enableGracefulDegradation) {
            const gracefulResult = await this.attemptGracefulDegradation();
            if (gracefulResult.success) {
                return {
                    success: true,
                    usedFallback: true,
                    fallbackStrategy: 'GRACEFUL_DEGRADATION',
                    recoveryAttempted: false
                };
            }
        }

        // Strategy 2: Emergency recovery
        if (this.config.enableEmergencyRecovery) {
            const emergencyResult = await this.attemptEmergencyRecovery();
            if (emergencyResult.success) {
                return {
                    success: true,
                    usedFallback: true,
                    fallbackStrategy: 'EMERGENCY_RECOVERY',
                    recoveryAttempted: true
                };
            }
        }

        // Strategy 3: Keep user logged in with existing tokens
        const keepAliveResult = await this.attemptKeepAlive();
        return {
            success: keepAliveResult.success,
            usedFallback: true,
            fallbackStrategy: 'KEEP_ALIVE',
            error: keepAliveResult.error,
            recoveryAttempted: false
        };
    }

    /**
     * Graceful degradation strategy
     */
    private async attemptGracefulDegradation(): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🔄 [FailSafeService] Attempting graceful degradation...');

            // Check if we have valid existing tokens
            const currentTokens = await AuthHelper.getTokens();
            if (!currentTokens) {
                return { success: false, error: 'No existing tokens available' };
            }

            // Check if tokens are still valid (not expired)
            const now = Date.now();
            if (currentTokens.expiresAt && currentTokens.expiresAt > now) {
                const timeUntilExpiry = currentTokens.expiresAt - now;
                const minutesUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60));

                if (minutesUntilExpiry > 5) { // At least 5 minutes remaining
                    console.log(`✅ [FailSafeService] Graceful degradation successful - tokens valid for ${minutesUntilExpiry} minutes`);
                    return { success: true };
                }
            }

            return { success: false, error: 'Existing tokens expired or expiring soon' };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Emergency recovery strategy
     */
    private async attemptEmergencyRecovery(): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🚨 [FailSafeService] Attempting emergency recovery...');

            // Try to refresh with extended timeout and retry
            const refreshToken = await AuthHelper.getRefreshToken();
            if (!refreshToken) {
                return { success: false, error: 'No refresh token for emergency recovery' };
            }

            // Emergency recovery with extended retry
            const response = await this.executeWithExtendedRetry(async () => {
                return await sessionService.refreshToken(refreshToken);
            });

            // Save new tokens
            await AuthHelper.saveTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
                tokenType: response.data.tokenType,
                expiresIn: response.data.expiresIn,
                expiresAt: Date.now() + response.data.expiresIn,
                role: response.data.role,
            });

            console.log('✅ [FailSafeService] Emergency recovery successful');
            return { success: true };

        } catch (error: any) {
            console.error('❌ [FailSafeService] Emergency recovery failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Keep user logged in with existing tokens
     */
    private async attemptKeepAlive(): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🔄 [FailSafeService] Attempting keep-alive strategy...');

            const currentTokens = await AuthHelper.getTokens();
            if (!currentTokens) {
                return { success: false, error: 'No tokens available for keep-alive' };
            }

            // Keep user logged in even with expired tokens
            // This allows them to continue using the app until network is restored
            console.log('✅ [FailSafeService] Keep-alive strategy - user remains logged in');
            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Network resilience with retry
     */
    private async executeWithNetworkResilience<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= this.config.networkRetryAttempts; attempt++) {
            try {
                console.log(`🔄 [FailSafeService] Network operation attempt ${attempt}/${this.config.networkRetryAttempts}`);
                return await operation();
            } catch (error) {
                lastError = error;
                console.log(`❌ [FailSafeService] Network operation attempt ${attempt} failed:`, (error as any).message);

                if (attempt < this.config.networkRetryAttempts) {
                    const delay = this.config.networkRetryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`⏳ [FailSafeService] Waiting ${delay}ms before retry...`);
                    await this.delay(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Extended retry for emergency recovery
     */
    private async executeWithExtendedRetry<T>(operation: () => Promise<T>): Promise<T> {
        const maxAttempts = this.config.networkRetryAttempts * 2; // Double the attempts
        let lastError: any;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🚨 [FailSafeService] Emergency operation attempt ${attempt}/${maxAttempts}`);
                return await operation();
            } catch (error) {
                lastError = error;
                console.log(`❌ [FailSafeService] Emergency operation attempt ${attempt} failed:`, (error as any).message);

                if (attempt < maxAttempts) {
                    const delay = this.config.networkRetryDelay * attempt; // Linear backoff for emergency
                    console.log(`⏳ [FailSafeService] Emergency retry delay ${delay}ms...`);
                    await this.delay(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Circuit breaker management
     */
    private isCircuitBreakerOpen(): boolean {
        if (!this.circuitBreakerState.isOpen) {
            return false;
        }

        const now = Date.now();
        if (now >= this.circuitBreakerState.nextAttemptTime) {
            console.log('🔄 [FailSafeService] Circuit breaker timeout reached, attempting reset');
            this.circuitBreakerState.isOpen = false;
            this.circuitBreakerState.failureCount = 0;
            return false;
        }

        return true;
    }

    private recordFailure(): void {
        this.circuitBreakerState.failureCount++;
        this.circuitBreakerState.lastFailureTime = Date.now();

        if (this.circuitBreakerState.failureCount >= this.config.maxFailures) {
            this.circuitBreakerState.isOpen = true;
            this.circuitBreakerState.nextAttemptTime = Date.now() + this.config.circuitBreakerTimeout;
            console.log(`🔴 [FailSafeService] Circuit breaker opened after ${this.circuitBreakerState.failureCount} failures`);
        }
    }

    private resetCircuitBreaker(): void {
        this.circuitBreakerState = {
            isOpen: false,
            failureCount: 0,
            lastFailureTime: 0,
            nextAttemptTime: 0
        };
        console.log('🟢 [FailSafeService] Circuit breaker reset');
    }

    /**
     * Utility function for delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(): CircuitBreakerState {
        return { ...this.circuitBreakerState };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<FailSafeConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ [FailSafeService] Configuration updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig(): FailSafeConfig {
        return { ...this.config };
    }

    /**
     * Force reset circuit breaker
     */
    forceResetCircuitBreaker(): void {
        this.resetCircuitBreaker();
        console.log('🔄 [FailSafeService] Circuit breaker force reset');
    }
}

// Export singleton instance
export const failSafeService = FailSafeService.getInstance();
