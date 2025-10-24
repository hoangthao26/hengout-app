import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Image, useColorScheme, Alert } from 'react-native';
import { refreshTokenManager } from '../services/refreshTokenManager';
import NavigationService from '../services/navigationService';
import { useAuthStore } from '../store';
import { useAppStore } from '../store/appStore';
import { initializationService } from '../services/initializationService';
import * as Location from 'expo-location';
import { initializationService as initSvc } from '../services/initializationService';

export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { initializeAuth, isLoading, isAuthenticated } = useAuthStore();

  // App initialization state
  const {
    isAppReady,
    isServicesReady,
    isChatDataPreloaded // ✅ Thêm chat data preloaded status
  } = useAppStore();

  // GPS Location state
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);

  // 🚀 ENTERPRISE FEATURE: Initialize all services on app start (ONCE)
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');

        // Initialize authentication
        initializeAuth();

        // Initialize all services (Database, Location, Chat Services)
        await initializationService.initialize();

        console.log('✅ App initialized');

        // MVP: centralize lightweight user init on app start
        initSvc.initOnAppStart();
      } catch (error) {
        console.error('❌ [SplashScreen] App initialization failed:', error);
        // Continue with app - some services might still work
      }
    };

    initializeApp();
  }, []); // ✅ Empty dependency array để chỉ chạy 1 lần

  // 🗺️ ENTERPRISE FEATURE: Get GPS location after services are ready
  useEffect(() => {
    const getLocationData = async () => {
      // Only get location if services are ready
      if (!isServicesReady) return;

      try {
        // Check if location services are enabled
        const isLocationEnabled = await Location.hasServicesEnabledAsync();

        if (!isLocationEnabled) {
          console.log('📍 Location disabled, using fallback');
          setLocationData({
            latitude: 10.8231,
            longitude: 106.6297,
            accuracy: 0
          });
          return;
        }

        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.log('📍 Location permission denied, using fallback');
          setLocationData({
            latitude: 10.8231,
            longitude: 106.6297,
            accuracy: 0
          });
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (location) {
          console.log('📍 GPS location obtained');

          setLocationData({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined
          });
        }
      } catch (error) {
        console.log('📍 GPS error, using fallback');
        setLocationData({
          latitude: 10.8231,
          longitude: 106.6297,
          accuracy: 0
        });
      }
    };

    getLocationData();
  }, [isServicesReady]);

  // 🔥 Token monitoring is started by AuthStore to avoid duplicate starts (removed here)

  // 🔥 ENTERPRISE FEATURE: Handle app state changes for background refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isAuthenticated) {
        console.log('📱 App became active');
        refreshTokenManager.checkAndRefreshOnResume();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated]);

  // 🚀 ENTERPRISE FEATURE: Handle navigation based on app readiness
  useEffect(() => {
    // State change monitoring (reduced logging)

    // ✅ ĐỢI CHAT DATA PRELOADED HOÀN THÀNH
    if (!isLoading && isAppReady && isChatDataPreloaded && locationData) {
      // Navigate immediately when both auth and GPS are ready
      const navigate = () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300, // Faster fade out
          useNativeDriver: true,
        }).start(() => {
          // Navigate based on authentication state
          if (isAuthenticated) {
            console.log('✅ Navigating to main app');
            // Pass location data to Discover screen
            NavigationService.secureNavigateToDiscover(locationData);
          } else {
            console.log('❌ Navigating to login');
            NavigationService.goToLogin();
          }
        });
      };

      // Add delay for better UX (1 second since GPS already took time)
      const timer = setTimeout(navigate, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, isAppReady, isChatDataPreloaded, locationData, router, fadeAnim]); // ✅ Thêm isChatDataPreloaded vào dependencies

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
