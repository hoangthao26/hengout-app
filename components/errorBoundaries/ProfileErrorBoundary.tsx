import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { AppError } from '../../types/error';

// ============================================================================
// PROFILE ERROR BOUNDARY PROPS
// ============================================================================

interface ProfileErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: AppError) => void;
}

// ============================================================================
// PROFILE ERROR BOUNDARY COMPONENT
// ============================================================================

export const ProfileErrorBoundary: React.FC<ProfileErrorBoundaryProps> = ({ children, onError }) => {
    const handleError = (error: AppError) => {
        console.error('[ProfileErrorBoundary] Error caught:', error);
        onError?.(error);
    };

    const profileFallback = (retry: () => void, canRetry: boolean) => (
        <View style={styles.container}>
            <Text style={styles.icon}>👤</Text>
            <Text style={styles.title}>Profile Error</Text>
            <Text style={styles.message}>
                Something went wrong loading your profile. Your data is safe and will be restored when you try again.
            </Text>
            {canRetry && (
                <TouchableOpacity style={styles.button} onPress={retry}>
                    <Text style={styles.buttonText}>Reload Profile</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <FeatureErrorBoundary
            feature="Profile"
            fallback={profileFallback}
            onError={handleError}
            enableRecovery={true}
            maxRetries={2}
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
        backgroundColor: '#f3e5f5',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#7b1fa2',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#7b1fa2',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        backgroundColor: '#9c27b0',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});

