import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { AppError } from '../../types/error';

// ============================================================================
// CHAT ERROR BOUNDARY PROPS
// ============================================================================

interface ChatErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: AppError) => void;
}

// ============================================================================
// CHAT ERROR BOUNDARY COMPONENT
// ============================================================================

export const ChatErrorBoundary: React.FC<ChatErrorBoundaryProps> = ({ children, onError }) => {
    const handleError = (error: AppError) => {
        console.log('💬 Chat Error Boundary caught error:', error);
        onError?.(error);
    };

    const chatFallback = (
        <View style={styles.container}>
            <Text style={styles.icon}>💬</Text>
            <Text style={styles.title}>Chat Error</Text>
            <Text style={styles.message}>
                Something went wrong with the chat. Your messages are safe and will be restored when you try again.
            </Text>
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Reload Chat</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <FeatureErrorBoundary
            feature="Chat"
            fallback={chatFallback}
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
        backgroundColor: '#e3f2fd',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1565c0',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#1565c0',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        backgroundColor: '#2196f3',
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

