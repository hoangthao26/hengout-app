import { AppError, ErrorCategory, ErrorSeverity, createAppError } from '../types/error';

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

class GlobalErrorHandler {
    private static instance: GlobalErrorHandler;
    private errorListeners: Array<(error: AppError) => void> = [];
    private isInitialized = false;

    private constructor() { }

    static getInstance(): GlobalErrorHandler {
        if (!GlobalErrorHandler.instance) {
            GlobalErrorHandler.instance = new GlobalErrorHandler();
        }
        return GlobalErrorHandler.instance;
    }

    /**
     * Initialize global error handlers
     */
    initialize(): void {
        if (this.isInitialized) {
            console.warn('GlobalErrorHandler already initialized');
            return;
        }

        console.log('🚀 Initializing Global Error Handler...');

        // Handle unhandled JavaScript errors
        this.setupJavaScriptErrorHandler();

        // Handle unhandled promise rejections
        this.setupPromiseRejectionHandler();

        // Handle console errors
        this.setupConsoleErrorHandler();

        this.isInitialized = true;
        console.log('✅ Global Error Handler initialized');
    }

    /**
     * Setup JavaScript error handler
     */
    private setupJavaScriptErrorHandler(): void {
        const originalErrorHandler = ErrorUtils.getGlobalHandler();

        ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
            console.log('🚨 Global JavaScript Error:', error);

            // Create structured error
            const appError = createAppError(
                error,
                ErrorCategory.SYSTEM,
                isFatal === true ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
                {
                    component: 'GlobalErrorHandler',
                    action: 'javascriptError',
                    isFatal,
                    stack: error.stack
                }
            );

            // Notify listeners
            this.notifyListeners(appError);

            // Call original handler
            if (originalErrorHandler) {
                originalErrorHandler(error, isFatal);
            }
        });
    }

    /**
     * Setup promise rejection handler
     */
    private setupPromiseRejectionHandler(): void {
        // Handle unhandled promise rejections
        const handleUnhandledRejection = (event: any) => {
            console.log('🚨 Unhandled Promise Rejection:', event);

            const error = event.reason || new Error('Unhandled Promise Rejection');
            const appError = createAppError(
                error,
                ErrorCategory.SYSTEM,
                ErrorSeverity.HIGH,
                {
                    component: 'GlobalErrorHandler',
                    action: 'promiseRejection',
                    promise: event.promise,
                    stack: error.stack
                }
            );

            this.notifyListeners(appError);
        };

        // Add event listener for unhandled promise rejections
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('unhandledrejection', handleUnhandledRejection);
        }
    }

    /**
     * Setup console error handler
     */
    private setupConsoleErrorHandler(): void {
        const originalConsoleError = console.error;

        console.error = (...args: any[]) => {
            // Check if this is an error we should track
            const errorMessage = args.join(' ');

            // Skip certain error patterns to avoid noise
            const skipPatterns = [
                'Warning:',
                'Deprecation warning:',
                'React DevTools',
                'Remote debugger',
                'SaveLocationModal',
                'Failed to save location to folder',
                'addLocationToFolder',
                'Request failed with status code 409'
            ];

            const shouldSkip = skipPatterns.some(pattern =>
                errorMessage.includes(pattern)
            );

            if (!shouldSkip && errorMessage.includes('Error:')) {
                const appError = createAppError(
                    errorMessage,
                    ErrorCategory.SYSTEM,
                    ErrorSeverity.MEDIUM,
                    {
                        component: 'GlobalErrorHandler',
                        action: 'consoleError',
                        originalArgs: args
                    }
                );

                this.notifyListeners(appError);
            }

            // Call original console.error
            originalConsoleError.apply(console, args);
        };
    }

    /**
     * Add error listener
     */
    addErrorListener(listener: (error: AppError) => void): () => void {
        this.errorListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.errorListeners.indexOf(listener);
            if (index > -1) {
                this.errorListeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners about an error
     */
    private notifyListeners(error: AppError): void {
        this.errorListeners.forEach(listener => {
            try {
                listener(error);
            } catch (listenerError) {
                console.log('Error in error listener:', listenerError);
            }
        });
    }

    /**
     * Manually report an error
     */
    reportError(
        error: Error | string,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context?: AppError['context']
    ): void {
        const appError = createAppError(error, category, severity, context);
        this.notifyListeners(appError);
    }

    /**
     * Get error statistics
     */
    getErrorStats(): {
        totalListeners: number;
        isInitialized: boolean;
    } {
        return {
            totalListeners: this.errorListeners.length,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.errorListeners = [];
        this.isInitialized = false;
        console.log('🧹 Global Error Handler cleaned up');
    }
}

// ============================================================================
// NETWORK ERROR HANDLER
// ============================================================================

class NetworkErrorHandler {
    private static instance: NetworkErrorHandler;
    private isOnline = true;
    private onlineListeners: Array<(isOnline: boolean) => void> = [];

    private constructor() { }

    static getInstance(): NetworkErrorHandler {
        if (!NetworkErrorHandler.instance) {
            NetworkErrorHandler.instance = new NetworkErrorHandler();
        }
        return NetworkErrorHandler.instance;
    }

    /**
     * Initialize network monitoring
     */
    initialize(): void {
        console.log('🌐 Initializing Network Error Handler...');

        // Check initial network status
        this.checkNetworkStatus();

        // Set up periodic network checks
        setInterval(() => {
            this.checkNetworkStatus();
        }, 30000); // Check every 30 seconds

        console.log('✅ Network Error Handler initialized');
    }

    /**
     * Check network status
     */
    private async checkNetworkStatus(): Promise<void> {
        try {
            // Simple network check
            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
            });

            const wasOnline = this.isOnline;
            this.isOnline = true;

            if (!wasOnline) {
                console.log('🌐 Network connection restored');
                this.notifyOnlineListeners(true);

                // Reinitialize WebSocket after network reconnect
                this.handleNetworkReconnect();
            }
        } catch (error) {
            const wasOnline = this.isOnline;
            this.isOnline = false;

            if (wasOnline) {
                console.log('🌐 Network connection lost');
                this.notifyOnlineListeners(false);

                // Report network error
                const globalHandler = GlobalErrorHandler.getInstance();
                globalHandler.reportError(
                    'Network connection lost',
                    ErrorCategory.NETWORK,
                    ErrorSeverity.MEDIUM,
                    {
                        component: 'NetworkErrorHandler',
                        action: 'networkCheck',
                        error: error
                    }
                );
            }
        }
    }

    /**
     * Add online status listener
     */
    addOnlineListener(listener: (isOnline: boolean) => void): () => void {
        this.onlineListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.onlineListeners.indexOf(listener);
            if (index > -1) {
                this.onlineListeners.splice(index, 1);
            }
        };
    }

    /**
     * Handle network reconnect - reinitialize WebSocket
     */
    private async handleNetworkReconnect(): Promise<void> {
        try {
            console.log('🔄 [NetworkErrorHandler] Handling network reconnect...');

            // Check if user is authenticated before reinitializing WebSocket
            const { useAuthStore } = await import('../store/authStore');
            const isAuthenticated = useAuthStore.getState().isAuthenticated;

            if (isAuthenticated) {
                const { initializationService } = await import('./initializationService');
                await initializationService.reinitializeWebSocket();
                console.log('✅ [NetworkErrorHandler] WebSocket reinitialized after network reconnect');
            } else {
                console.log('ℹ️ [NetworkErrorHandler] User not authenticated, skipping WebSocket reinitialization');
            }
        } catch (error) {
            console.error('❌ [NetworkErrorHandler] WebSocket reinitialization failed:', error);
            // Don't block network reconnect flow
        }
    }

    /**
     * Notify online listeners
     */
    private notifyOnlineListeners(isOnline: boolean): void {
        this.onlineListeners.forEach(listener => {
            try {
                listener(isOnline);
            } catch (error) {
                console.log('Error in online listener:', error);
            }
        });
    }

    /**
     * Get current network status
     */
    getNetworkStatus(): boolean {
        return this.isOnline;
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.onlineListeners = [];
        console.log('🧹 Network Error Handler cleaned up');
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const globalErrorHandler = GlobalErrorHandler.getInstance();
export const networkErrorHandler = NetworkErrorHandler.getInstance();

// Initialize handlers
globalErrorHandler.initialize();
networkErrorHandler.initialize();
