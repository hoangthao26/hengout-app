import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import {
    AppError,
    ErrorCategory,
    ErrorSeverity,
    ErrorContextType,
    createAppError,
    generateErrorId
} from '../types/error';
import { globalErrorHandler, networkErrorHandler } from '../services/globalErrorHandler';
import { SimpleErrorRecovery } from '../services/simpleErrorRecovery';

// ============================================================================
// ERROR CONTEXT STATE
// ============================================================================

interface ErrorState {
    errors: AppError[];
    isOnline: boolean;
    lastErrorTime: number;
}

type ErrorAction =
    | { type: 'ADD_ERROR'; payload: AppError }
    | { type: 'REMOVE_ERROR'; payload: string }
    | { type: 'CLEAR_ALL_ERRORS' }
    | { type: 'SET_ONLINE_STATUS'; payload: boolean }
    | { type: 'CLEAR_ERRORS_BY_CATEGORY'; payload: ErrorCategory };

// ============================================================================
// ERROR REDUCER
// ============================================================================

const errorReducer = (state: ErrorState, action: ErrorAction): ErrorState => {
    switch (action.type) {
        case 'ADD_ERROR':
            return {
                ...state,
                errors: [...state.errors, action.payload],
                lastErrorTime: Date.now()
            };

        case 'REMOVE_ERROR':
            return {
                ...state,
                errors: state.errors.filter(error => error.id !== action.payload)
            };

        case 'CLEAR_ALL_ERRORS':
            return {
                ...state,
                errors: []
            };

        case 'SET_ONLINE_STATUS':
            return {
                ...state,
                isOnline: action.payload
            };

        case 'CLEAR_ERRORS_BY_CATEGORY':
            return {
                ...state,
                errors: state.errors.filter(error => error.category !== action.payload)
            };

        default:
            return state;
    }
};

// ============================================================================
// ERROR CONTEXT
// ============================================================================

const ErrorContext = createContext<any>(undefined);

