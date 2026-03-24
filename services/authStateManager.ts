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
     * Set new auth state with observer pattern notification
     * 
     * State transition logic:
     * 1. Validates state change (no-op if same state)
     * 2. Updates current state
     * 3. Notifies all registered listeners of state change
     * 
     * Observer pattern: All listeners are notified synchronously when state changes.
     * Listener errors are caught and logged individually (don't block other listeners).
     * 
     * State transitions:
     * - UNKNOWN → LOGGING_IN → AUTHENTICATED (login flow)
     * - AUTHENTICATED → LOGGING_OUT → UNAUTHENTICATED (logout flow)
     * - Any state → UNAUTHENTICATED (forced logout)
     * 
     * @param newState - New authentication state to transition to
     */
    setState(newState: AuthState): void {
        const oldState = this.currentState;

        // No-op if state hasn't changed (prevents unnecessary notifications)
        if (oldState === newState) {
            return;
        }

        // Update current state
        this.currentState = newState;

        // Notify all registered listeners (observer pattern)
        this.listeners.forEach(listener => {
            try {
                listener(newState, oldState);
            } catch (error) {
                // Individual listener errors don't block other listeners
                console.error('[AuthStateManager] Listener error:', error);
            }
        });
    }

    /**
     * Add state change listener
     */
    addListener(listener: AuthStateChangeListener): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Remove all listeners
     */
    clearListeners(): void {
        this.listeners.clear();
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
    }
}

// Export singleton instance
export const authStateManager = AuthStateManager.getInstance();
export default authStateManager;
