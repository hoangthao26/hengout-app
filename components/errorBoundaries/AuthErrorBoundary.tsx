import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { AppError } from '../../types/error';
import NavigationService from '../../services/navigationService';

// ============================================================================
// AUTH ERROR BOUNDARY PROPS
// ============================================================================

interface AuthErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: AppError) => void;
}

// ============================================================================
// AUTH ERROR BOUNDARY COMPONENT
// ============================================================================

export const AuthErrorBoundary: React.FC<AuthErrorBoundaryProps> = ({ children, onError }) => {
    const handleError = (error: AppError) => {
        console.log('🔐 Auth Error Boundary caught error:', error);
        onError?.(error);
    };

    const authFallback = (retry: () => void, canRetry: boolean) => (
        <View style={styles.container}>
            <Text style={styles.icon}>🔐</Text>
            <Text style={styles.title}>Authentication Error</Text>
            <Text style={styles.message}>
                Something went wrong with the authentication process. Please try again.
            </Text>
            <View style={styles.buttonContainer}>
                {canRetry && (
                    <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={retry}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity 
                    style={[styles.button, styles.loginButton]} 
                    onPress={() => NavigationService.logoutToLogin()}
                >
                    <Text style={styles.buttonText}>Go to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <FeatureErrorBoundary
            feature="Authentication"
            fallback={authFallback}
            onError={handleError}
            enableRecovery={true}
            maxRetries={1}
        >
            {children}
        </FeatureErrorBoundary>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff3cd',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#856404',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButton: {
        backgroundColor: '#ffc107',
    },
    loginButton: {
        backgroundColor: '#856404',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});

