import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../components/Header';
import { useToast } from '../contexts/ToastContext';
import { AuthHelper } from '../services/authHelper';
import NavigationService from '../services/navigationService';

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error, info, warning, loading, hideLoading } = useToast();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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
                            setIsLoggingOut(true);
                            await AuthHelper.logout();
                            success('Đã đăng xuất thành công');
                            NavigationService.logoutToLogin();
                        } catch (error: any) {
                            console.error('Logout failed:', error);
                            error('Đăng xuất thất bại');
                        } finally {
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
                    onPress={() => router.push('/settings/preferences')}
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

                {/* Logout Option */}
                <TouchableOpacity
                    style={[styles.settingItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                    onPress={handleLogout}
                    disabled={isLoggingOut}
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
