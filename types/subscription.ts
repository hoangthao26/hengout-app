// Subscription Service Types
import { BaseApiResponse } from './api';

// Plan Types
export interface Plan {
    id: number;
    code: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    intervalCount: number;
    maxExtraFolder: number;
    maxFolderItem: number;
    maxFriend: number;
    maxAttendGroup: number;
    groupBoost: number;
    friendTracking: boolean;
    maxMember: number;
    createdAt: string;
    updatedAt: string;
}

export interface PlansResponse extends BaseApiResponse<Plan[]> { }

// Subscription Types
export interface Subscription {
    id: number;
    user: string;
    plan: Plan;
    status: string;
    startDate: string;
    endDate: string;
    nextBillingDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionResponse extends BaseApiResponse<Subscription> { }

// User Limits Types
export interface UserLimits {
    maxExtraFolder: number;
    maxFolderItem: number;
}

export interface UserLimitsResponse extends BaseApiResponse<UserLimits> { }

export interface FriendLimit {
    maxFriend: number;
}

export interface FriendLimitResponse extends BaseApiResponse<FriendLimit> { }

export interface GroupLimit {
    maxAttendGroup: number;
}

export interface GroupLimitResponse extends BaseApiResponse<GroupLimit> { }

export interface GroupStatus {
    maxMember: number;
    groupPlanningTracking: boolean;
}

export interface GroupStatusResponse extends BaseApiResponse<GroupStatus> { }

// Payment Types
export interface PaymentCheckRequest {
    orderCode: number;
}

export interface PaymentCheckResponse extends BaseApiResponse<string> { }

export interface PaymentCreateRequest {
    planId: number;
}

export interface PaymentCreateResponse extends BaseApiResponse<string> { }

export interface PaymentWebhookRequest {
    webhookUrl: string;
}

export interface PaymentWebhookResponse extends BaseApiResponse<{}> { }

export interface PaymentCancelRequest {
    orderCode: number;
}

export interface PaymentCancelResponse extends BaseApiResponse<string> { }

// Group Boost Types
export interface GroupBoostRequest {
    groupId: string;
    monthsToBoost: number;
}

export interface GroupBoostResponse extends BaseApiResponse<{
    id: string;
    user: string;
    group: {
        id: string;
        maxMember: number;
        groupPlanningTracking: boolean;
        createdAt: string;
        updatedAt: string;
    };
    startDate: string;
    endDate: string;
    createdAt: string;
    updatedAt: string;
}> { }

// PayOS Integration Types
export interface PayOSPaymentResponse {
    status: 'success' | 'error';
    data: {
        bin: string;
        accountNumber: string;
        accountName: string;
        amount: number;
        description: string;
        orderCode: number;
        currency: string;
        paymentLinkId: string;
        status: 'PENDING' | 'SUCCESS' | 'FAILED';
        checkoutUrl: string;
        qrCode: string;
    };
    message: string;
}

export interface PayOSWebhookData {
    orderCode: number;
    status: 'SUCCESS' | 'FAILED';
    amount: number;
    description: string;
    paymentLinkId: string;
    createdAt: string;
}

export interface PaymentStatusResponse {
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    orderCode: number;
    amount: number;
    description: string;
}

// Current Usage Types
export interface CurrentUsage {
    folders: number;
    friends: number;
    groups: number;
    groupMembers: number;
}

export interface UsageLimits {
    maxExtraFolder: number;
    maxFolderItem: number;
    maxFriend: number;
    maxAttendGroup: number;
    maxMember: number;
}
