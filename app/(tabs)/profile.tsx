import { useFocusEffect, useRouter } from 'expo-router';
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
import { LocationFolder } from '../../types/locationFolder';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const router = useRouter();

    // Zustand stores
    const { profile, isLoading, fetchProfile, refreshProfile } = useProfileStore();
    const {
        collections,
        loading: collectionsLoading,
        setCollections,
        setLoading: setCollectionsLoading,
        addCollection,
        updateCollection,
        removeCollection
    } = useCollectionStore();

    // Local state
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isProfileInitialized, setIsProfileInitialized] = useState(false);
    const [collectionsRefreshing, setCollectionsRefreshing] = useState(false);
    const { openCreateModal, openDeleteModal, setOnCreateSuccess, setOnDeleteSuccess } = useModal();

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
        router.push({
            pathname: '/collections/collection-detail',
            params: {
                collectionId: collection.id,
                collectionName: collection.name,
                collectionDescription: collection.description || '',
                visibility: collection.visibility,
                isDefault: collection.isDefault.toString()
            }
        });
    }, [router]);

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
                        // Only refresh if we have a profile but want to ensure it's up to date
                        fetchProfile();
                    }
                } catch (error) {
                    console.error('Failed to check auth status in useFocusEffect:', error);
                }
            };

            checkAuthAndRefresh();
        }, [isProfileInitialized, fetchProfile])
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

            // Check onboarding status from stored data (preferred method)
            const onboardingComplete = await OnboardingService.isOnboardingComplete();

            if (onboardingComplete) {
                // User has completed onboarding, load profile using Zustand
                // Always refresh profile to ensure we have the latest data
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
            // Force refresh profile data and collections
            await Promise.all([
                refreshProfile(),
                loadCollections()
            ]);
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
                        onPress: () => NavigationService.navigate('/friend-request')
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
                {/* Profile Info Section - Avatar Left, Name/Bio Below, Edit Icon Right */}
                <View style={styles.profileInfoSection}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {profile?.avatarUrl ? (
                            <Image
                                source={{ uri: profile.avatarUrl }}
                                style={styles.avatarImage}
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
                            onPress={() => router.push('/profile/edit-profile')}
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
                                    onPress={handleCreateCollection}
                                >
                                    <PlusCircle
                                        size={28}
                                        color={isDark ? '#FFFFFF' : '#000000'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerActionButton}
                                    onPress={handleOpenDeleteModal}

                                >
                                    <List
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
