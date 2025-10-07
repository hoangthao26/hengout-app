import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { AppError } from '../../types/error';

// ============================================================================
// MAP ERROR BOUNDARY PROPS
// ============================================================================

interface MapErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: AppError) => void;
}

// ============================================================================
// MAP ERROR BOUNDARY COMPONENT
// ============================================================================

export const MapErrorBoundary: React.FC<MapErrorBoundaryProps> = ({ children, onError }) => {
    const handleError = (error: AppError) => {
        console.log('🗺️ Map Error Boundary caught error:', error);
        onError?.(error);
    };

    const mapFallback = (
        <View style={styles.container}>
            <Text style={styles.icon}>🗺️</Text>
            <Text style={styles.title}>Map Error</Text>
            <Text style={styles.message}>
                Something went wrong with the map. Please check your location permissions and try again.
            </Text>
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Reload Map</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <FeatureErrorBoundary
            feature="Map"
            fallback={mapFallback}
            onError={handleError}
            enableRecovery={true}
            maxRetries={3}
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
        backgroundColor: '#e8f5e8',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2e7d32',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#2e7d32',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        backgroundColor: '#4caf50',
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

