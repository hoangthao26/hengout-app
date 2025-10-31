import { useCallback, useEffect, useState } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { subscriptionService } from '../services/subscriptionService';
import { paymentFlowManager } from '../services/paymentFlowManager';
import { upgradePromptManager, UpgradePromptData } from '../services/upgradePromptManager';

/**
 * Hook for subscription management
 */
export const useSubscription = () => {
    const {
        // State
        plans,
        plansLoading,
        plansError,
        activeSubscription,
        subscriptionLoading,
        subscriptionError,
        folderLimits,
        friendLimits,
        groupLimits,
        limitsLoading,
        limitsError,
        groupStatus,
        groupStatusLoading,
        groupStatusError,

        // Actions
        fetchPlans,
        fetchActiveSubscription,
        activateSubscription,
        fetchAllLimits,
        fetchFolderLimits,
        fetchFriendLimits,
        fetchGroupLimits,
        fetchGroupStatus,
        applyGroupBoost,
        getPlanById,
        hasActiveSubscription,
        isPlanSuitable,
        clearSubscriptionData,

        // Payment Actions
        startPayment,
        openPaymentCheckout,
        pollPaymentStatus,
        completePayment,
        cancelPayment,
        clearPaymentData,

        // Usage Actions
        updateUsage,
        fetchUsageLimits,
        checkUpgradeNeeded
    } = useSubscriptionStore();

    // Upgrade prompts state
    const [upgradePrompts, setUpgradePrompts] = useState<UpgradePromptData[]>([]);

    // Auto-fetch plans and active subscription on mount
    useEffect(() => {
        fetchPlans();
        fetchActiveSubscription();
        fetchAllLimits();
        fetchUsageLimits();
    }, [fetchPlans, fetchActiveSubscription, fetchAllLimits, fetchUsageLimits]);

    // Subscribe to upgrade prompts
    useEffect(() => {
        const unsubscribe = upgradePromptManager.subscribe(setUpgradePrompts);
        return unsubscribe;
    }, []);

    // Payment methods
    const checkPayment = useCallback(async (orderCode: number) => {
        try {
            return await subscriptionService.checkPayment(orderCode);
        } catch (error: any) {
            console.error('Failed to check payment:', error);
            throw error;
        }
    }, []);

    const createPayment = useCallback(async (planId: number) => {
        try {
            return await subscriptionService.createPayment(planId);
        } catch (error: any) {
            console.error('Failed to create payment:', error);
            throw error;
        }
    }, []);

    const confirmWebhook = useCallback(async (webhookUrl: string) => {
        try {
            return await subscriptionService.confirmWebhook(webhookUrl);
        } catch (error: any) {
            console.error('Failed to confirm webhook:', error);
            throw error;
        }
    }, []);

    const cancelPaymentByOrderCode = useCallback(async (orderCode: number) => {
        try {
            return await subscriptionService.cancelPayment(orderCode);
        } catch (error: any) {
            console.error('Failed to cancel payment:', error);
            throw error;
        }
    }, []);

    // Utility methods
    const formatPlanPrice = useCallback((plan: any) => {
        return subscriptionService.formatPlanPrice(plan);
    }, []);

    const getPlanIntervalDescription = useCallback((plan: any) => {
        return subscriptionService.getPlanIntervalDescription(plan);
    }, []);

    const getSubscriptionStatus = useCallback(() => {
        if (!activeSubscription) return 'none';
        return activeSubscription.status;
    }, [activeSubscription]);

    const getSubscriptionPlan = useCallback(() => {
        return activeSubscription?.plan || null;
    }, [activeSubscription]);

    const isSubscriptionActive = useCallback(() => {
        if (!activeSubscription) return false;
        const now = new Date();
        const endDate = new Date(activeSubscription.endDate);
        return endDate > now;
    }, [activeSubscription]);

    const getDaysUntilExpiry = useCallback(() => {
        if (!activeSubscription) return null;
        const now = new Date();
        const endDate = new Date(activeSubscription.endDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [activeSubscription]);

    const getGroupStatus = useCallback((groupId: string) => {
        return groupStatus[groupId] || null;
    }, [groupStatus]);

    const isGroupStatusLoading = useCallback((groupId: string) => {
        return groupStatusLoading[groupId] || false;
    }, [groupStatusLoading]);

    const getGroupStatusError = useCallback((groupId: string) => {
        return groupStatusError[groupId] || null;
    }, [groupStatusError]);

    const refreshGroupStatus = useCallback((groupId: string) => {
        fetchGroupStatus(groupId);
    }, [fetchGroupStatus]);

    const refreshAllData = useCallback(() => {
        fetchPlans();
        fetchActiveSubscription();
        fetchAllLimits();
    }, [fetchPlans, fetchActiveSubscription, fetchAllLimits]);

    return {
        // State
        plans,
        plansLoading,
        plansError,
        activeSubscription,
        subscriptionLoading,
        subscriptionError,
        folderLimits,
        friendLimits,
        groupLimits,
        limitsLoading,
        limitsError,
        groupStatus,
        groupStatusLoading,
        groupStatusError,

        // Actions
        fetchPlans,
        fetchActiveSubscription,
        activateSubscription,
        fetchAllLimits,
        fetchFolderLimits,
        fetchFriendLimits,
        fetchGroupLimits,
        fetchGroupStatus,
        applyGroupBoost,
        checkPayment,
        createPayment,
        confirmWebhook,
        cancelPaymentByOrderCode,

        // Utility methods
        getPlanById,
        hasActiveSubscription,
        isPlanSuitable,
        formatPlanPrice,
        getPlanIntervalDescription,
        getSubscriptionStatus,
        getSubscriptionPlan,
        isSubscriptionActive,
        getDaysUntilExpiry,
        getGroupStatus,
        isGroupStatusLoading,
        getGroupStatusError,
        refreshGroupStatus,
        refreshAllData,
        clearSubscriptionData,

        // Payment Flow Methods
        startPayment,
        openPaymentCheckout,
        pollPaymentStatus,
        completePayment,
        clearPaymentData,

        // Usage Methods
        updateUsage,
        fetchUsageLimits,
        checkUpgradeNeeded,

        // Upgrade Prompts
        upgradePrompts,
        dismissUpgradePrompt: (promptId: string) => upgradePromptManager.dismissPrompt(promptId),
        dismissFeaturePrompts: (feature: string) => upgradePromptManager.dismissFeaturePrompts(feature),
        clearAllPrompts: () => upgradePromptManager.clearAllPrompts(),
        checkAllFeatures: () => upgradePromptManager.checkAllFeatures(),
        updateUsageAndCheck: (usage: any) => upgradePromptManager.updateUsageAndCheck(usage)
    };
};
