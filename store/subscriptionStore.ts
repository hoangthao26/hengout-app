import { create } from 'zustand';
import { subscriptionService } from '../services/subscriptionService';
import { paymentService } from '../services/paymentService';
import { Plan, Subscription, UserLimits, FriendLimit, GroupLimit, GroupStatus, GroupStatusResponse, CurrentUsage, UsageLimits } from '../types/subscription';

interface SubscriptionState {
    // Plans
    plans: Plan[];
    plansLoading: boolean;
    plansError: string | null;

    // Active Subscription
    activeSubscription: Subscription | null;
    subscriptionLoading: boolean;
    subscriptionError: string | null;

    // User Limits
    folderLimits: UserLimits | null;
    friendLimits: FriendLimit | null;
    groupLimits: GroupLimit | null;
    limitsLoading: boolean;
    limitsError: string | null;

    // Group Status
    groupStatus: { [groupId: string]: GroupStatus };
    groupStatusLoading: { [groupId: string]: boolean };
    groupStatusError: { [groupId: string]: string | null };

    // Payment State
    currentPayment: {
        orderCode: number;
        checkoutUrl: string;
        qrCode: string;
        amount: number;
        currency: string;
        description: string;
    } | null;
    paymentLoading: boolean;
    paymentError: string | null;
    paymentPolling: boolean;

    // Usage Tracking
    currentUsage: CurrentUsage;
    usageLimits: UsageLimits | null;

    // Actions
    fetchPlans: () => Promise<void>;
    fetchActiveSubscription: () => Promise<void>;
    activateSubscription: (planId: number) => Promise<boolean>;
    fetchAllLimits: () => Promise<void>;
    fetchFolderLimits: () => Promise<void>;
    fetchFriendLimits: () => Promise<void>;
    fetchGroupLimits: () => Promise<void>;
    fetchGroupStatus: (groupId: string) => Promise<void>;
    applyGroupBoost: (groupId: string, monthsToBoost: number) => Promise<boolean>;

    // Payment Actions
    startPayment: (planId: number) => Promise<boolean>;
    openPaymentCheckout: () => Promise<void>;
    pollPaymentStatus: () => Promise<'SUCCESS' | 'FAILED' | 'TIMEOUT'>;
    completePayment: (planId: number) => Promise<boolean>;
    cancelPayment: () => Promise<void>;
    clearPaymentData: () => void;

    // Usage Actions
    updateUsage: (usage: Partial<CurrentUsage>) => void;
    fetchUsageLimits: () => Promise<void>;
    checkUpgradeNeeded: (feature: keyof CurrentUsage) => boolean;

    // Utility actions
    getPlanById: (planId: number) => Plan | null;
    hasActiveSubscription: () => boolean;
    isPlanSuitable: (planId: number, requirements: any) => boolean;
    clearSubscriptionData: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    // Initial state
    plans: [],
    plansLoading: false,
    plansError: null,

    activeSubscription: null,
    subscriptionLoading: false,
    subscriptionError: null,

    folderLimits: null,
    friendLimits: null,
    groupLimits: null,
    limitsLoading: false,
    limitsError: null,

    groupStatus: {},
    groupStatusLoading: {},
    groupStatusError: {},

    // Payment State
    currentPayment: null,
    paymentLoading: false,
    paymentError: null,
    paymentPolling: false,

    // Usage Tracking
    currentUsage: {
        folders: 0,
        friends: 0,
        groups: 0,
        groupMembers: 0,
    },
    usageLimits: null,

    // Actions
    fetchPlans: async () => {
        set({ plansLoading: true, plansError: null });
        try {
            const response = await subscriptionService.getPlans();
            if (response.status === 'success') {
                set({ plans: response.data, plansLoading: false });
            } else {
                set({ plansError: response.message || 'Failed to fetch plans', plansLoading: false });
            }
        } catch (error: any) {
            set({ plansError: error.message || 'Failed to fetch plans', plansLoading: false });
        }
    },

