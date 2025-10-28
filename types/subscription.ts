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

// Group Init Types
export interface GroupInitRequest {
    conversationId: string;
}

export interface GroupInitResponse extends BaseApiResponse<{
    id: string;
    maxMember: number;
    groupPlanningTracking: boolean;
    createdAt: string;
    updatedAt: string;
}> { }
