import { create } from 'zustand';
import { subscriptionService } from '../services/subscriptionService';
import { Plan, Subscription, UserLimits, FriendLimit, GroupLimit, GroupStatus } from '../types/subscription';

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

    // Actions
    fetchPlans: () => Promise<void>;
    fetchActiveSubscription: () => Promise<void>;
    activateSubscription: (planId: number) => Promise<boolean>;
    fetchAllLimits: () => Promise<void>;
    fetchFolderLimits: () => Promise<void>;
    fetchFriendLimits: () => Promise<void>;
    fetchGroupLimits: () => Promise<void>;
    fetchGroupStatus: (groupId: string) => Promise<void>;
    initGroup: (conversationId: string) => Promise<boolean>;
    applyGroupBoost: (groupId: string, monthsToBoost: number) => Promise<boolean>;
    
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
            if (response.status === 'success') {
                set(state => ({
                    groupStatus: { ...state.groupStatus, [groupId]: response.data },
                    groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
                }));
            } else {
                set(state => ({
                    groupStatusError: { ...state.groupStatusError, [groupId]: response.message || 'Failed to fetch group status' },
                    groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
                }));
            }
        } catch (error: any) {
            set(state => ({
                groupStatusError: { ...state.groupStatusError, [groupId]: error.message || 'Failed to fetch group status' },
                groupStatusLoading: { ...state.groupStatusLoading, [groupId]: false }
            }));
        }
    },

    initGroup: async (conversationId: string) => {
        try {
            const response = await subscriptionService.initGroup(conversationId);
            if (response.status === 'success') {
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('Failed to initialize group:', error);
            return false;
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
            groupStatusError: {}
        });
    }
}));
