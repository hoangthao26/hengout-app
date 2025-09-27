import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, AppState, Image, useColorScheme } from 'react-native';
import { refreshTokenManager } from '../services/refreshTokenManager';
import { useAuthStore } from '../store';

export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { initializeAuth, isLoading, isAuthenticated } = useAuthStore();

  // Initialize authentication on app start
  useEffect(() => {
    console.log('🚀 [SplashScreen] App started, initializing auth...');
    initializeAuth();
  }, [initializeAuth]);

  // 🔥 ENTERPRISE FEATURE: Start token refresh monitoring
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('🔄 [SplashScreen] Starting token refresh monitoring...');
      refreshTokenManager.startMonitoring();
    }

    return () => {
      console.log('⏹️ [SplashScreen] Stopping token refresh monitoring...');
      refreshTokenManager.stopMonitoring();
    };
  }, [isAuthenticated, isLoading]);

  // 🔥 ENTERPRISE FEATURE: Handle app state changes for background refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isAuthenticated) {
        console.log('📱 [SplashScreen] App became active, checking token...');
        refreshTokenManager.checkAndRefreshOnResume();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated]);

  // Handle navigation based on authentication state
  useEffect(() => {
    console.log('🔄 [SplashScreen] Auth state changed:', { isLoading, isAuthenticated });

    if (!isLoading) {
      // Navigate immediately when auth check is complete (no artificial delay)
      const navigate = () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300, // Faster fade out
          useNativeDriver: true,
        }).start(() => {
          // Navigate based on authentication state
          if (isAuthenticated) {
            console.log('✅ [SplashScreen] User is authenticated, navigating to main app');
            router.replace('/(tabs)/discover' as any); // User is logged in, go to discover tab
          } else {
            console.log('❌ [SplashScreen] User not authenticated, navigating to login');
            router.replace('/auth/login'); // User needs to login
          }
        });
      };

      // Add delay for better UX (1.5 seconds)
      const timer = setTimeout(navigate, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, router, fadeAnim]);

  return (
    <Animated.View
      className="flex-1 bg-white dark:bg-black items-center justify-center"
      style={{ opacity: fadeAnim }}
    >
      <Image
        source={
          colorScheme === 'dark'
            ? require('../assets/images/HengOut-Dark.png')
            : require('../assets/images/HengOut-Light.png')
        }
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
      />

    </Animated.View>
  );
}
