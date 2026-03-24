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
        // CRITICAL FIX: Wrap initializeAuth in try-catch to prevent crash on store initialization failure
        try {
          await initializeAuth();
        } catch (authError) {
          // Auth initialization failed - log but continue with app initialization
          console.error('[SplashScreen] Auth initialization failed:', authError);
          // App can still function without auth (user can login later)
        }

        await initializationService.initialize();
        // CRITICAL FIX: Add try-catch to prevent unhandled promise rejection
        try {
          await initSvc.initOnAppStart();
        } catch (initError) {
          // Non-critical initialization - log but don't block app
          console.error('[SplashScreen] initOnAppStart failed:', initError);
        }
      } catch (error) {
        // Critical initialization error - app may not function properly
        console.error('[SplashScreen] App initialization failed:', error);
        // Don't throw - allow app to continue with degraded functionality
      }
    };

    initializeApp();
  }, []);

  // Get GPS location after services are ready (only if permission already granted)
  // Best Practice: Don't request permission on app launch, only check if already granted
  useEffect(() => {
    const getLocationData = async () => {
      // Only get location if services are ready
      if (!isServicesReady) return;

      try {
        // Check if permission is already granted (don't request)
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status === 'granted') {
          // Permission already granted, try to get location (no request)
          try {
        const { smartLocationService } = await import('../services/smartLocationService');

            // Try to get cached location first, or get location if permission exists
        const location = await smartLocationService.getCurrentLocation({
          accuracy: Location.Accuracy.Balanced,
              timeout: 5000,
              retries: 1,
          useCache: true
        });

            if (location && location.source !== 'fallback') {
          setLocationData({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || 0
          });
              return;
            }
          } catch (importError) {
            // Dynamic import failed - use fallback location
            console.error('[SplashScreen] Failed to import smartLocationService:', importError);
          }
        }

        // No permission or location unavailable - use fallback location (HCMC)
        try {
          const { smartLocationService } = await import('../services/smartLocationService');
          const fallback = smartLocationService.getFallbackLocation();
          setLocationData({
            latitude: fallback.latitude,
            longitude: fallback.longitude,
            accuracy: 0
          });
        } catch (importError) {
          // Import failed - use hardcoded fallback
          console.error('[SplashScreen] Failed to import smartLocationService for fallback:', importError);
          setLocationData({
            latitude: 10.8231, // HCMC fallback (hardcoded)
            longitude: 106.6297,
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
        } catch (importError) {
          // Import failed - use hardcoded fallback
          console.error('[SplashScreen] Failed to import smartLocationService in catch:', importError);
          setLocationData({
            latitude: 10.8231, // HCMC fallback (hardcoded)
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
        // CRITICAL FIX: Add try-catch to prevent unhandled promise rejection
        refreshTokenManager.checkAndRefreshOnResume().catch((error) => {
          // Log error but don't crash app - token refresh failure is non-critical
          console.error('[SplashScreen] Token refresh on resume failed:', error);
        });
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
          // CRITICAL FIX: Wrap navigation in try-catch to prevent crash if route doesn't exist
          try {
          if (isAuthenticated) {
              NavigationService.secureNavigateToDiscover(locationToUse).catch((navError) => {
                // Navigation failed - try fallback to login
                console.error('[SplashScreen] Navigation to Discover failed:', navError);
                try {
                  NavigationService.goToLogin();
                } catch (fallbackError) {
                  console.error('[SplashScreen] Fallback navigation to Login failed:', fallbackError);
                  // Last resort: Use router directly
                  try {
                    router.replace('/auth/login');
                  } catch (routerError) {
                    console.error('[SplashScreen] Router navigation failed:', routerError);
                  }
                }
              });
          } else {
              NavigationService.goToLogin().catch((navError) => {
                // Navigation to login failed - use router directly
                console.error('[SplashScreen] Navigation to Login failed:', navError);
                try {
                  router.replace('/auth/login');
                } catch (routerError) {
                  console.error('[SplashScreen] Router navigation failed:', routerError);
                }
              });
            }
          } catch (error) {
            // Navigation error - try router directly as last resort
            console.error('[SplashScreen] Navigation error:', error);
            try {
              router.replace('/auth/login');
            } catch (routerError) {
              console.error('[SplashScreen] Router navigation failed:', routerError);
            }
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
