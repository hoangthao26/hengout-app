import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import {
    Plan,
    PlansResponse,
    Subscription,
    SubscriptionResponse,
    UserLimits,
    UserLimitsResponse,
    FriendLimit,
    FriendLimitResponse,
    GroupLimit,
    GroupLimitResponse,
    GroupStatus,
    GroupStatusResponse,
    PaymentCheckRequest,
    PaymentCheckResponse,
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentWebhookRequest,
    PaymentWebhookResponse,
    PaymentCancelRequest,
    PaymentCancelResponse,
    GroupBoostRequest,
    GroupBoostResponse,
    GroupInitRequest,
    GroupInitResponse
} from '../types/subscription';

// ============================================================================
// SUBSCRIPTION SERVICE
// ============================================================================

class SubscriptionService {
    private readonly baseUrl = SERVICES_CONFIG.SUBSCRIPTION_SERVICE.BASE_URL;

    // ==================== PLANS ====================

    /**
     * Get all available subscription plans
     * GET /api/v1/subscriptions/plans
     */
    async getPlans(): Promise<PlansResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_PLANS');
            const response = await axiosInstance.get<PlansResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get subscription plans:', error);
            throw error;
        }
    }

    /**
     * Get active subscription for current user
     * GET /api/v1/subscriptions/active
     */
    async getActiveSubscription(): Promise<SubscriptionResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_ACTIVE_SUBSCRIPTION');
            const response = await axiosInstance.get<SubscriptionResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get active subscription:', error);
            throw error;
        }
    }

    /**
     * Activate a subscription for current user
     * POST /api/v1/subscriptions/activate?planId={planId}
     */
    async activateSubscription(planId: number): Promise<SubscriptionResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'ACTIVATE_SUBSCRIPTION');
            const response = await axiosInstance.post<SubscriptionResponse>(endpoint, {}, {
                params: { planId }
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to activate subscription:', error);
            throw error;
        }
    }

    // ==================== USER LIMITS ====================

    /**
     * Get folder limits for current user
     * GET /api/v1/users/limits/folder
     */
    async getFolderLimits(): Promise<UserLimitsResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_FOLDER_LIMITS');
            const response = await axiosInstance.get<UserLimitsResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get folder limits:', error);
            throw error;
        }
    }

    /**
     * Get friend limits for current user
     * GET /api/v1/users/limits/friend
     */
    async getFriendLimits(): Promise<FriendLimitResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_FRIEND_LIMITS');
            const response = await axiosInstance.get<FriendLimitResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get friend limits:', error);
            throw error;
        }
    }

    /**
     * Get group limits for current user
     * GET /api/v1/users/limits/group
     */
    async getGroupLimits(): Promise<GroupLimitResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_GROUP_LIMITS');
            const response = await axiosInstance.get<GroupLimitResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error('Failed to get group limits:', error);
            throw error;
        }
    }

    // ==================== PAYMENTS ====================

    /**
     * Check payment status by order code
     * GET /api/v1/payments/check?orderCode={orderCode}
     */
    async checkPayment(orderCode: number): Promise<PaymentCheckResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'CHECK_PAYMENT');
            const response = await axiosInstance.get<PaymentCheckResponse>(endpoint, {
                params: { orderCode }
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to check payment:', error);
            throw error;
        }
    }

    /**
     * Create payment for a plan
     * POST /api/v1/payments/create?planId={planId}
     */
    async createPayment(planId: number): Promise<PaymentCreateResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'CREATE_PAYMENT');
            const response = await axiosInstance.post<PaymentCreateResponse>(endpoint, {}, {
                params: { planId }
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to create payment:', error);
            throw error;
        }
    }

    /**
     * Confirm webhook for payment
     * POST /api/v1/payments/confirm-webhook
     */
    async confirmWebhook(webhookUrl: string): Promise<PaymentWebhookResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'CONFIRM_WEBHOOK');
            const request: PaymentWebhookRequest = { webhookUrl };
            const response = await axiosInstance.post<PaymentWebhookResponse>(endpoint, request);
            return response.data;
        } catch (error: any) {
            console.error('Failed to confirm webhook:', error);
            throw error;
        }
    }

    /**
     * Cancel payment by order code
     * POST /api/v1/payments/cancel?orderCode={orderCode}
     */
    async cancelPayment(orderCode: number): Promise<PaymentCancelResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'CANCEL_PAYMENT');
            const response = await axiosInstance.post<PaymentCancelResponse>(endpoint, {}, {
                params: { orderCode }
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to cancel payment:', error);
            throw error;
        }
    }

    // ==================== GROUP MANAGEMENT ====================

    /**
     * Get group status by group ID
     * GET /api/v1/groups/{groupId}/status
     */
    async getGroupStatus(groupId: string): Promise<GroupStatusResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_GROUP_STATUS')
                .replace(':groupId', groupId);
            const response = await axiosInstance.get<GroupStatusResponse>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get group status for ${groupId}:`, error);
            throw error;
        }
    }

    /**
     * Initialize group with conversation ID
     * POST /api/v1/groups/init?conversationId={conversationId}
     */
    async initGroup(conversationId: string): Promise<GroupInitResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'INIT_GROUP');
            const response = await axiosInstance.post<GroupInitResponse>(endpoint, {}, {
                params: { conversationId }
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to initialize group:', error);
            throw error;
        }
    }

    /**
     * Apply group boost
     * POST /api/v1/group-boosts/apply?monthsToBoost={monthsToBoost}
     * Headers: X-Group-ID: {groupId}
     */
    async applyGroupBoost(groupId: string, monthsToBoost: number): Promise<GroupBoostResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'APPLY_GROUP_BOOST');
            const response = await axiosInstance.post<GroupBoostResponse>(endpoint, {}, {
                params: { monthsToBoost },
                headers: {
                    'X-Group-ID': groupId
                }
            });
            return response.data;
        } catch (error: any) {
            console.error(`Failed to apply group boost for ${groupId}:`, error);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get all user limits in one call
     */
    async getAllUserLimits(): Promise<{
        folder: UserLimits;
        friend: FriendLimit;
        group: GroupLimit;
    }> {
        try {
            const [folderLimits, friendLimits, groupLimits] = await Promise.all([
                this.getFolderLimits(),
                this.getFriendLimits(),
                this.getGroupLimits()
            ]);

            return {
                folder: folderLimits.data,
                friend: friendLimits.data,
                group: groupLimits.data
            };
        } catch (error: any) {
            console.error('Failed to get all user limits:', error);
            throw error;
        }
    }

    /**
     * Check if user has active subscription
     */
    async hasActiveSubscription(): Promise<boolean> {
        try {
            const response = await this.getActiveSubscription();
            return response.status === 'success' && !!response.data;
        } catch (error: any) {
            console.log('No active subscription found:', error.message);
            return false;
        }
    }

    /**
     * Get subscription plan by ID
     */
    async getPlanById(planId: number): Promise<Plan | null> {
        try {
            const response = await this.getPlans();
            if (response.status === 'success') {
                return response.data.find(plan => plan.id === planId) || null;
            }
            return null;
        } catch (error: any) {
            console.error('Failed to get plan by ID:', error);
            return null;
        }
    }

    /**
     * Format plan price for display
     */
    formatPlanPrice(plan: Plan): string {
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: plan.currency || 'VND'
        });
        return formatter.format(plan.price);
    }

    /**
     * Get plan interval description
     */
    getPlanIntervalDescription(plan: Plan): string {
        const intervalMap: { [key: string]: string } = {
            'day': 'ngày',
            'week': 'tuần',
            'month': 'tháng',
            'year': 'năm'
        };

        const interval = intervalMap[plan.interval.toLowerCase()] || plan.interval;
        return `${plan.intervalCount} ${interval}`;
    }

    /**
     * Check if plan is suitable for user needs
     */
    isPlanSuitable(plan: Plan, requirements: {
        maxExtraFolder?: number;
        maxFolderItem?: number;
        maxFriend?: number;
        maxAttendGroup?: number;
        groupBoost?: number;
        friendTracking?: boolean;
        maxMember?: number;
    }): boolean {
        return (
            (!requirements.maxExtraFolder || plan.maxExtraFolder >= requirements.maxExtraFolder) &&
            (!requirements.maxFolderItem || plan.maxFolderItem >= requirements.maxFolderItem) &&
            (!requirements.maxFriend || plan.maxFriend >= requirements.maxFriend) &&
            (!requirements.maxAttendGroup || plan.maxAttendGroup >= requirements.maxAttendGroup) &&
            (!requirements.groupBoost || plan.groupBoost >= requirements.groupBoost) &&
            (!requirements.friendTracking || plan.friendTracking === requirements.friendTracking) &&
            (!requirements.maxMember || plan.maxMember >= requirements.maxMember)
        );
    }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;
