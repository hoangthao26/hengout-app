import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { TouchableOpacity, View, Text, ActivityIndicator, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { AuthHelper } from '../services/authHelper';
import NavigationService from '../services/navigationService';
import * as Location from 'expo-location';

// Google OAuth Client IDs from environment variables
// These must be set in your .env.local file
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

if (!webClientId || !iosClientId) {
    throw new Error('Missing required Google OAuth Client IDs. Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in your .env.local file');
}

// Debug flag to control verbose OAuth logging
const DEBUG_OAUTH = __DEV__ && process.env.EXPO_PUBLIC_DEBUG_OAUTH === '1';

WebBrowser.maybeCompleteAuthSession();

const LoginWithGoogle = () => {
    const [loading, setLoading] = useState(false);
    const { success: showSuccess } = useToast();

    const config = {
        webClientId: webClientId,
        iosClientId: iosClientId,
        scopes: ['openid', 'profile', 'email'],
    };

    // CONFIG (log only when debugging)
    if (DEBUG_OAUTH) {
        console.log('[Google OAuth] Config:', JSON.stringify(config, null, 2));
    }

    const [request, response, promptAsync] = Google.useAuthRequest(config);

    // REQUEST (log only when debugging)
    if (DEBUG_OAUTH && request) {
        console.log('[Google OAuth] Request object:', JSON.stringify(request, null, 2));
    }

    const handleToken = async () => {
        if (response?.type === 'success') {
            const { authentication } = response;
            const accessToken = authentication?.accessToken;
            const idToken = authentication?.idToken;

            // DETAILED LOGGING - Full response object (debug only)
            if (DEBUG_OAUTH) {
                console.log('[Google OAuth] Full Response Object:', JSON.stringify(response, null, 2));
                console.log('[Google OAuth] Authentication Object:', JSON.stringify(authentication, null, 2));
            }

            // TOKEN LOGGING (debug only)
            if (DEBUG_OAUTH) {
                console.log('[Google OAuth] Google Access Token:', accessToken);
                console.log('[Google OAuth] Google ID Token:', idToken);
            }

            // TOKEN DETAILS
            if (idToken) {
                try {
                    // Decode JWT payload (without verification)
                    const payload = JSON.parse(atob(idToken.split('.')[1]));
                    if (DEBUG_OAUTH) {
                        console.log('[Google OAuth] ID Token Payload:', JSON.stringify(payload, null, 2));
                        console.log('[Google OAuth] ID Token Audience (aud):', payload.aud);
                        console.log('[Google OAuth] ID Token Authorized Party (azp):', payload.azp);
                        console.log('[Google OAuth] ID Token Issuer (iss):', payload.iss);
                        console.log('[Google OAuth] ID Token Subject (sub):', payload.sub);
                        console.log('[Google OAuth] ID Token Email:', payload.email);
                        console.log('[Google OAuth] ID Token Name:', payload.name);
                    }
                } catch (error) {
                    console.error('[Google OAuth] Failed to decode ID token:', error);
                }
            }

            if (idToken) {
                setLoading(true);
                try {
                    if (DEBUG_OAUTH) {
                        console.log('[Google OAuth] Authenticating with backend...');
                    }

                    // Call backend API with ID token
                    const result = await authService.googleOAuthLogin(idToken);

                    if (result.status === 'success' && result.data) {
                        if (DEBUG_OAUTH) {
                            console.log('[Google OAuth] Backend authentication successful:', result.data);
                        }

                        // Save tokens to secure storage
                        await AuthHelper.saveTokens({
                            accessToken: result.data.accessToken,
                            refreshToken: result.data.refreshToken,
                            tokenType: result.data.tokenType || 'Bearer',
                            expiresIn: result.data.expiresIn,
                            expiresAt: Date.now() + result.data.expiresIn,
                            role: result.data.role || '',
                            onboardingComplete: result.data.onboardingComplete,
                        });

                        if (DEBUG_OAUTH) {
                            console.log('[Google OAuth] Google login successful!');
                        }

                        showSuccess('Đăng nhập Google thành công');

                        // For Google users: ensure password is set BEFORE any navigation/init
                        try {
                            const pwdStatus = await authService.getPasswordStatus();
                            const hasPassword = !!pwdStatus?.data?.hasPassword;
                            const hasOauthAccounts = !!pwdStatus?.data?.hasOauthAccounts;
                            if (hasOauthAccounts && !hasPassword) {
                                NavigationService.replace('/auth/set-password');
                                setLoading(false);
                                return;
                            }
                        } catch { /* ignore and continue */ }

                        // Ensure websocket reconnects only after password-gate
                        try {
                            const { initializationService } = await import('../services/initializationService');
                            await initializationService.initAfterLogin();
                        } catch { }

                        // Check onboarding status
                        if (result.data.onboardingComplete === false) {
                            if (DEBUG_OAUTH) {
                                console.log('Onboarding not complete, redirecting to wizard');
                            }
                            NavigationService.goToOnboardingWizard();
                        } else {
                            if (DEBUG_OAUTH) {
                                console.log('Onboarding complete, navigating to tabs');
                            }

                            // Get current location with smart retry
                            try {
                                const { smartLocationService } = await import('../services/smartLocationService');

                                const location = await smartLocationService.getCurrentLocation({
                                    accuracy: Location.Accuracy.High,
                                    timeout: 10000,
                                    retries: 3,
                                    useCache: true
                                });

                                if (location) {
                                    if (DEBUG_OAUTH) {
                                        console.log('[Google Login] Smart location obtained:', {
                                            lat: location.latitude,
                                            lng: location.longitude,
                                            accuracy: location.accuracy,
                                            source: location.source
                                        });
                                    }

                                    NavigationService.secureNavigateToDiscover({
                                        latitude: location.latitude,
                                        longitude: location.longitude,
                                        accuracy: location.accuracy || 0
                                    });
                                } else {
                                    if (DEBUG_OAUTH) {
                                        console.log('[Google Login] No location available, navigating to discover for user choice');
                                    }
                                    NavigationService.secureNavigateToDiscover();
                                }
                            } catch (error) {
                                if (DEBUG_OAUTH) {
                                    console.log('[Google Login] Location error:', error);
                                }
                                NavigationService.secureNavigateToDiscover();
                            }
                        }
                    } else {
                        console.error('[Google OAuth] Backend authentication failed:', result);
                    }
                } catch (error: any) {
                    console.error('[Google OAuth] Backend authentication error:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                console.error('[Google OAuth] No ID token received from Google');
            }
        } else if (response?.type === 'error') {
            console.error('[Google OAuth] Login failed:', response.error);
            if (DEBUG_OAUTH) {
                console.error('[Google OAuth] Full error response:', JSON.stringify(response, null, 2));
            }
        } else if (response?.type === 'cancel') {
            if (DEBUG_OAUTH) {
                console.log('[Google OAuth] User cancelled login');
            }
        } else {
            if (DEBUG_OAUTH) {
                console.log('[Google OAuth] Unknown response type:', response?.type);
                console.log('[Google OAuth] Full response:', JSON.stringify(response, null, 2));
            }
        }
    };

    useEffect(() => {
        handleToken();
    }, [response]);

    return (
        <View style={{ width: '100%', alignItems: 'center' }}>
            <TouchableOpacity
                onPress={() => promptAsync()}
                disabled={loading}
                style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#DADCE0',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    width: '100%',
                    maxWidth: 300,
                    minHeight: 48,
                }}
            >
                {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#4285F4" size="small" />
                        <Text style={{
                            color: '#3C4043',
                            fontSize: 16,
                            fontWeight: '500',
                            marginLeft: 8,
                            fontFamily: 'Roboto, sans-serif'
                        }}>
                            Đang xác thực...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Google Logo */}
                        <Image
                            source={require('../assets/images/Google__G__logo.svg.png')}
                            style={{
                                width: 20,
                                height: 20,
                                marginRight: 12,
                            }}
                            resizeMode="contain"
                        />

                        <Text style={{
                            color: '#3C4043',
                            fontSize: 16,
                            fontWeight: '500',
                            fontFamily: 'Roboto, sans-serif'
                        }}>
                            Đăng nhập với Google
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

export { LoginWithGoogle };