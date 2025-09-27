import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Image, useColorScheme, Alert } from 'react-native';
import { refreshTokenManager } from '../services/refreshTokenManager';
import NavigationService from '../services/navigationService';
import { useAuthStore } from '../store';
import * as Location from 'expo-location';

export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { initializeAuth, isLoading, isAuthenticated } = useAuthStore();

  // GPS Location state
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Initialize authentication on app start
  useEffect(() => {
    console.log('🚀 [SplashScreen] App started, initializing auth...');
    initializeAuth();
  }, [initializeAuth]);

  // 🗺️ ENTERPRISE FEATURE: Initialize GPS location during splash
  useEffect(() => {
    const initializeLocation = async () => {
      if (gpsLoading) return; // Prevent multiple calls

      setGpsLoading(true);

      try {
        // Check if location services are enabled
        const isLocationEnabled = await Location.hasServicesEnabledAsync();

        if (!isLocationEnabled) {
          console.log('📍 [SplashScreen] Location services disabled, using HCMC fallback');
          setLocationData({
            latitude: 10.8231,
            longitude: 106.6297,
            accuracy: 0
          });
          setGpsLoading(false);
          return;
        }

        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.log('📍 [SplashScreen] Location permission denied, using HCMC fallback');
          setLocationData({
            latitude: 10.8231,
            longitude: 106.6297,
            accuracy: 0
          });
          setGpsLoading(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (location) {
          console.log('📍 [SplashScreen] GPS location obtained:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy
          });

          setLocationData({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined
          });
        }
      } catch (error) {
        console.log('📍 [SplashScreen] GPS error, using HCMC fallback:', error);
        setLocationData({
          latitude: 10.8231,
          longitude: 106.6297,
          accuracy: 0
        });
      } finally {
        setGpsLoading(false);
      }
    };

    // Start location initialization after a short delay
    const timer = setTimeout(initializeLocation, 500);
    return () => clearTimeout(timer);
  }, []);

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

  // Handle navigation based on authentication state and GPS loading
  useEffect(() => {
    console.log('🔄 [SplashScreen] State changed:', {
      isLoading,
      isAuthenticated,
      gpsLoading,
      hasLocation: !!locationData
    });

    // Wait for both auth and GPS to complete
    if (!isLoading && !gpsLoading && locationData) {
      // Navigate immediately when both auth and GPS are ready
      const navigate = () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300, // Faster fade out
          useNativeDriver: true,
        }).start(() => {
          // Navigate based on authentication state
          if (isAuthenticated) {
            console.log('✅ [SplashScreen] User authenticated + GPS ready, navigating to main app');
            // Pass location data to Discover screen
            NavigationService.secureNavigateToDiscover(locationData);
          } else {
            console.log('❌ [SplashScreen] User not authenticated, navigating to login');
            NavigationService.goToLogin();
          }
        });
      };

      // Add delay for better UX (1 second since GPS already took time)
      const timer = setTimeout(navigate, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, gpsLoading, locationData, router, fadeAnim]);

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
