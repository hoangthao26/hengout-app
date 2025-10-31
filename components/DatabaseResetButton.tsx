import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { chatSyncService } from '../services/chatSyncService';

export default function DatabaseResetButton() {
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        Alert.alert(
            'Reset Database',
            'This will delete all local chat data and re-sync from server. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsResetting(true);
                            console.log('[DatabaseResetButton] Starting database reset...');

                            await chatSyncService.resetDatabase();

                            console.log('[DatabaseResetButton] Database reset completed');
                            Alert.alert('Success', 'Database reset completed successfully!');
                        } catch (error) {
                            console.error('[DatabaseResetButton] Database reset failed:', error);
                            Alert.alert('Error', 'Failed to reset database');
                        } finally {
                            setIsResetting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <TouchableOpacity
            style={[styles.button, isResetting && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={isResetting}
        >
            <Text style={styles.buttonText}>
                {isResetting ? 'Resetting...' : 'Reset Database'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        margin: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