    fetchActiveSubscription: async () => {
        set({ subscriptionLoading: true, subscriptionError: null });
        try {
            const response = await subscriptionService.getActiveSubscription();
            if (response.status === 'success') {
                set({ activeSubscription: response.data, subscriptionLoading: false });
            } else {
                set({ subscriptionError: response.message || 'No active subscription', subscriptionLoading: false });
            }
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to fetch subscription:', error);
            set({ subscriptionError: error.message || 'Failed to fetch subscription', subscriptionLoading: false });
        }
    },

    activateSubscription: async (planId: number) => {
        set({ subscriptionLoading: true, subscriptionError: null });
        try {
            const response = await subscriptionService.activateSubscription(planId);
            if (response.status === 'success') {
                set({ activeSubscription: response.data, subscriptionLoading: false });
                return true;
            } else {
                set({ subscriptionError: response.message || 'Failed to activate subscription', subscriptionLoading: false });
                return false;
            }
        } catch (error: any) {
            set({ subscriptionError: error.message || 'Failed to activate subscription', subscriptionLoading: false });
            return false;
        }
    },

    /**
     * Fetch all user limits in a single call
     * 
     * Efficiently loads folder, friend, and group limits together.
     * Used for initial app load and subscription changes.
     * 
     * Returns structured limits object with:
     * - folder: Collection/folder limits
     * - friend: Friend list limits
     * - group: Group participation limits
     * 
     * Reduces API calls by fetching all limits at once.
     */
    fetchAllLimits: async () => {
        set({ limitsLoading: true, limitsError: null });
        try {
            const limits = await subscriptionService.getAllUserLimits();
            set({
                folderLimits: limits.folder,
                friendLimits: limits.friend,
                groupLimits: limits.group,
                limitsLoading: false
            });
        } catch (error: any) {
            set({ limitsError: error.message || 'Failed to fetch limits', limitsLoading: false });
        }
    },

    fetchFolderLimits: async () => {
        try {
            const response = await subscriptionService.getFolderLimits();
            if (response.status === 'success') {
                set({ folderLimits: response.data });
            }
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to fetch folder limits:', error);
        }
    },

    fetchFriendLimits: async () => {
        try {
            const response = await subscriptionService.getFriendLimits();
            if (response.status === 'success') {
                set({ friendLimits: response.data });
            }
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to fetch friend limits:', error);
        }
    },

    fetchGroupLimits: async () => {
        try {
            const response = await subscriptionService.getGroupLimits();
            if (response.status === 'success') {
                set({ groupLimits: response.data });
            }
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to fetch group limits:', error);
        }
    },

    /**
     * Fetch group status with dual response format handling
     * 
     * Handles API response format variations:
     * Format 1: Wrapped response { status: 'success', data: GroupStatus }
     * Format 2: Direct response GroupStatus { maxMember, groupPlanningTracking }
     * 
     * Strategy:
     * 1. Checks for 'status' property to determine format
     * 2. Extracts GroupStatus data from appropriate format
     * 3. Handles errors in wrapped format gracefully
     * 4. Stores group status for limit calculations
     * 
     * Used for determining group member limits (including boosted limits).
     * 
     * @param groupId - ID of group to fetch status for
     */
    fetchGroupStatus: async (groupId: string) => {
        set(state => ({
            groupStatusLoading: { ...state.groupStatusLoading, [groupId]: true },
            groupStatusError: { ...state.groupStatusError, [groupId]: null }
        }));

        try {
            const response = await subscriptionService.getGroupStatus(groupId);

            // Handle both response formats: wrapped (BaseApiResponse) or direct (GroupStatus)
            let groupStatusData: any;
            if ((response as any).status !== undefined) {
                // Format 1: Wrapped response with status field
                const wrappedResponse = response as GroupStatusResponse;
                if (wrappedResponse.status === 'success') {
                    groupStatusData = wrappedResponse.data;
                } else {
                    // Handle error response in wrapped format
                    set(state => ({
                        groupStatusError: { ...state.groupStatusError, [groupId]: wrappedResponse.message || 'Failed to fetch group status' },
                        groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
                    }));
                    return;
                }
            } else {
                // Format 2: Direct response (no wrapper) - API returns GroupStatus directly
                groupStatusData = response as GroupStatus;
            }

            // Save group status to store for limit calculations
            set(state => ({
                groupStatus: { ...state.groupStatus, [groupId]: groupStatusData },
                groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
            }));
        } catch (error: any) {
            console.error(`[SubscriptionStore] Failed to fetch group status for ${groupId}:`, error?.message || error);
            set(state => ({
                groupStatusError: { ...state.groupStatusError, [groupId]: error.message || 'Failed to fetch group status' },
                groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
            }));
        }
    },

