import { MoreHorizontal, UserPlus, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import BottomSheetModal from '../../components/BottomSheetModal';
import GradientButton from '../../components/GradientButton';
import Header from '../../components/Header';
import SearchUserItem from '../../components/SearchUserItem';
import SimpleAvatar from '../../components/SimpleAvatar';
import { FeatureErrorBoundary } from '../../components/FeatureErrorBoundary';
import { useToast } from '../../contexts/ToastContext';
import { useFriendActions } from '../../hooks/useFriendActions';
import NavigationService from '../../services/navigationService';
import { socialService } from '../../services/socialService';
import { userSearchService } from '../../services/userSearchService';
import { useFriendStore, usePendingRequests, useFriends } from '../../store/friendStore';
import useLimits from '../../hooks/useLimits';
import { SubscriptionModal, PaymentScreen } from '../../components/subscription';
import { paymentFlowManager } from '../../services/paymentFlowManager';
import { Plan } from '../../types/subscription';
import { useChatStore } from '../../store/chatStore';
import { chatService } from '../../services/chatService';
import { FriendRequest, SearchUser } from '../../types/social';
import { showLimitReachedThenUpgrade } from '../../services/limitsService';


export default function FriendRequestScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning, showToast } = useToast() as any;

    // Global state from FriendStore
    const pendingRequests = usePendingRequests();
    const { setPendingRequests, setLoadingPending } = useFriendStore();
    const friends = useFriends();
    const currentFriendsCount = friends.length;
    const friendsLimit = useLimits('friends', currentFriendsCount, () => setShowSubscriptionModal(true));

    // Chat store for refreshing conversations
    const { setConversations } = useChatStore();

    // Local states
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [processingRequest, setProcessingRequest] = useState<string | null>(null);
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    // Sync with global payment flow like ProfileScreen
    useEffect(() => {
        const unsubscribe = paymentFlowManager.subscribe(() => {
            const current = paymentFlowManager.getCurrentPayment();
            if (current) {
                setSelectedPlan(current.plan);
                setShowPaymentScreen(true);
            } else {
                setShowPaymentScreen(false);
                setSelectedPlan(null);
            }
        });
        return unsubscribe;
    }, []);

    const handlePlanSelect = useCallback((plan: Plan) => {
        setShowSubscriptionModal(false);
        paymentFlowManager.startPayment(plan).catch(() => { /* noop */ });
    }, []);

    const handlePaymentBack = useCallback(() => {
        setShowPaymentScreen(false);
        setSelectedPlan(null);
    }, []);

    // Use custom hook for friend actions
    const {
        processingUser,
        handleSendFriendRequest,
        handleCancelRequest,
        handleRemoveFriend,
        handleAcceptRequestFromSearch,
        handleRejectRequestFromSearch,
        handleBlockUser,
    } = useFriendActions(searchResults, setSearchResults, currentFriendsCount, () => setShowSubscriptionModal(true));

    // Function to refresh conversations after friend request acceptance
    const refreshConversations = useCallback(async () => {
        try {
            const response = await chatService.getConversations();
            if (response.status === 'success') {
                setConversations(response.data);
            } else {
                console.warn('[Friend Request] Failed to refresh conversations:', response.message);
            }
        } catch (error) {
            console.error('[Friend Request] Error refreshing conversations:', error);
        }
    }, [setConversations]);

    useEffect(() => {
        loadPendingRequests();
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
    }, []);

    const loadPendingRequests = async () => {
        try {
            setLoading(true);
            setLoadingPending(true);
            const response = await socialService.getPendingFriendRequests();
            setPendingRequests(response.data);
        } catch (error: any) {
            console.error('[FriendRequest] Failed to load pending requests:', error);
            showError(`Failed to load friend requests: ${error.message}`,);
        } finally {
            setLoading(false);
            setLoadingPending(false);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearchLoading(true);

            const response = await userSearchService.searchUsers({
                query,
                page: 0,
                size: 10
            });

            setSearchResults(response.data.content);
        } catch (error: any) {
            console.error('[FriendRequest] Failed to search users:', error);
            showError(`Failed to search users: ${error.message}`);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        if (friendsLimit.isAtLimit) {
            showLimitReachedThenUpgrade({ error: showError, showToast }, friendsLimit.label, 4200, () => setShowSubscriptionModal(true));
            return;
        }
        try {
            setProcessingRequest(requestId);
            await socialService.handleFriendRequest(requestId, 'ACCEPTED');
            showSuccess('Friend request accepted!',);

            // Remove from pending requests immediately
            setPendingRequests(pendingRequests.filter((req: FriendRequest) => req.id !== requestId));

            // Refresh conversations to show new conversation immediately
            await refreshConversations();
        } catch (error: any) {
            console.error('[FriendRequest] Failed to accept friend request:', error);
            showError(`Failed to accept friend request: ${error.message}`,);
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            setProcessingRequest(requestId);
            await socialService.handleFriendRequest(requestId, 'REJECTED');
            showSuccess('Friend request rejected',);

            // Remove from pending requests immediately
            setPendingRequests(pendingRequests.filter((req: FriendRequest) => req.id !== requestId));
        } catch (error: any) {
            console.error('[FriendRequest] Failed to reject friend request:', error);
            showError(`Failed to reject friend request: ${error.message}`,);
        } finally {
            setProcessingRequest(null);
        }
    };


    const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
        <View style={[styles.friendItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
            <View style={styles.friendInfo}>
                <SimpleAvatar
                    size={55}
                    avatarUrl={item.avatarUrl}
                />
                <View style={styles.friendDetails}>
                    <Text style={[styles.friendName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {item.name}
                    </Text>
                    <Text style={[styles.friendEmail, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                </View>
            </View>

            <View style={styles.actionButtons}>
                <GradientButton
                    title={processingRequest === item.id ? "Đang xử lý..." : "Xác nhận"}
                    onPress={() => handleAcceptRequest(item.id)}
                    disabled={processingRequest === item.id}
                    size="small"
                    fullWidth={false}
                    minWidth={50}
                />

                <TouchableOpacity
                    style={[styles.rejectButton, { opacity: processingRequest === item.id ? 0.6 : 1 }]}
                    onPress={() => handleRejectRequest(item.id)}
                    disabled={processingRequest === item.id}
                >
                    <Text style={styles.rejectButtonText}>Xóa</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSearchResult = ({ item }: { item: SearchUser }) => (
        <SearchUserItem
            user={item}
            onAddFriend={handleSendFriendRequest}
            onRemoveFriend={handleRemoveFriend}
            onCancelRequest={handleCancelRequest}
            onAcceptRequest={handleAcceptRequestFromSearch}
            onRejectRequest={handleRejectRequestFromSearch}
            onBlock={handleBlockUser}
            loading={processingUser === item.id}
            disabled={processingUser === item.id}
        />
    );

    return (
        <FeatureErrorBoundary feature="Friends">
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <Header
                    title="Lời mời kết bạn"
                    onBackPress={() => NavigationService.goBack()}
                    rightIcon={{
                        icon: MoreHorizontal,
                        size: 28,
                        onPress: () => setShowBottomSheet(true)
                    }}
                />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Thêm bạn mới"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchLoading ? (
                        <ActivityIndicator size="small" color="#F48C06" style={styles.searchButton} />
                    ) : (
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={searchQuery ? clearSearch : undefined}
                        >
                            {searchQuery ? (
                                <X
                                    size={20}
                                    color="#9CA3AF"
                                />
                            ) : (
                                <UserPlus
                                    size={20}
                                    color="#9CA3AF"
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Content */}
                {searchQuery ? (
                    <FlatList
                        data={searchResults}
                        renderItem={renderSearchResult}
                        keyExtractor={(item) => item.id}
                        style={styles.friendsList}
                        contentContainerStyle={styles.friendsListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    Không tìm thấy người dùng nào
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    <FlatList
                        data={pendingRequests}
                        renderItem={renderFriendRequest}
                        keyExtractor={(item) => item.id}
                        style={styles.friendsList}
                        contentContainerStyle={styles.friendsListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Users
                                    size={64}
                                    color={isDark ? '#4B5563' : '#9CA3AF'}
                                />
                                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    Không có lời mời kết bạn nào
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Bottom Sheet Modal */}
                <BottomSheetModal
                    isOpen={showBottomSheet}
                    onClose={() => setShowBottomSheet(false)}
                    onSentRequests={() => NavigationService.goToSentRequests()}
                    onFriendsList={() => NavigationService.goToFriendsList()}
                />

                {/* Subscription Modal */}
                <SubscriptionModal
                    isVisible={showSubscriptionModal}
                    onClose={() => setShowSubscriptionModal(false)}
                    onPlanSelect={handlePlanSelect}
                />

                {showPaymentScreen && selectedPlan && (
                    <PaymentScreen
                        plan={selectedPlan}
                        onBack={handlePaymentBack}
                        onSuccess={handlePaymentBack}
                    />
                )}
            </View>
        </FeatureErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        color: '#000000',
    },
    searchButton: {
        marginLeft: 8,
    },
    friendsList: {
        flex: 1,
    },
    friendsListContent: {
        paddingBottom: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginBottom: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendDetails: {
        marginLeft: 12,
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    friendEmail: {
        fontSize: 14,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    rejectButton: {
        backgroundColor: '#374151',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    rejectButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});
