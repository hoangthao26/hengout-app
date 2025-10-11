import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Settings, TestTube } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import { useAuthStore } from '../../store/authStore';
import NavigationService from '../../services/navigationService';

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error, info, warning, loading, hideLoading } = useToast();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { fastLogout, isLoading } = useAuthStore();

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
                            // 🚀 OPTIMISTIC LOGOUT: Navigate immediately for better UX
                            setIsLoggingOut(true);

                            // 1. Navigate to login immediately
                            NavigationService.logoutToLogin();

                            // 2. Show success toast
                            success('Đã đăng xuất thành công');

                            // 3. Background logout (non-blocking)
                            setTimeout(async () => {
                                try {
                                    // 🚀 SET LOGOUT FLAGS: Prevent race conditions
                                    const { setLogoutMode, setUserLoggedOut } = await import('../../config/axios');
                                    setLogoutMode(true);
                                    setUserLoggedOut(true);

                                    // 🚀 BACKGROUND LOGOUT: Clear data without blocking UI
                                    await fastLogout();
                                } catch (error: any) {
                                    console.error('Background logout failed:', error);
                                    // Don't show error to user since they're already logged out
                                }
                            }, 100); // Small delay to ensure navigation completes

                        } catch (error: any) {
                            console.error('Logout navigation failed:', error);
                            error('Đăng xuất thất bại');
                            setIsLoggingOut(false);
                        }
                    },
                },
            ]
        );
    };


    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Header */}
            <Header
                title="Cài đặt"
                onBackPress={() => NavigationService.goBack()}
                variant="settings"
            />

            {/* Settings Content */}
            <View style={styles.content}>
                {/* Preferences Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={() => NavigationService.goToPreferences()}
                >
                    <View style={styles.settingLeft}>
                        <Settings
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Preferences
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* Gesture Test Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={() => router.push('/settings/gesture-test')}
                >
                    <View style={styles.settingLeft}>
                        <TestTube
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Gesture Handler Test
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* Simple Gesture Test Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={() => router.push('/settings/simple-gesture-test')}
                >
                    <View style={styles.settingLeft}>
                        <TestTube
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Simple Gesture Test
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* Ultra Simple Test Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={() => router.push('/settings/ultra-simple-test')}
                >
                    <View style={styles.settingLeft}>
                        <TestTube
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Ultra Simple Test
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* Toast Test Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={() => router.push('/settings/toast-test')}
                >
                    <View style={styles.settingLeft}>
                        <TestTube
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Toast Test
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* Logout Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={handleLogout}
                    disabled={isLoggingOut || isLoading}
                >
                    <View style={styles.settingLeft}>
                        <LogOut
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Đăng xuất
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Header styles removed - now using Header component
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
});
