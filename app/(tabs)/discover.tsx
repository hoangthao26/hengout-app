import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { AuthHelper } from '../../services/authHelper';
import NavigationService from '../../services/navigationService';

export default function DiscoverScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error, info, warning, loading, hideLoading } = useToast();
    const router = useRouter();

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AuthHelper.logout();
                            success('Đã đăng xuất thành công');
                            NavigationService.logoutToLogin();
                        } catch (error: any) {
                            console.error('Logout failed:', error);
                            error('Đăng xuất thất bại');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    🎉 Discover Screen
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    Auto-login thành công! Bạn đã vào được màn hình Discover.
                </Text>


                {/* Temporary Logout Button */}
                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: '#DC2F02' }]}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutButtonText}>Logout (Test)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
    },
    logoutButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
