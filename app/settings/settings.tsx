import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Settings, TestTube, AlertTriangle } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import { useAuthStore } from '../../store/authStore';
import NavigationService from '../../services/navigationService';
import { AuthHelper } from '../../services/authHelper';

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error, info, warning, loading, hideLoading } = useToast();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isTestingInvalidToken, setIsTestingInvalidToken] = useState(false);
    const [isTestingApiCall, setIsTestingApiCall] = useState(false);
    const [isTestingExpiredToken, setIsTestingExpiredToken] = useState(false);
    const [isTestingAppResume, setIsTestingAppResume] = useState(false);
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

    const handleTestInvalidRefreshToken = async () => {
        Alert.alert(
            '🧪 Test Invalid Refresh Token',
            'Test này sẽ:\n\n1. Làm cho refresh token trở thành invalid\n2. Trigger refresh attempt\n3. Retry 2 lần\n4. Logout khi tất cả attempts fail\n\nBạn có muốn tiếp tục?',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Test',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsTestingInvalidToken(true);
                            loading('Đang test invalid refresh token...');

                            // Step 1: Get current tokens
                            const currentTokens = await AuthHelper.getTokens();
                            if (!currentTokens) {
                                error('Không tìm thấy tokens để test');
                                return;
                            }

                            info('📝 Bước 1: Lưu tokens hiện tại');
                            console.log('🔍 Current tokens:', {
                                hasAccessToken: !!currentTokens.accessToken,
                                hasRefreshToken: !!currentTokens.refreshToken,
                                expiresAt: new Date(currentTokens.expiresAt).toISOString(),
                            });

                            // Step 2: Corrupt the refresh token to make it invalid
                            const corruptedTokens = {
                                ...currentTokens,
                                refreshToken: 'invalid-refresh-token-' + Date.now(),
                            };

                            await AuthHelper.saveTokens(corruptedTokens);
                            info('💥 Bước 2: Đã làm hỏng refresh token');

                            // Step 3: Trigger a refresh attempt by making an API call
                            info('🔄 Bước 3: Trigger refresh attempt...');

                            // Import refreshTokenManager to trigger refresh
                            const { refreshTokenManager } = await import('../../services/refreshTokenManager');

                            // This will trigger the refresh flow
                            const refreshResult = await refreshTokenManager.performRefresh();

                            if (refreshResult) {
                                warning('⚠️ Refresh thành công (không mong đợi)');
                            } else {
                                success('✅ Test hoàn thành! Refresh failed và user đã được logout');
                            }

                        } catch (error: any) {
                            console.error('Test invalid refresh token error:', error);
                            error('Test failed: ' + error.message);
                        } finally {
                            setIsTestingInvalidToken(false);
                            hideLoading();
                        }
                    },
                },
            ]
        );
    };

    const handleTestApiCallWithInvalidToken = async () => {
        Alert.alert(
            '🧪 Test API Call với Invalid Token',
            'Test này sẽ:\n\n0. Reset logout flags\n1. Làm cho cả access token và refresh token trở thành invalid\n2. Gọi API (sẽ trigger 401)\n3. Axios interceptor sẽ retry refresh\n4. Refresh fail → Logout\n\nĐây là scenario thực tế nhất!',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Test',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsTestingApiCall(true);
                            loading('Đang test API call với invalid token...');

                            // Step 0: Reset logout flags to ensure fresh test
                            const { setLogoutMode, setUserLoggedOut } = await import('../../config/axios');
                            setLogoutMode(false);
                            setUserLoggedOut(false);
                            info('🔄 Bước 0: Reset logout flags');

                            // Step 1: Get current tokens
                            const currentTokens = await AuthHelper.getTokens();
                            if (!currentTokens) {
                                error('Không tìm thấy tokens để test');
                                return;
                            }

                            info('📝 Bước 1: Lưu tokens hiện tại');
                            console.log('🔍 Current tokens:', {
                                hasAccessToken: !!currentTokens.accessToken,
                                hasRefreshToken: !!currentTokens.refreshToken,
                                expiresAt: new Date(currentTokens.expiresAt).toISOString(),
                            });

                            // Step 2: Corrupt BOTH tokens to make them invalid
                            const corruptedTokens = {
                                ...currentTokens,
                                accessToken: 'invalid-access-token-' + Date.now(),
                                refreshToken: 'invalid-refresh-token-' + Date.now(),
                            };

                            await AuthHelper.saveTokens(corruptedTokens);
                            info('💥 Bước 2: Đã làm hỏng cả access token và refresh token');

                            // Step 3: Make an API call that will trigger 401 and refresh flow
                            info('🔄 Bước 3: Gọi API (sẽ trigger 401 và refresh flow)...');

                            // Import profileService to make a real API call
                            const { profileService } = await import('../../services/profileService');

                            // This API call will fail with 401, trigger axios interceptor, 
                            // which will try to refresh token, fail, and logout user
                            try {
                                await profileService.getUserProfile();
                                warning('⚠️ API call thành công (không mong đợi)');
                            } catch (apiError: any) {
                                if (apiError.message?.includes('User logged out') || apiError.message?.includes('Token refresh failed')) {
                                    success('✅ Test hoàn thành! API call failed, refresh failed, user đã được logout');
                                } else {
                                    error('API call failed với lỗi khác: ' + apiError.message);
                                }
                            }

                        } catch (error: any) {
                            console.error('Test API call with invalid token error:', error);
                            error('Test failed: ' + error.message);
                        } finally {
                            setIsTestingApiCall(false);
                            hideLoading();
                        }
                    },
                },
            ]
        );
    };

    const handleTestExpiredToken = async () => {
        Alert.alert(
            '🧪 Test Token Hết Hạn Bình Thường',
            'Test này sẽ:\n\n0. Reset logout flags\n1. Làm cho access token hết hạn (nhưng refresh token vẫn valid)\n2. Gọi API (sẽ trigger 401)\n3. Axios interceptor sẽ refresh token\n4. Refresh thành công → Tiếp tục sử dụng\n\nĐây là scenario thực tế khi token hết hạn!',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Test',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setIsTestingExpiredToken(true);
                            loading('Đang test token hết hạn bình thường...');

                            // Step 0: Reset logout flags
                            const { setLogoutMode, setUserLoggedOut } = await import('../../config/axios');
                            setLogoutMode(false);
                            setUserLoggedOut(false);
                            info('🔄 Bước 0: Reset logout flags');

                            // Step 1: Get current tokens
                            const currentTokens = await AuthHelper.getTokens();
                            if (!currentTokens) {
                                error('Không tìm thấy tokens để test');
                                return;
                            }

                            info('📝 Bước 1: Lưu tokens hiện tại');
                            console.log('🔍 Current tokens:', {
                                hasAccessToken: !!currentTokens.accessToken,
                                hasRefreshToken: !!currentTokens.refreshToken,
                                expiresAt: new Date(currentTokens.expiresAt).toISOString(),
                            });

                            // Step 2: Make access token expired (but keep refresh token valid)
                            const expiredTokens = {
                                ...currentTokens,
                                accessToken: 'expired-access-token-' + Date.now(),
                                expiresAt: Date.now() - 1000, // Expired 1 second ago
                            };

                            await AuthHelper.saveTokens(expiredTokens);
                            info('⏰ Bước 2: Đã làm cho access token hết hạn (refresh token vẫn valid)');

                            // Step 3: Make an API call that will trigger 401 and refresh flow
                            info('🔄 Bước 3: Gọi API (sẽ trigger 401 và refresh flow)...');

                            // Import profileService to make a real API call
                            const { profileService } = await import('../../services/profileService');

                            // This API call will fail with 401, trigger axios interceptor, 
                            // which will try to refresh token, succeed, and retry the API call
                            try {
                                await profileService.getUserProfile();
                                success('✅ Test hoàn thành! API call thành công sau khi refresh token');
                            } catch (apiError: any) {
                                if (apiError.message?.includes('User logged out') || apiError.message?.includes('Token refresh failed')) {
                                    error('❌ Test failed: Refresh token cũng invalid hoặc có lỗi khác');
                                } else {
                                    error('API call failed với lỗi khác: ' + apiError.message);
                                }
                            }

                        } catch (error: any) {
                            console.error('Test expired token error:', error);
                            error('Test failed: ' + error.message);
                        } finally {
                            setIsTestingExpiredToken(false);
                            hideLoading();
                        }
                    },
                },
            ]
        );
    };

    const handleTestAppResumeWithInvalidToken = async () => {
        Alert.alert(
            '🧪 Test App Resume Thật (Kill App)',
            'Test này sẽ hướng dẫn bạn test scenario thật:\n\n1. Làm hỏng cả access token và refresh token\n2. Kill app hoàn toàn (swipe up và swipe away)\n3. Mở lại app\n4. App sẽ tự động check token và logout\n\nĐây là test thật với kill app!',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Bắt đầu',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsTestingAppResume(true);
                            loading('Đang chuẩn bị test app resume thật...');

                            // Step 1: Get current tokens
                            const currentTokens = await AuthHelper.getTokens();
                            if (!currentTokens) {
                                error('Không tìm thấy tokens để test');
                                return;
                            }

                            info('📝 Bước 1: Lưu tokens hiện tại');
                            console.log('🔍 Current tokens:', {
                                hasAccessToken: !!currentTokens.accessToken,
                                hasRefreshToken: !!currentTokens.refreshToken,
                                expiresAt: new Date(currentTokens.expiresAt).toISOString(),
                            });

                            // Step 2: Corrupt BOTH tokens to make them invalid (realistic scenario)
                            const corruptedTokens = {
                                ...currentTokens,
                                accessToken: 'invalid-access-token-' + Date.now(),
                                refreshToken: 'invalid-refresh-token-' + Date.now(),
                            };

                            await AuthHelper.saveTokens(corruptedTokens);
                            success('✅ Đã làm hỏng cả access token và refresh token!');

                            // Step 3: Show instructions for real test
                            Alert.alert(
                                '📱 Hướng dẫn Test Thật',
                                'Bây giờ hãy:\n\n1. Kill app hoàn toàn (swipe up và swipe away)\n2. Mở lại app\n3. App sẽ tự động detect invalid token\n4. Retry 2 lần → Fail → Logout\n\nQuan sát console logs để xem flow!',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            info('🔍 Quan sát console logs khi mở lại app!');
                                            setIsTestingAppResume(false);
                                            hideLoading();
                                        }
                                    }
                                ]
                            );

                        } catch (error: any) {
                            console.error('Test real app resume error:', error);
                            error('Test failed: ' + error.message);
                            setIsTestingAppResume(false);
                            hideLoading();
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

                {/* Invalid Refresh Token Test Option */}
                <TouchableOpacity
                    style={[
                        styles.settingItem,
                        {
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                            opacity: isTestingInvalidToken ? 0.6 : 1
                        }
                    ]}
                    onPress={handleTestInvalidRefreshToken}
                    disabled={isTestingInvalidToken}
                >
                    <View style={styles.settingLeft}>
                        <AlertTriangle
                            size={24}
                            color={isDark ? '#EF4444' : '#DC2626'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Test Invalid Refresh Token (Direct)
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* API Call with Invalid Token Test Option */}
                <TouchableOpacity
                    style={[
                        styles.settingItem,
                        {
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                            opacity: isTestingApiCall ? 0.6 : 1
                        }
                    ]}
                    onPress={handleTestApiCallWithInvalidToken}
                    disabled={isTestingApiCall}
                >
                    <View style={styles.settingLeft}>
                        <AlertTriangle
                            size={24}
                            color={isDark ? '#F59E0B' : '#D97706'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Test Invalid Token via API Call
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* Expired Token Test Option */}
                <TouchableOpacity
                    style={[
                        styles.settingItem,
                        {
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                            opacity: isTestingExpiredToken ? 0.6 : 1
                        }
                    ]}
                    onPress={handleTestExpiredToken}
                    disabled={isTestingExpiredToken}
                >
                    <View style={styles.settingLeft}>
                        <TestTube
                            size={24}
                            color={isDark ? '#10B981' : '#059669'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Test Token Hết Hạn Bình Thường
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                {/* App Resume with Invalid Token Test Option */}
                <TouchableOpacity
                    style={[
                        styles.settingItem,
                        {
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                            opacity: isTestingAppResume ? 0.6 : 1
                        }
                    ]}
                    onPress={handleTestAppResumeWithInvalidToken}
                    disabled={isTestingAppResume}
                >
                    <View style={styles.settingLeft}>
                        <AlertTriangle
                            size={24}
                            color={isDark ? '#8B5CF6' : '#7C3AED'}
                        />
                        <Text style={[styles.settingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Test App Resume Thật (Kill App)
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
