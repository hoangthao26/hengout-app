import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Globe,
    List,
    Lock,
    MapPin,
    PlusCircle,
    Settings,
    User,
    UserPen,
    UserPlus
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { ProfileErrorBoundary } from '../../components/errorBoundaries';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
} from 'react-native-reanimated';
import Header from '../../components/Header';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { AuthHelper } from '../../services/authHelper';
import { locationFolderService } from '../../services/locationFolderService';
import NavigationService from '../../services/navigationService';
import { OnboardingService } from '../../services/onboardingService';
import { useProfileStore } from '../../store';
import { useCollectionStore } from '../../store/collectionStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { LocationFolder } from '../../types/locationFolder';
import { SubscriptionStatusCard, SubscriptionModal, PaymentScreen } from '../../components/subscription';
import { paymentFlowManager } from '../../services/paymentFlowManager';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning, showToast } = useToast() as any;
    const router = useRouter();
    const params = useLocalSearchParams<{ openSubscription?: string }>();

    // Zustand stores
    const { profile, isLoading, fetchProfile, refreshProfile } = useProfileStore();
    // Ensure subscription data stays fresh when screen focuses
    const { fetchActiveSubscription: refetchActiveSubscription } = useSubscriptionStore();
    useFocusEffect(
        React.useCallback(() => {
            refetchActiveSubscription().catch(() => { });
            return undefined;
        }, [refetchActiveSubscription])
    );
    const {
        collections,
        loading: collectionsLoading,
        setCollections,
        setLoading: setCollectionsLoading,
        addCollection,
        updateCollection,
        removeCollection,
        setCurrentCollection
    } = useCollectionStore();
    const {
        activeSubscription,
        fetchActiveSubscription,
        fetchPlans,
        plans,
        plansLoading
    } = useSubscriptionStore();

    // Local state
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isProfileInitialized, setIsProfileInitialized] = useState(false);

    // Subscription state
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [collectionsRefreshing, setCollectionsRefreshing] = useState(false);
    const { openCreateModal, openDeleteModal, setOnCreateSuccess, setOnDeleteSuccess } = useModal();

    // Listen for payment flow changes
    useEffect(() => {
        const unsubscribe = paymentFlowManager.subscribe(() => {
            console.log('[ProfileScreen] Payment flow state changed');
            const currentPayment = paymentFlowManager.getCurrentPayment();
            console.log('[ProfileScreen] Current payment:', currentPayment);
            if (currentPayment) {
                console.log('[ProfileScreen] Setting selectedPlan and showing PaymentScreen');
                setSelectedPlan(currentPayment.plan);
                setShowPaymentScreen(true);
            } else {
                console.log('[ProfileScreen] Clearing selectedPlan and hiding PaymentScreen');
                setShowPaymentScreen(false);
                setSelectedPlan(null);
            }
        });

        return unsubscribe;
    }, []);

    // Open subscription modal if navigation parameter is provided
    useEffect(() => {
        if (params?.openSubscription === 'true') {
            setShowSubscriptionModal(true);
            try {
                router.replace('/(tabs)/profile' as any);
            } catch { }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params?.openSubscription]);

    // Sticky header animation with Reanimated
    const scrollY = useSharedValue(0);
    const PROFILE_INFO_HEIGHT = 200; // Height of profile info section (avatar + name + bio + edit button)
    const STICKY_THRESHOLD = PROFILE_INFO_HEIGHT; // When to start showing sticky tabs
    const HEADER_HEIGHT = 88; // Height of main header

    // Scroll handler with Reanimated
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });



    // Load profile data
    useEffect(() => {
        loadProfile();
        loadCollections();
    }, []);

    // Load subscription data when component mounts
    useEffect(() => {
        if (isProfileInitialized) {
            fetchActiveSubscription();
            fetchPlans();
        }
    }, [isProfileInitialized, fetchActiveSubscription, fetchPlans]);

    // Load collections
    const loadCollections = useCallback(async () => {
        try {
            setCollectionsLoading(true);
            const response = await locationFolderService.getAllFolders();
            if (response.status === 'success') {
                setCollections(response.data);
            }
        } catch (error: any) {
            console.error('Failed to load collections:', error);
        } finally {
            setCollectionsLoading(false);
        }
    }, [setCollectionsLoading, setCollections]);

    // Set success callbacks for modals
    useEffect(() => {
        setOnCreateSuccess(() => loadCollections);
        setOnDeleteSuccess(() => loadCollections);

        // Cleanup on unmount
        return () => {
            setOnCreateSuccess(undefined);
            setOnDeleteSuccess(undefined);
        };
    }, [loadCollections, setOnCreateSuccess, setOnDeleteSuccess]);

    // Refresh collections when screen comes into focus - OPTIMIZED
    useFocusEffect(
        useCallback(() => {
            // Only reload if collections are empty (first time) or if we need fresh data
            if (collections.length === 0) {
                loadCollections();
            }
        }, [loadCollections, collections.length])
    );

    // Refresh collections
    const onCollectionsRefresh = useCallback(async () => {
        setCollectionsRefreshing(true);
        await loadCollections();
        setCollectionsRefreshing(false);
    }, [loadCollections]);


    // Handle collection press
    const handleCollectionPress = useCallback((collection: LocationFolder) => {
        // Save current collection to store before navigation (for immediate display)
        setCurrentCollection(collection);

        // Navigate with just ID - detail screen will fetch fresh data from API
        NavigationService.goToCollectionDetail(collection.id);
    }, [setCurrentCollection]);

    // Handle create collection
    const handleCreateCollection = useCallback(() => {
        openCreateModal();
    }, [openCreateModal]);

    const handleOpenDeleteModal = useCallback(() => {
        openDeleteModal(collections);
    }, [openDeleteModal, collections]);

    // Refresh profile when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            const checkAuthAndRefresh = async () => {
                try {
                    const tokenInfo = await AuthHelper.getTokenInfo();
                    if (tokenInfo?.isAuthenticated && isProfileInitialized) {
                        // INSTANT DISPLAY: Always use cached data first
                        const currentProfile = profile;
                        if (currentProfile) {
                            console.log('[Profile] Using cached profile for instant display');
                        } else {
                            console.log('[Profile] No cached profile, fetching from server...');
                            fetchProfile();
                        }
                    }
                } catch (error) {
                    console.error('Failed to check auth status in useFocusEffect:', error);
                }
            };

            checkAuthAndRefresh();
        }, [isProfileInitialized, fetchProfile, profile])
    );

    const loadProfile = async () => {
        try {
            // Check if user is authenticated first using AuthHelper (more reliable)
            const tokenInfo = await AuthHelper.getTokenInfo();
            if (!tokenInfo?.isAuthenticated) {
                console.log('User not authenticated, redirecting to login');
                NavigationService.logoutToLogin();
                return;
            }

            // INSTANT DISPLAY: Check if profile already exists in store
            const currentProfile = profile;
            if (currentProfile) {
                console.log('[Profile] Profile already cached, displaying instantly');
                setIsProfileInitialized(true);
                return;
            }

            // Check onboarding status from stored data (preferred method)
            const onboardingComplete = await OnboardingService.isOnboardingComplete();

            if (onboardingComplete) {
                // User has completed onboarding, load profile using Zustand
                console.log('[Profile] No cached profile, fetching from server...');
                await refreshProfile();
                setIsProfileInitialized(true);
            } else {
                // User hasn't completed onboarding, redirect to wizard
                console.log('Onboarding not complete, redirecting to onboarding wizard');
                NavigationService.goToOnboardingWizard();
            }
        } catch (error: any) {
            console.error('Failed to load profile:', error);
            showError('Failed to load profile',);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // SMART REFRESH: Only refresh if needed
            const currentProfile = profile;
            const refreshPromises = [];

            if (!currentProfile) {
                console.log('[Profile] No profile data, refreshing...');
                refreshPromises.push(refreshProfile());
            } else {
                console.log('[Profile] Profile exists, only refreshing collections');
            }

            // Always refresh collections as they change more frequently
            refreshPromises.push(loadCollections());

            await Promise.all(refreshPromises);
        } catch (error: any) {
            console.error('Failed to refresh profile:', error);
            showError('Failed to refresh profile',);
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = async () => {
        if (isLoggingOut) return; // Prevent multiple logout attempts

        try {
            setIsLoggingOut(true);
            showInfo('Logging out...',);

            // Use AuthHelper for immediate logout with navigation
            await AuthHelper.logoutAndNavigate();
        } catch (error: any) {
            console.error('Logout failed:', error);
            showError('Logout failed. Please try again.',);

            // Force navigation to login even if logout fails
            NavigationService.logoutToLogin();
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Subscription handlers
    const handleUpgradePress = () => {
        setShowSubscriptionModal(true);
    };

    // --- Subscription reminders (upgrade/expiry) ---
    const getDaysLeft = (endDate?: string | null) => {
        if (!endDate) return null;
        const end = new Date(endDate).getTime();
        if (Number.isNaN(end)) return null;
        const now = Date.now();
        const diffMs = end - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    const daysLeft = getDaysLeft(activeSubscription?.endDate || null);
    const isPremium = activeSubscription?.plan?.id === 2;

    // Show lightweight reminder toasts (7 ngày và 1 ngày trước hạn) khi dữ liệu đổi hoặc khi vào màn
    const [lastReminderDaysLeft, setLastReminderDaysLeft] = useState<number | null>(null);
    useEffect(() => {
        if (!isPremium || typeof daysLeft !== 'number') return;
        if (daysLeft < 0) return; // đã hết hạn
        // Chỉ nhắc một lần cho cùng mốc daysLeft trong phiên
        if (lastReminderDaysLeft === daysLeft) return;

        if (daysLeft === 7) {
            showInfo('Gói Premium còn 7 ngày sẽ hết hạn. Bạn có thể gia hạn ngay.');
            setLastReminderDaysLeft(7);
        } else if (daysLeft === 1) {
            showWarning('Gói Premium còn 1 ngày sẽ hết hạn. Gia hạn ngay để không gián đoạn.');
            setLastReminderDaysLeft(1);
        }
    }, [isPremium, daysLeft, lastReminderDaysLeft, showInfo, showWarning]);

    // Basic upgrade prompt (once per day)
    const hasPromptedThisFocus = React.useRef(false);
    useFocusEffect(
        useCallback(() => {
            // Reset flag when screen comes into focus
            hasPromptedThisFocus.current = false;

            const maybePromptBasicUpgrade = async () => {
                try {
                    if (isPremium) return;

                    // Prevent duplicate prompts in the same focus session
                    if (hasPromptedThisFocus.current) return;

                    const STORAGE_KEY = 'basic_upgrade_prompt_last_date';
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    const todayKey = `${yyyy}-${mm}-${dd}`;
                    const last = await AsyncStorage.getItem(STORAGE_KEY);
                    if (last === todayKey) return; // already prompted today

                    // Set flag and save to storage BEFORE showing toast to prevent race condition
                    hasPromptedThisFocus.current = true;
                    await AsyncStorage.setItem(STORAGE_KEY, todayKey);

                    // Show a dedicated toast with CTA to open subscription modal
                    const id = showToast({
                        type: 'upgrade',
                        title: 'Nâng cấp để mở khóa đầy đủ tính năng',
                        message: 'Tăng giới hạn collections, bạn bè và nhóm.',
                        duration: 5000,
                        position: 'top',
                        onPress: handleUpgradePress,
                    });
                    // Silence unused var warning if any
                    if (id) { /* no-op */ }
                } catch (e) {
                    // Reset flag on error so it can retry
                    hasPromptedThisFocus.current = false;
                    // best-effort prompt, ignore storage errors
                }
            };

            maybePromptBasicUpgrade();

            // Cleanup: reset flag when screen loses focus (optional, but good practice)
            return () => {
                // No cleanup needed for this case
            };
        }, [isPremium, handleUpgradePress, showToast])
    );

    const handlePlanSelect = async (plan: any) => {
        console.log('[ProfileScreen] Plan selected:', plan);
        setShowSubscriptionModal(false);

        try {
            console.log('[ProfileScreen] Starting payment flow...');
            // Start payment flow
            const paymentData = await paymentFlowManager.startPayment(plan);
            console.log('[ProfileScreen] Payment flow started:', paymentData);
            // PaymentScreen will be shown automatically via paymentFlowManager subscription
        } catch (error: any) {
            console.error('❌ [ProfileScreen] Failed to start payment:', error);
            showError('Failed to start payment. Please try again.');
        }
    };

    const handlePaymentSuccess = () => {
        console.log('[ProfileScreen] Payment success, closing PaymentScreen');
        setShowPaymentScreen(false);
        setSelectedPlan(null);
        showSuccess('Subscription activated successfully!');
        // Refresh subscription data
        fetchActiveSubscription();
    };

    const handlePaymentBack = () => {
        console.log('[ProfileScreen] Payment back, closing PaymentScreen');
        setShowPaymentScreen(false);
        setSelectedPlan(null);
    };

    const handleSubscriptionModalClose = () => {
        setShowSubscriptionModal(false);
    };



    const handleCheckAuthStatus = async () => {
        try {
            const tokenInfo = await AuthHelper.getTokenInfo();

            if (tokenInfo) {
                console.log('🔍 Current Auth Status:');
                console.log('- Is Authenticated:', tokenInfo.isAuthenticated);
                console.log('- Has Tokens:', tokenInfo.hasTokens);
                console.log('- Token Expired:', tokenInfo.tokenExpired);
                console.log('- Remaining Time:', Math.round(tokenInfo.remainingTime / 1000), 'seconds');
                console.log('- Expiration Time:', tokenInfo.expirationTime);
                console.log('- Refresh Time:', tokenInfo.refreshTime);
                console.log('- Time Until Refresh:', Math.round(tokenInfo.timeUntilRefresh / 1000), 'seconds');
                console.log('- Token Type:', tokenInfo.tokenType);
                console.log('- Role:', tokenInfo.role);

                const refreshStatus = tokenInfo.timeUntilRefresh > 0
                    ? `Refresh in ${Math.round(tokenInfo.timeUntilRefresh / 60000)}m ${Math.round((tokenInfo.timeUntilRefresh % 60000) / 1000)}s`
                    : 'Refresh overdue';

                showInfo(`Auth: ${tokenInfo.isAuthenticated ? '✅' : '❌'} | Expired: ${tokenInfo.tokenExpired ? '❌' : '✅'} | ${refreshStatus}`,);
            } else {
                showError('Failed to get token information',);
            }
        } catch (error: any) {
            console.error('Failed to check auth status:', error);
            showError('Failed to check authentication status',);
        }
    };


    // Show loading screen while checking profile status - REMOVED
    // if (isLoading) {
    //     return (
    //         <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
    //             <View style={styles.loadingContainer}>
    //                 <Ionicons
    //                     name="person-circle-outline"
    //                     size={80}
    //                     color={isDark ? '#9CA3AF' : '#6B7280'}
    //                 />
    //             </View>
    //         </View>
    //     );
    // }

    // If profile is not initialized, show loading or redirect - REMOVED
    // This should be handled in loadProfile() method
    // if (!isProfileInitialized && !isLoading) {
    //     return (
    //         <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
    //             <View style={styles.loadingContainer}>
    //                 <Ionicons
    //                     name="person-circle-outline"
    //                     size={80}
    //                     color={isDark ? '#9CA3AF' : '#6B7280'}
    //                 />
    //             </View>
    //         </View>
    //     );
    // }

    return (
        <ProfileErrorBoundary>
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header with 2 Icons */}
                <Header
                    title=""
                    showBackButton={false}
                    variant="profile"
                    rightIcons={[
                        {
                            icon: UserPlus,
                            size: 28,
                            onPress: () => NavigationService.goToFriendRequest()
                        },
                        {
                            icon: Settings,
                            size: 28,
                            onPress: () => NavigationService.goToSettings()
                        }
                    ]}
                />


                {/* Scrollable Profile Content */}
                <Animated.ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={isDark ? '#FFFFFF' : '#000000'}
                        />
                    }
                >
                    {/* Subscription Status Card */}
                    <SubscriptionStatusCard
                        subscription={activeSubscription}
                        onUpgrade={handleUpgradePress}
                    />

                    {/* Test button to trigger upgrade toast (hidden)
                <TouchableOpacity
                    onPress={() => showToast({
                        type: 'upgrade',
                        title: 'Nâng cấp để mở khóa đầy đủ tính năng',
                        message: 'Tăng giới hạn collections, bạn bè và nhóm.',
                        duration: 5000,
                        position: 'top',
                        onPress: handleUpgradePress,
                    })}
                    style={{ alignSelf: 'center', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' }}
                >
                    <Text style={{ color: isDark ? '#E5E7EB' : '#111827' }}>Test Upgrade Toast</Text>
                </TouchableOpacity>
                */}


                    {/* Profile Info Section - Avatar Left, Name/Bio Below, Edit Icon Right */}
                    <View style={styles.profileInfoSection}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {profile?.avatarUrl ? (
                                <Image
                                    source={{ uri: profile.avatarUrl }}
                                    style={styles.avatarImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <User
                                    size={90}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            )}
                        </View>

                        {/* Name and Bio - Centered below avatar */}
                        <View style={styles.nameBioSection}>
                            <Text style={[styles.displayName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {profile?.displayName || 'User'}
                            </Text>
                            {profile?.bio && (
                                <Text style={[styles.bio, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                                    {profile.bio}
                                </Text>
                            )}
                        </View>

                        {/* Edit Icon - Right side */}
                        <View style={styles.editIconContainer}>
                            <TouchableOpacity
                                style={[styles.editIconButton, { backgroundColor: isDark ? '#262626' : '#F5F5F5' }]}
                                onPress={() => NavigationService.goToEditProfile()}
                            >
                                <UserPen
                                    size={24}
                                    color={isDark ? '#FFFFFF' : '#000000'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Collections Section */}
                    <View style={styles.tabContent}>
                        {/* Collections Section */}
                        <View style={[
                            styles.collectionsSection,
                            {
                                backgroundColor: isDark ? '#232024' : '#F3F4F6'
                            }
                        ]}>
                            <View style={styles.collectionsHeader}>
                                <Text style={[styles.collectionsTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Collections ({collections.length})
                                </Text>
                                <View style={styles.collectionsHeaderActions}>
                                    <TouchableOpacity
                                        style={styles.headerActionButton}
                                        onPress={handleOpenDeleteModal}
                                    >
                                        <List
                                            size={28}
                                            color={isDark ? '#FFFFFF' : '#000000'}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.headerActionButton}
                                        onPress={handleCreateCollection}
                                    >
                                        <PlusCircle
                                            size={28}
                                            color={isDark ? '#FFFFFF' : '#000000'}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {collectionsLoading ? (
                                <View style={styles.collectionsLoading}>
                                    <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        Đang tải collections...
                                    </Text>
                                </View>
                            ) : collections.length === 0 ? (
                                <View style={styles.emptyCollections}>
                                    <MapPin
                                        size={32}
                                        color={isDark ? '#4B5563' : '#9CA3AF'}
                                    />
                                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        Chưa có collections nào
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.collectionsList}>
                                    {collections.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.collectionItem,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                                }
                                            ]}
                                            onPress={() => handleCollectionPress(item)}
                                        >
                                            <View style={styles.collectionIcon}>
                                                <MapPin
                                                    size={36}
                                                    color={isDark ? '#FFFFFF' : '#000000'}
                                                />
                                            </View>
                                            <View style={styles.collectionInfo}>
                                                <Text
                                                    style={[styles.collectionName, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                                    numberOfLines={1}
                                                >
                                                    {item.name}
                                                </Text>
                                                <Text
                                                    style={[styles.collectionDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                                                    numberOfLines={1}
                                                >
                                                    {item.description || 'Không có mô tả'}
                                                </Text>
                                            </View>
                                            <View style={styles.collectionStatus}>
                                                {item.visibility === 'PUBLIC' ? (
                                                    <Globe
                                                        size={24}
                                                        color={isDark ? '#9CA3AF' : '#6B7280'}
                                                    />
                                                ) : (
                                                    <Lock
                                                        size={24}
                                                        color={isDark ? '#9CA3AF' : '#6B7280'}
                                                    />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                </Animated.ScrollView>

            </View>

            {/* Subscription Modal */}
            <SubscriptionModal
                isVisible={showSubscriptionModal}
                onClose={handleSubscriptionModalClose}
                onPlanSelect={handlePlanSelect}
            />

            {/* Payment Screen */}
            {showPaymentScreen && selectedPlan && (
                <PaymentScreen
                    plan={selectedPlan}
                    onBack={handlePaymentBack}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </ProfileErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
        paddingTop: 0, // No padding - let content flow naturally
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // Header styles removed - now using Header component

    // Profile Info Section - Avatar Left, Name/Bio Below, Edit Icon Right
    profileInfoSection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarContainer: {
        // Avatar stays on the left
    },
    avatarImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    nameBioSection: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    displayName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'left',
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'left',
    },

    // Edit Icon
    editIconContainer: {
        // Edit icon stays on the right
    },
    editIconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    iconButton: {
        position: 'relative',
        padding: 8,
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },

    tabContent: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 24,
        paddingHorizontal: 8,
    },

    // Collections Styles
    collectionsSection: {
        width: '95%',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        alignSelf: 'center',

    },
    collectionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    collectionsTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    collectionsHeaderActions: {
        flexDirection: 'row',
        gap: 4,
    },
    headerActionButton: {
        padding: 4,
    },
    collectionsLoading: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyCollections: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        marginTop: 8,
    },
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginBottom: 8,
        borderRadius: 12,
        minHeight: 60,
    },
    collectionIcon: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionStatus: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
    },
    collectionName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    collectionDescription: {
        fontSize: 13,
        opacity: 0.7,
    },
    collectionsList: {
        // No height limit since it's in ScrollView
    },

    // Loading Styles - REMOVED (no longer needed)
    // loadingContainer: {
    //     flex: 1,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     paddingHorizontal: 24,
    //     maxWidth: 500,
    //     alignSelf: 'center',
    //     width: '100%'
    // },
    loadingText: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 20,
    },


});
