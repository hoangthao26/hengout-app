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
    isChatDataPreloaded // Thêm chat data preloaded status
  } = useAppStore();

  // GPS Location state
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);

  // Initialize all services on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        initializeAuth();
        await initializationService.initialize();
        initSvc.initOnAppStart();
      } catch (error) {
        // Critical initialization error - app may not function properly
        console.error('[SplashScreen] App initialization failed:', error);
      }
    };

    initializeApp();
  }, []);

  // Get GPS location after services are ready
  useEffect(() => {
    const getLocationData = async () => {
      // Only get location if services are ready
      if (!isServicesReady) return;

      try {
        // Import smart location service
        const { smartLocationService } = await import('../services/smartLocationService');

        // Try to get location with smart retry
        const location = await smartLocationService.getCurrentLocation({
          accuracy: Location.Accuracy.Balanced,
          timeout: 8000,
          retries: 2,
          useCache: true
        });

        if (location) {
          setLocationData({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || 0
          });
        } else {
          // Use fallback location (HCMC) if location not available
          const fallback = smartLocationService.getFallbackLocation();
          setLocationData({
            latitude: fallback.latitude,
            longitude: fallback.longitude,
            accuracy: 0
          });
        }
      } catch (error) {
        // Location not available - use fallback location
        console.error('[SplashScreen] Location error:', error);
        try {
          const { smartLocationService } = await import('../services/smartLocationService');
          const fallback = smartLocationService.getFallbackLocation();
          setLocationData({
            latitude: fallback.latitude,
            longitude: fallback.longitude,
            accuracy: 0
          });
        } catch (fallbackError) {
          // Ultimate fallback: HCMC coordinates
          setLocationData({
            latitude: 10.8231,
            longitude: 106.6297,
            accuracy: 0
          });
        }
      }
    };

    getLocationData();
  }, [isServicesReady]);

  // Handle app state changes for background refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isAuthenticated) {
        refreshTokenManager.checkAndRefreshOnResume();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated]);

  // Handle navigation based on app readiness
  useEffect(() => {
    // Don't wait for locationData - use fallback if needed
    // App should always be able to navigate even without location
    if (!isLoading && isAppReady && isChatDataPreloaded) {
      // Use locationData if available, otherwise use fallback
      const locationToUse = locationData || {
        latitude: 10.8231, // HCMC fallback
        longitude: 106.6297,
        accuracy: 0
      };

      const navigate = () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (isAuthenticated) {
            NavigationService.secureNavigateToDiscover(locationToUse);
          } else {
            NavigationService.goToLogin();
          }
        });
      };

      // Add small delay to ensure location service has time to respond
      // But don't wait forever if location fails
      const timer = setTimeout(navigate, locationData ? 500 : 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, isAppReady, isChatDataPreloaded, locationData, router, fadeAnim]);

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