interface ErrorProviderProps {
    children: ReactNode;
    maxErrors?: number;
    enableLogging?: boolean;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({
    children,
    maxErrors = 50,
    enableLogging = true
}) => {
    const [state, dispatch] = useReducer(errorReducer, {
        errors: [],
        isOnline: true,
        lastErrorTime: 0
    });

    // ============================================================================
    // ERROR MANAGEMENT FUNCTIONS
    // ============================================================================

    const addError = useCallback((error: AppError) => {
        // Limit number of stored errors
        if (state.errors.length >= maxErrors) {
            // Remove oldest error
            const oldestError = state.errors.reduce((oldest, current) =>
                current.timestamp < oldest.timestamp ? current : oldest
            );
            dispatch({ type: 'REMOVE_ERROR', payload: oldestError.id });
        }

        dispatch({ type: 'ADD_ERROR', payload: error });

        // Log error if enabled
        if (enableLogging) {
            console.log('🚨 Error added to context:', {
                id: error.id,
                category: error.category,
                severity: error.severity,
                message: error.message,
                timestamp: new Date(error.timestamp).toISOString()
            });
        }
    }, [state.errors.length, maxErrors, enableLogging]);

    const clearError = useCallback((errorId: string) => {
        dispatch({ type: 'REMOVE_ERROR', payload: errorId });
    }, []);

    const clearAllErrors = useCallback(() => {
        dispatch({ type: 'CLEAR_ALL_ERRORS' });
    }, []);

    const getErrorsByCategory = useCallback((category: ErrorCategory): AppError[] => {
        return state.errors.filter(error => error.category === category);
    }, [state.errors]);

    const getErrorsBySeverity = useCallback((severity: ErrorSeverity): AppError[] => {
        return state.errors.filter(error => error.severity === severity);
    }, [state.errors]);

    const isErrorPresent = useCallback((category: ErrorCategory): boolean => {
        return state.errors.some(error => error.category === category);
    }, [state.errors]);

    // ============================================================================
    // CONVENIENCE METHODS
    // ============================================================================

    const addNetworkError = useCallback((error: Error | string, context?: AppError['context']) => {
        const appError = createAppError(error, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context);
        addError(appError);
    }, [addError]);

    const addAuthError = useCallback((error: Error | string, context?: AppError['context']) => {
        const appError = createAppError(error, ErrorCategory.AUTH, ErrorSeverity.HIGH, context);
        addError(appError);
    }, [addError]);

    const addValidationError = useCallback((error: Error | string, context?: AppError['context']) => {
        const appError = createAppError(error, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
        addError(appError);
    }, [addError]);

    const addUIError = useCallback((error: Error | string, context?: AppError['context']) => {
        const appError = createAppError(error, ErrorCategory.UI, ErrorSeverity.MEDIUM, context);
        addError(appError);
    }, [addError]);

    const addSystemError = useCallback((error: Error | string, context?: AppError['context']) => {
        const appError = createAppError(error, ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, context);
        addError(appError);
    }, [addError]);

    // ============================================================================
    // NETWORK STATUS MANAGEMENT
    // ============================================================================

    const setOnlineStatus = useCallback((isOnline: boolean) => {
        dispatch({ type: 'SET_ONLINE_STATUS', payload: isOnline });

        if (enableLogging) {
            console.log(`🌐 Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
        }
    }, [enableLogging]);

    // ============================================================================
    // GLOBAL ERROR HANDLER INTEGRATION
    // ============================================================================

    useEffect(() => {
        // Subscribe to global error handler
        const unsubscribeGlobal = globalErrorHandler.addErrorListener((error: AppError) => {
            addError(error);
        });

        // Subscribe to network status changes
        const unsubscribeNetwork = networkErrorHandler.addOnlineListener((isOnline: boolean) => {
            setOnlineStatus(isOnline);
        });

        return () => {
            unsubscribeGlobal();
            unsubscribeNetwork();
        };
    }, [addError, setOnlineStatus]);

    // ============================================================================
    // ERROR STATISTICS
    // ============================================================================

    const getErrorStats = useCallback(() => {
        const stats = {
            total: state.errors.length,
            byCategory: {} as Record<ErrorCategory, number>,
            bySeverity: {} as Record<ErrorSeverity, number>,
            recent: state.errors.filter(error =>
                Date.now() - error.timestamp < 5 * 60 * 1000 // Last 5 minutes
            ).length,
            critical: state.errors.filter(error =>
                error.severity === ErrorSeverity.CRITICAL
            ).length
        };

        // Count by category
        Object.values(ErrorCategory).forEach(category => {
            stats.byCategory[category] = state.errors.filter(error => error.category === category).length;
        });

        // Count by severity
        Object.values(ErrorSeverity).forEach(severity => {
            stats.bySeverity[severity] = state.errors.filter(error => error.severity === severity).length;
        });

        return stats;
    }, [state.errors]);

    // ============================================================================
    // SIMPLE RECOVERY METHODS
    // ============================================================================

    const attemptRecovery = useCallback(async (error: AppError): Promise<boolean> => {
        return await SimpleErrorRecovery.attemptAutoRecovery(error);
    }, []);

    const canRecover = useCallback((error: AppError): boolean => {
        return SimpleErrorRecovery.canRecover(error);
    }, []);

    const getRecoveryMessage = useCallback((error: AppError): string => {
        return SimpleErrorRecovery.getRecoveryMessage(error);
    }, []);

    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================

    const contextValue = {
        // Core methods
        errors: state.errors,
        addError,
        clearError,
        clearAllErrors,
        getErrorsByCategory,
        getErrorsBySeverity,
        isErrorPresent,

        // Convenience methods
        addNetworkError,
        addAuthError,
        addValidationError,
        addUIError,
        addSystemError,
        setOnlineStatus,
        getErrorStats,

        // State
        isOnline: state.isOnline,
        lastErrorTime: state.lastErrorTime,

        // Recovery methods
        attemptRecovery,
        canRecover,
        getRecoveryMessage
    };

    return (
        <ErrorContext.Provider value={contextValue}>
            {children}
        </ErrorContext.Provider>
    );
};

// ============================================================================
// ERROR HOOK
// ============================================================================

export const useError = (): ErrorContextType & {
    addNetworkError: (error: Error | string, context?: AppError['context']) => void;
    addAuthError: (error: Error | string, context?: AppError['context']) => void;
    addValidationError: (error: Error | string, context?: AppError['context']) => void;
    addUIError: (error: Error | string, context?: AppError['context']) => void;
    addSystemError: (error: Error | string, context?: AppError['context']) => void;
    setOnlineStatus: (isOnline: boolean) => void;
    getErrorStats: () => {
        total: number;
        byCategory: Record<ErrorCategory, number>;
        bySeverity: Record<ErrorSeverity, number>;
        recent: number;
        critical: number;
    };
    isOnline: boolean;
    lastErrorTime: number;

    // Recovery methods
    attemptRecovery: (error: AppError) => Promise<boolean>;
    canRecover: (error: AppError) => boolean;
    getRecoveryMessage: (error: AppError) => string;
} => {
    const context = useContext(ErrorContext);

    if (context === undefined) {
        throw new Error('useError must be used within an ErrorProvider');
    }

    return context;
};

// ============================================================================
// ERROR BOUNDARY WITH CONTEXT INTEGRATION
// ============================================================================

interface ErrorBoundaryWithContextProps {
    children: ReactNode;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    enableRecovery?: boolean;
    maxRetries?: number;
}

export const ErrorBoundaryWithContext: React.FC<ErrorBoundaryWithContextProps> = ({
    children,
    category = ErrorCategory.RENDERING,
    severity = ErrorSeverity.HIGH,
    enableRecovery = true,
    maxRetries = 3
}) => {
    const { addError } = useError();

    const handleError = useCallback((error: AppError) => {
        addError(error);
    }, [addError]);

    return (
        <ErrorBoundary
            category={category}
            severity={severity}
            enableRecovery={enableRecovery}
            maxRetries={maxRetries}
            onError={handleError}
        >
            {children}
        </ErrorBoundary>
    );
};

// Import ErrorBoundary from the improved component
import { ErrorBoundary } from '../components/ErrorBoundary';