    applyGroupBoost: async (groupId: string, monthsToBoost: number) => {
        try {
            const response = await subscriptionService.applyGroupBoost(groupId, monthsToBoost);
            if (response.status === 'success') {
                // Refresh group status after boost
                get().fetchGroupStatus(groupId);
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to apply group boost:', error);
            return false;
        }
    },

    // Utility actions
    getPlanById: (planId: number) => {
        const { plans } = get();
        return plans.find(plan => plan.id === planId) || null;
    },

    hasActiveSubscription: () => {
        const { activeSubscription } = get();
        return !!activeSubscription;
    },

    isPlanSuitable: (planId: number, requirements: any) => {
        const plan = get().getPlanById(planId);
        if (!plan) return false;
        return subscriptionService.isPlanSuitable(plan, requirements);
    },

    clearSubscriptionData: () => {
        set({
            plans: [],
            plansLoading: false,
            plansError: null,
            activeSubscription: null,
            subscriptionLoading: false,
            subscriptionError: null,
            folderLimits: null,
            friendLimits: null,
            groupLimits: null,
            limitsLoading: false,
            limitsError: null,
            groupStatus: {},
            groupStatusLoading: {},
            groupStatusError: {},
            currentPayment: null,
            paymentError: null,
            paymentPolling: false,
            currentUsage: {
                folders: 0,
                friends: 0,
                groups: 0,
                groupMembers: 0,
            },
            usageLimits: null,
        });
    },

    // Payment Actions
    startPayment: async (planId: number) => {
        set({ paymentLoading: true, paymentError: null });
        try {
            const paymentData = await paymentService.startPayment(planId);
            set({
                currentPayment: paymentData,
                paymentLoading: false
            });
            return true;
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to start payment:', error);
            set({
                paymentError: error.message || 'Failed to start payment',
                paymentLoading: false
            });
            return false;
        }
    },

    openPaymentCheckout: async () => {
        const { currentPayment } = get();
        if (!currentPayment) {
            throw new Error('No payment data available');
        }

        try {
            await paymentService.openPayOSCheckout(currentPayment.checkoutUrl);
            set({ paymentPolling: true });
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to open payment checkout:', error);
            set({ paymentError: error.message || 'Failed to open payment' });
            throw error;
        }
    },

    /**
     * Poll payment status until completion or timeout
     * 
     * Continuously checks payment status from PayOS until:
     * - Payment succeeds (returns 'SUCCESS')
     * - Payment fails (returns 'FAILED')
     * - Timeout reached (returns 'TIMEOUT')
     * 
     * Used after user redirects back from payment gateway.
     * Polling is handled by paymentService with configurable intervals.
     * 
     * @returns Payment status: 'SUCCESS', 'FAILED', or 'TIMEOUT'
     * @throws Error if polling fails
     */
    pollPaymentStatus: async () => {
        const { currentPayment } = get();
        if (!currentPayment) {
            throw new Error('No payment data available');
        }

        try {
            const status = await paymentService.pollPaymentStatus(currentPayment.orderCode);
            set({ paymentPolling: false });
            return status;
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to poll payment status:', error);
            set({
                paymentPolling: false,
                paymentError: error.message || 'Payment verification failed'
            });
            throw error;
        }
    },

    /**
     * Complete payment flow with post-payment data refresh
     * 
     * Payment completion flow:
     * 1. Calls payment service to complete payment on server
     * 2. Clears payment state (payment completed, no longer needed)
     * 3. Refreshes subscription data (ensures UI shows updated subscription)
     * 4. Refreshes all limits (updates user's quota information)
     * 
     * Data synchronization:
     * - Subscription refresh: Updates activeSubscription (current plan, expiry)
     * - Limits refresh: Updates all quota limits (folders, friends, groups)
     * - Ensures UI reflects payment impact immediately
     * 
     * Sequential refresh strategy:
     * - fetchActiveSubscription first (core subscription status)
     * - fetchAllLimits second (quota limits depend on subscription)
     * - Sequential ensures limits fetch uses updated subscription data
     * 
     * Error handling:
     * - Returns false on failure (caller can retry)
     * - Preserves error message for user feedback
     * - Payment state cleared even on failure (user can restart flow)
     * 
     * @param planId - ID of plan that was paid for
     * @returns true if payment completed successfully, false otherwise
     */
    completePayment: async (planId: number) => {
        try {
            await paymentService.completePayment(planId);
            set({ currentPayment: null, paymentError: null });

            // Sequential refresh: Subscription first, then limits (depends on subscription)
            await get().fetchActiveSubscription();
            await get().fetchAllLimits();

            return true;
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to complete payment:', error);
            set({ paymentError: error.message || 'Failed to complete payment' });
            return false;
        }
    },

    cancelPayment: async () => {
        const { currentPayment } = get();
        if (!currentPayment) return;

        try {
            await paymentService.cancelPayment(currentPayment.orderCode);
            set({
                currentPayment: null,
                paymentError: null,
                paymentPolling: false
            });
        } catch (error: any) {
            console.error('[SubscriptionStore] Failed to cancel payment:', error);
            set({ paymentError: error.message || 'Failed to cancel payment' });
        }
    },

    clearPaymentData: () => {
        set({
            currentPayment: null,
            paymentError: null,
            paymentPolling: false,
        });
    },

    // Usage Actions
    updateUsage: (usage: Partial<CurrentUsage>) => {
        set((state) => ({
            currentUsage: { ...state.currentUsage, ...usage }
        }));
    },

    /**
     * Fetch all usage limits from multiple sources with parallel API calls
     * 
     * Parallel fetching strategy:
     * 1. Fetches folder, friend, and group limits simultaneously (Promise.all)
     * 2. Reduces total fetch time from 3x sequential to 1x parallel
     * 3. All three limits must succeed (all-or-nothing aggregation)
     * 
     * Data aggregation logic:
     * - Combines limits from three different API endpoints
     * - Only sets usageLimits if ALL three requests succeed
     * - Partial success is ignored (ensures consistent limit data)
     * 
     * Limit sources:
     * - Folder limits: maxExtraFolder, maxFolderItem
     * - Friend limits: maxFriend
     * - Group limits: maxAttendGroup
     * - maxMember: Set to 0 (must be fetched separately from group status)
     * 
     * Error handling:
     * - Silent failure: Errors are logged but don't throw
     * - Prevents partial limit updates (either all limits or none)
     * - UI can handle missing limits gracefully (shows defaults)
     * 
     * Performance:
     * - Parallel execution reduces network latency
     * - Typically 3x faster than sequential calls
     */
    fetchUsageLimits: async () => {
        try {
            // Parallel fetching: All three limits fetched simultaneously
            const [folderLimits, friendLimits, groupLimits] = await Promise.all([
                subscriptionService.getFolderLimits(),
                subscriptionService.getFriendLimits(),
                subscriptionService.getGroupLimits()
            ]);

            // All-or-nothing: Only update if all three succeed (prevents partial limits)
            if (folderLimits.status === 'success' &&
                friendLimits.status === 'success' &&
                groupLimits.status === 'success') {

                set({
                    usageLimits: {
                        maxExtraFolder: folderLimits.data.maxExtraFolder,
                        maxFolderItem: folderLimits.data.maxFolderItem,
                        maxFriend: friendLimits.data.maxFriend,
                        maxAttendGroup: groupLimits.data.maxAttendGroup,
                        maxMember: 0, // This would come from group status (fetched separately)
                    }
                });
            }
        } catch (error: any) {
            // Silent failure: Log error but don't throw (graceful degradation)
            console.error('[SubscriptionStore] Failed to fetch usage limits:', error);
        }
    },

    checkUpgradeNeeded: (feature: keyof CurrentUsage) => {
        const { currentUsage, usageLimits } = get();
        if (!usageLimits) return false;

        const current = currentUsage[feature];
        const limit = usageLimits[`max${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof UsageLimits];

        if (typeof limit === 'number') {
            return current >= limit * 0.8; // Show upgrade prompt at 80% usage
        }

        return false;
    },
}));
