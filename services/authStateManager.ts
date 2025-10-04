/**
 * Auth State Manager - Centralized authentication state management
 * 
 * Features:
 * - Centralized auth state
 * - State transitions
 * - Event notifications
 */
export enum AuthState {
    UNKNOWN = 'UNKNOWN',
    LOGGING_IN = 'LOGGING_IN',
    AUTHENTICATED = 'AUTHENTICATED',
    LOGGING_OUT = 'LOGGING_OUT',
    UNAUTHENTICATED = 'UNAUTHENTICATED'
}

export type AuthStateChangeListener = (newState: AuthState, oldState: AuthState) => void;

class AuthStateManager {
    private static instance: AuthStateManager;
    private currentState: AuthState = AuthState.UNKNOWN;
    private listeners: Set<AuthStateChangeListener> = new Set();

    static getInstance(): AuthStateManager {
        if (!AuthStateManager.instance) {
            AuthStateManager.instance = new AuthStateManager();
        }
        return AuthStateManager.instance;
    }

    /**
     * Get current auth state
     */
    getCurrentState(): AuthState {
        return this.currentState;
    }

    /**
     * Set new auth state and notify listeners
     */
    setState(newState: AuthState): void {
        const oldState = this.currentState;

        if (oldState === newState) {
            console.log(`🔄 [AuthStateManager] State unchanged: ${newState}`);
            return;
        }

        console.log(`🔄 [AuthStateManager] State transition: ${oldState} → ${newState}`);
        this.currentState = newState;

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(newState, oldState);
            } catch (error) {
                console.error('❌ [AuthStateManager] Listener error:', error);
            }
        });
    }

    /**
     * Add state change listener
     */
    addListener(listener: AuthStateChangeListener): () => void {
        this.listeners.add(listener);
        console.log(`👂 [AuthStateManager] Added listener (${this.listeners.size} total)`);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
            console.log(`👂 [AuthStateManager] Removed listener (${this.listeners.size} total)`);
        };
    }

    /**
     * Remove all listeners
     */
    clearListeners(): void {
        this.listeners.clear();
        console.log('🧹 [AuthStateManager] Cleared all listeners');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.currentState === AuthState.AUTHENTICATED;
    }

    /**
     * Check if user is logging out
     */
    isLoggingOut(): boolean {
        return this.currentState === AuthState.LOGGING_OUT;
    }

    /**
     * Check if user is unauthenticated
     */
    isUnauthenticated(): boolean {
        return this.currentState === AuthState.UNAUTHENTICATED;
    }

    /**
     * Check if auth state is stable (not transitioning)
     */
    isStable(): boolean {
        return this.currentState === AuthState.AUTHENTICATED ||
            this.currentState === AuthState.UNAUTHENTICATED;
    }

    /**
     * Reset to initial state
     */
    reset(): void {
        this.setState(AuthState.UNKNOWN);
        this.clearListeners();
        console.log('🔄 [AuthStateManager] Reset to initial state');
    }
}

// Export singleton instance
export const authStateManager = AuthStateManager.getInstance();
export default authStateManager;
