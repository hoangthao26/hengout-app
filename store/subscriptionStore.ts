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
            console.log('[SubscriptionStore] Fetching active subscription...');
            const response = await subscriptionService.getActiveSubscription();
            if (response.status === 'success') {
                console.log('[SubscriptionStore] Active subscription fetched:', {
                    planId: response.data?.plan?.id,
                    planCode: response.data?.plan?.code,
                    limits: {
                        maxExtraFolder: response.data?.plan?.maxExtraFolder,
                        maxFolderItem: response.data?.plan?.maxFolderItem,
                        maxFriend: (response.data?.plan as any)?.maxFriend,
                        maxAttendGroup: (response.data?.plan as any)?.maxAttendGroup,
                        maxMember: (response.data?.plan as any)?.maxMember,
                    }
                });
                set({ activeSubscription: response.data, subscriptionLoading: false });
            } else {
                console.warn('[SubscriptionStore] No active subscription:', response.message);
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
            console.error('Failed to fetch folder limits:', error);
        }
    },

    fetchFriendLimits: async () => {
        try {
            const response = await subscriptionService.getFriendLimits();
            if (response.status === 'success') {
                set({ friendLimits: response.data });
            }
        } catch (error: any) {
            console.error('Failed to fetch friend limits:', error);
        }
    },

    fetchGroupLimits: async () => {
        try {
            const response = await subscriptionService.getGroupLimits();
            if (response.status === 'success') {
                set({ groupLimits: response.data });
            }
        } catch (error: any) {
            console.error('Failed to fetch group limits:', error);
        }
    },

    fetchGroupStatus: async (groupId: string) => {
        set(state => ({
            groupStatusLoading: { ...state.groupStatusLoading, [groupId]: true },
            groupStatusError: { ...state.groupStatusError, [groupId]: null }
        }));

        try {
            const response = await subscriptionService.getGroupStatus(groupId);

            // Handle both formats: BaseApiResponse wrapper or direct data
            let groupStatusData: any;
            if ((response as any).status !== undefined) {
                // Has BaseApiResponse wrapper
                const wrappedResponse = response as GroupStatusResponse;
                if (wrappedResponse.status === 'success') {
                    groupStatusData = wrappedResponse.data;
                } else {
                    set(state => ({
                        groupStatusError: { ...state.groupStatusError, [groupId]: wrappedResponse.message || 'Failed to fetch group status' },
                        groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
                    }));
                    return;
                }
            } else {
                // Direct data response (no wrapper) - API returns { maxMember, groupPlanningTracking } directly
                groupStatusData = response as GroupStatus;
            }

            // Save group status to store
            set(state => ({
                groupStatus: { ...state.groupStatus, [groupId]: groupStatusData },
                groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
            }));
        } catch (error: any) {
            console.error(`❌ [SubscriptionStore] Failed to fetch group status for ${groupId}:`, error?.message || error);
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
            console.error('Failed to apply group boost:', error);
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
            console.error('Failed to start payment:', error);
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
            console.error('Failed to open payment checkout:', error);
            set({ paymentError: error.message || 'Failed to open payment' });
            throw error;
        }
    },

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
            console.error('Failed to poll payment status:', error);
            set({
                paymentPolling: false,
                paymentError: error.message || 'Payment verification failed'
            });
            throw error;
        }
    },

    completePayment: async (planId: number) => {
        try {
            await paymentService.completePayment(planId);
            set({ currentPayment: null, paymentError: null });

            // Refresh subscription data
            await get().fetchActiveSubscription();
            await get().fetchAllLimits();

            return true;
        } catch (error: any) {
            console.error('Failed to complete payment:', error);
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
            console.error('Failed to cancel payment:', error);
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

    fetchUsageLimits: async () => {
        try {
            const [folderLimits, friendLimits, groupLimits] = await Promise.all([
                subscriptionService.getFolderLimits(),
                subscriptionService.getFriendLimits(),
                subscriptionService.getGroupLimits()
            ]);

            if (folderLimits.status === 'success' &&
                friendLimits.status === 'success' &&
                groupLimits.status === 'success') {

                set({
                    usageLimits: {
                        maxExtraFolder: folderLimits.data.maxExtraFolder,
                        maxFolderItem: folderLimits.data.maxFolderItem,
                        maxFriend: friendLimits.data.maxFriend,
                        maxAttendGroup: groupLimits.data.maxAttendGroup,
                        maxMember: 0, // This would come from group status
                    }
                });
            }
        } catch (error: any) {
            console.error('Failed to fetch usage limits:', error);
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
