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
    PayOSPaymentResponse,
    PaymentStatusResponse,
    CurrentUsage,
    UsageLimits
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
            const response = await axiosInstance.get<Plan[]>(endpoint);

            // Normalize backend response to match PlansResponse type
            const payload = response.data;
            if (Array.isArray(payload)) {
                return {
                    status: 'success',
                    data: payload,
                    message: 'Lấy danh sách gói thành công',
                    errorCode: 0
                } as PlansResponse;
            }

            // Fallback if response has different structure
            return {
                status: 'success',
                data: [],
                message: 'Không có gói nào khả dụng',
                errorCode: 0
            } as PlansResponse;
        } catch (error: any) {
            const status = error?.response?.status;
            const data = error?.response?.data;
            console.error('[SubscriptionService] GET_PLANS failed:', error);
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
            const response = await axiosInstance.get<Subscription>(endpoint);

            // Normalize backend response to match SubscriptionResponse type
            const payload = response.data;
            if (payload && typeof payload === 'object') {
                return {
                    status: 'success',
                    data: payload,
                    message: 'Lấy thông tin gói đăng ký thành công',
                    errorCode: 0
                } as SubscriptionResponse;
            }

            // Fallback if no subscription found
            return {
                status: 'error',
                message: 'Không tìm thấy gói đăng ký đang hoạt động',
                data: {} as Subscription,
                errorCode: 404
            } as SubscriptionResponse;
        } catch (error: any) {
            console.error('[SubscriptionService] Failed to get subscription:', error);
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
            console.error('[SubscriptionService] Failed to activate subscription:', error);
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
            console.error('[SubscriptionService] Failed to get folder limit:', error);
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
            console.error('[SubscriptionService] Failed to get friend limit:', error);
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
            console.error('[SubscriptionService] Failed to get group limit:', error);
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
            console.error('[SubscriptionService] Failed to check payment:', error);
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
            console.error('[SubscriptionService] Failed to create payment:', error);
            throw error;
        }
    }

    /**
     * Create payment with PayOS integration
     * POST /api/v1/payments/create?planId={planId}
     */
    async createPaymentWithPayOS(planId: number): Promise<PayOSPaymentResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'CREATE_PAYMENT');

            // Add return URL for PayOS to redirect back to app
            // These URLs must match the server configuration
            const returnUrl = 'hengout://payment-success';
            const cancelUrl = 'hengout://payment-cancel';

            const response = await axiosInstance.post<PayOSPaymentResponse>(endpoint, {
                returnUrl,
                cancelUrl
            }, {
                params: { planId }
            });
            return response.data;
        } catch (error: any) {
            console.error('[SubscriptionService] Failed to create PayOS payment:', error);
            throw error;
        }
    }

    /**
     * Check payment status with detailed response
     * GET /api/v1/payments/check?orderCode={orderCode}
     */
    async checkPaymentStatusDetailed(orderCode: number): Promise<PaymentStatusResponse> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'CHECK_PAYMENT');
            const response = await axiosInstance.get<PaymentStatusResponse>(endpoint, {
                params: { orderCode }
            });
            return response.data;
        } catch (error: any) {
            console.error('[SubscriptionService] Failed to check payment status:', error);
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
            console.error('[SubscriptionService] Failed to confirm webhook:', error);
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
            console.error('[SubscriptionService] Failed to cancel payment:', error);
            throw error;
        }
    }

    // ==================== GROUP MANAGEMENT ====================

    /**
     * Get group status by group ID
     * GET /api/v1/groups/{groupId}/status
     * Returns: { maxMember: number, groupPlanningTracking: boolean } or BaseApiResponse<GroupStatus>
     */
    async getGroupStatus(groupId: string): Promise<GroupStatusResponse | GroupStatus> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'GET_GROUP_STATUS')
                .replace(':groupId', groupId);
            const response = await axiosInstance.get<GroupStatusResponse | GroupStatus>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`[SubscriptionService] Failed to get group status for ${groupId}:`, error?.message || error);
            throw error;
        }
    }

    /**
     * Apply group boost
     * POST /api/v1/group-boosts/apply?monthsToBoost={monthsToBoost}
     * Headers: X-Group-ID: {groupId}
     * Returns: BaseApiResponse<GroupBoostData> or direct GroupBoostData
     */
    async applyGroupBoost(groupId: string, monthsToBoost: number): Promise<GroupBoostResponse | any> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'APPLY_GROUP_BOOST');
            const response = await axiosInstance.post<GroupBoostResponse>(endpoint, {}, {
                params: { monthsToBoost },
                headers: { 'X-Group-ID': groupId }
            });
            return response.data;
        } catch (error: any) {
            console.error(`[SubscriptionService] Failed to apply group boost for ${groupId}:`, error?.response?.data?.message || error?.message || error);
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
            console.error('[SubscriptionService] Failed to get all user limits:', error);
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
            console.error('[SubscriptionService] Failed to get plan by ID:', error);
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

    /**
     * Initialize default subscription (basic) once
     * POST /api/v1/subscriptions/init
     * Returns boolean true when initialized or already exists
     */
    async initDefaultSubscription(): Promise<boolean> {
        try {
            const endpoint = buildEndpointUrl('SUBSCRIPTION_SERVICE', 'INIT_DEFAULT_SUBSCRIPTION');
            const response = await axiosInstance.post<boolean>(endpoint);
            // Some backends may return { status, data } – normalize to boolean
            const payload: any = response.data;
            if (typeof payload === 'boolean') return payload;
            if (payload && typeof payload === 'object') {
                if (typeof payload.data === 'boolean') return payload.data;
                if (payload.status === 'success') return true;
            }
            return true; // assume success if 200
        } catch (error: any) {
            console.error('[SubscriptionService] Failed to initialize default subscription:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;
