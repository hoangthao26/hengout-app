import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppError, ErrorCategory, ErrorSeverity, createAppError, getUserFriendlyMessage } from '../types/error';

// ============================================================================
// FEATURE ERROR BOUNDARY PROPS
// ============================================================================

interface FeatureErrorBoundaryProps {
    children: ReactNode;
    feature: string;
    fallback?: ReactNode | ((retry: () => void, canRetry: boolean) => ReactNode);
    onError?: (error: AppError) => void;
    enableRecovery?: boolean;
    maxRetries?: number;
}

interface FeatureErrorBoundaryState {
    hasError: boolean;
    error?: AppError;
    retryCount: number;
}

// ============================================================================
// FEATURE ERROR BOUNDARY COMPONENT
// ============================================================================

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
    constructor(props: FeatureErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<FeatureErrorBoundaryState> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { feature } = this.props;

        const appError = createAppError(
            error,
            ErrorCategory.UI,
            ErrorSeverity.MEDIUM,
            {
                component: 'FeatureErrorBoundary',
                feature,
                errorInfo: errorInfo.componentStack,
                retryCount: this.state.retryCount
            }
        );

        this.setState({ error: appError });

        // Notify parent component
        this.props.onError?.(appError);

        console.log(`❌ Feature Error Boundary caught error in ${feature}:`, appError);
    }

    handleRetry = () => {
        const { maxRetries = 2, enableRecovery = true } = this.props;
        const { retryCount } = this.state;

        if (!enableRecovery || retryCount >= maxRetries) {
            return;
        }

        // Reset error state and increment retry count
        this.setState(prevState => ({
            hasError: false,
            error: undefined,
            retryCount: prevState.retryCount + 1
        }));
    };

    render() {
        if (this.state.hasError) {
            const { feature, enableRecovery = true, maxRetries = 2 } = this.props;
            const { error, retryCount } = this.state;
            const canRetry = enableRecovery && retryCount < maxRetries;

            if (this.props.fallback) {
                // Check if fallback is a function (receives retry handler)
                if (typeof this.props.fallback === 'function') {
                    return this.props.fallback(this.handleRetry, canRetry);
                }
                // Otherwise, it's a static ReactNode
                return this.props.fallback;
            }

            if (!error) {
                return (
                    <View style={styles.container}>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>An error occurred in {feature}</Text>
                    </View>
                );
            }

            const userMessage = getUserFriendlyMessage(error);

            return (
                <View style={styles.container}>
                    <Text style={styles.title}>
                        {feature} Error
                    </Text>

                    <Text style={styles.message}>
                        {userMessage}
                    </Text>

                    {retryCount > 0 && (
                        <Text style={styles.retryInfo}>
                            Retry attempt {retryCount}/{maxRetries}
                        </Text>
                    )}

                    {canRetry && (
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={this.handleRetry}
                        >
                            <Text style={styles.retryButtonText}>
                                Try Again
                            </Text>
                        </TouchableOpacity>
                    )}

                    {__DEV__ && (
                        <View style={styles.debugContainer}>
                            <Text style={styles.debugTitle}>Debug Info:</Text>
                            <Text style={styles.debugText}>Feature: {feature}</Text>
                            <Text style={styles.debugText}>Error ID: {error.id}</Text>
                            <Text style={styles.debugText}>Category: {error.category}</Text>
                            <Text style={styles.debugText}>Severity: {error.severity}</Text>
                        </View>
                    )}
                </View>
            );
        }

        return this.props.children;
    }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
        lineHeight: 20,
    },
    retryInfo: {
        fontSize: 12,
        color: '#999',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 20,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
    },
    debugContainer: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#f1f3f4',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e0e0e0',
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

