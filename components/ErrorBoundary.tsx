import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import {
    AppError,
    ErrorCategory,
    ErrorSeverity,
    ErrorRecoveryStrategy,
    createAppError,
    getUserFriendlyMessage,
    isRecoverableError,
    ERROR_MESSAGES
} from '../types/error';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: AppError) => void;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    enableRecovery?: boolean;
    maxRetries?: number;
}

interface State {
    hasError: boolean;
    error?: AppError;
    retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { category = ErrorCategory.RENDERING, severity = ErrorSeverity.HIGH } = this.props;

        // Create structured error
        const appError = createAppError(error, category, severity, {
            component: this.constructor.name,
            action: 'componentDidCatch',
            stack: errorInfo.componentStack
        });

        // Log error
        console.error('[ErrorBoundary] ErrorBoundary caught error:', {
            error: appError,
            errorInfo,
            retryCount: this.state.retryCount
        });

        // Update state with structured error
        this.setState({ error: appError });

        // Notify parent component
        this.props.onError?.(appError);
    }

    handleRetry = () => {
        const { maxRetries = 3, enableRecovery = true } = this.props;
        const { retryCount, error } = this.state;

        if (!enableRecovery || !error) {
            return;
        }

        // Check if error is recoverable
        if (!isRecoverableError(error)) {
            Alert.alert(
                'Critical Error',
                'This error cannot be recovered. Please restart the app.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Check retry limit
        if (retryCount >= maxRetries) {
            Alert.alert(
                'Retry Limit Reached',
                'Maximum retry attempts reached. Please try refreshing the app.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Reset error state and increment retry count
        this.setState(prevState => ({
            hasError: false,
            error: undefined,
            retryCount: prevState.retryCount + 1
        }));
    };

    handleReportError = () => {
        const { error } = this.state;
        if (!error) return;

        // In Phase 3, this will integrate with error reporting service
        console.log('[ErrorBoundary] Error reported:', error);

        Alert.alert(
            'Error Reported',
            'Thank you for reporting this error. We will investigate and fix it.',
            [{ text: 'OK' }]
        );
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error, retryCount } = this.state;
            const { enableRecovery = true, maxRetries = 3 } = this.props;

            if (!error) {
                return (
                    <View style={styles.container}>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>An unexpected error occurred</Text>
                    </View>
                );
            }

            const userMessage = getUserFriendlyMessage(error);
            const canRetry = enableRecovery && isRecoverableError(error) && retryCount < maxRetries;
            const isCritical = error.severity === ErrorSeverity.CRITICAL;

            return (
                <View style={[styles.container, isCritical && styles.criticalContainer]}>
                    <Text style={[styles.title, isCritical && styles.criticalTitle]}>
                        {isCritical ? 'Critical Error' : 'Something went wrong'}
                    </Text>

                    <Text style={styles.message}>
                        {userMessage}
                    </Text>

                    {retryCount > 0 && (
                        <Text style={styles.retryInfo}>
                            Retry attempt: {retryCount}/{maxRetries}
                        </Text>
                    )}

                    <View style={styles.buttonContainer}>
                        {canRetry && (
                            <TouchableOpacity
                                style={[styles.button, styles.retryButton]}
                                onPress={this.handleRetry}
                            >
                                <Text style={styles.buttonText}>Try Again</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.button, styles.reportButton]}
                            onPress={this.handleReportError}
                        >
                            <Text style={styles.buttonText}>Report Error</Text>
                        </TouchableOpacity>
                    </View>

                    {__DEV__ && (
                        <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>Debug Info:</Text>
                            <Text style={styles.debugText}>Category: {error.category}</Text>
                            <Text style={styles.debugText}>Severity: {error.severity}</Text>
                            <Text style={styles.debugText}>ID: {error.id}</Text>
                        </View>
                    )}
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    criticalContainer: {
        backgroundColor: '#ffe6e6',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
        textAlign: 'center',
    },
    criticalTitle: {
        color: '#d32f2f',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
        lineHeight: 22,
    },
    retryInfo: {
        fontSize: 12,
        color: '#999',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    retryButton: {
        backgroundColor: '#007AFF',
    },
    reportButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    debugContainer: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
        width: '100%',
    },
    debugTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 11,
        color: '#6c757d',
        marginBottom: 4,
        fontFamily: 'monospace',
    },
});
