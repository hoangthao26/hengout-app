import { useSubscriptionStore } from '../store/subscriptionStore';
import { UsageLimits } from '../types/subscription';
import { ToastContextType } from '../types/toast';
import NavigationService from './navigationService';

export type LimitEntity = 'collections' | 'collectionItems' | 'friends' | 'groups' | 'groupMembers' | 'groupBoost';

export interface LimitCheckResult {
    limit: number; // -1 means unlimited
    count: number;
    isUnlimited: boolean;
    isAtLimit: boolean;
    isNearLimit: boolean; // within threshold
}

const NEAR_THRESHOLD_RATIO = 0.85; // 85% of limit
const NEAR_THRESHOLD_REMAINING = 1; // Alert when remaining slots <= 2

export function getPlanLimits(): UsageLimits | null {
    const { activeSubscription } = useSubscriptionStore.getState();
    if (!activeSubscription?.plan) return null;
    const plan = activeSubscription.plan;
    return {
        maxExtraFolder: plan.maxExtraFolder, // collections
        maxFolderItem: plan.maxFolderItem,   // items per collection (if applied globally)
        maxFriend: plan.maxFriend,
        maxAttendGroup: plan.maxAttendGroup,
        maxMember: plan.maxMember,
    } as unknown as UsageLimits & {
        maxFriend: number;
        maxAttendGroup: number;
        maxMember: number;
    };
}

export function getLimitFor(entity: LimitEntity): number | null {
    const limits = getPlanLimits();
    if (!limits) return null;
    switch (entity) {
        case 'collections':
            return (limits as any).maxExtraFolder ?? null;
        case 'collectionItems':
            return limits.maxFolderItem ?? null;
        case 'friends':
            return (limits as any).maxFriend ?? null;
        case 'groups':
            return (limits as any).maxAttendGroup ?? null;
        case 'groupMembers':
            return (limits as any).maxMember ?? null;
        default:
            return null;
    }
}

/**
 * Check if entity usage is within limits and determine limit status
 * 
 * Complex limit checking logic:
 * 1. Handles null limits (unlimited, returns early)
 * 2. Handles negative limits (< 0 means unlimited)
 * 3. Calculates "near limit" using dual threshold strategy:
 *    - Percentage-based: 85% of limit (works for high limits like 200)
 *    - Remaining slots: <= 1 slot remaining (works for low limits like 3)
 * 
 * Dual threshold ensures proper warnings for both scenarios:
 * - High limits: Warn at 85% (e.g., 170/200 friends)
 * - Low limits: Warn when 1 slot left (e.g., 2/3 groups)
 * 
 * @param entity - Type of limit to check
 * @param count - Current usage count
 * @returns Limit check result with unlimited flag, at-limit flag, and near-limit flag
 */
export function checkLimit(entity: LimitEntity, count: number): LimitCheckResult {
    const limit = getLimitFor(entity);
    
    // Case 1: Unknown limit (null) - treat as unlimited
    if (limit == null) {
        return { limit: -1, count, isUnlimited: true, isAtLimit: false, isNearLimit: false };
    }
    
    // Case 2: Explicitly unlimited (negative value)
    if (limit < 0) {
        return { limit, count, isUnlimited: true, isAtLimit: false, isNearLimit: false };
    }
    
    // Case 3: Check against positive limit
    const isAtLimit = count >= limit;

    // Dual threshold strategy for "near limit" calculation:
    // Strategy A: Percentage-based threshold (85% of limit)
    // Strategy B: Remaining slots threshold (<= 1 slot remaining)
    // Use OR logic to catch both high-limit and low-limit scenarios
    const remainingSlots = limit - count;
    const percentageThreshold = Math.floor(limit * NEAR_THRESHOLD_RATIO);
    const isNearLimitByPercentage = !isAtLimit && count >= percentageThreshold;
    const isNearLimitByRemaining = !isAtLimit && remainingSlots <= NEAR_THRESHOLD_REMAINING;

    const isNearLimit = isNearLimitByPercentage || isNearLimitByRemaining;

    return { limit, count, isUnlimited: false, isAtLimit, isNearLimit };
}

export function formatCounter(count: number, limit: number | null): string {
    if (limit == null) return `${count}/–`;
    if (limit < 0) return `${count}/∞`;
    return `${count}/${limit}`;
}

// Show an upgrade toast using the custom 'upgrade' style
export function promptUpgradeIfNeeded(
    toast: Pick<ToastContextType, 'showToast'>,
    entity: LimitEntity,
    result: LimitCheckResult,
    onUpgrade: () => void
): void {
    if (!result.isAtLimit && !result.isNearLimit) return;
    const title = result.isAtLimit
        ? 'Bạn đã đạt giới hạn sử dụng'
        : 'Bạn sắp đạt giới hạn sử dụng';
    const message = (() => {
        switch (entity) {
            case 'collections':
                return 'Nâng cấp Premium để tạo thêm collections.';
            case 'collectionItems':
                return 'Nâng cấp Premium để thêm nhiều item hơn trong collections.';
            case 'friends':
                return 'Nâng cấp Premium để kết bạn nhiều hơn.';
            case 'groups':
                return 'Nâng cấp Premium để tham gia/tạo nhiều nhóm hơn.';
            case 'groupMembers':
                return 'Nâng cấp Premium để tăng số thành viên mỗi nhóm.';
            case 'groupBoost':
                return 'Nâng cấp Premium để có thêm lượt boost nhóm.';
            default:
                return 'Nâng cấp Premium để mở khóa đầy đủ tính năng.';
        }
    })();
    toast.showToast({
        type: 'upgrade',
        title,
        message,
        duration: 5000,
        position: 'top',
        onPress: onUpgrade,
    });
}

// Unified helper: show error (limit reached) then show upgrade toast that opens subscription modal on press
export function showLimitReachedThenUpgrade(
    toast: Pick<ToastContextType, 'error' | 'showToast'>,
    entityLabel: string, // e.g., friends counter like "12/200"
    delayMs: number = 4200,
    onUpgrade?: (() => void) | string
) {
    // Error toast first
    toast.error('Đã đạt giới hạn', `(${entityLabel})`);
    // Decide whether to suggest upgrade based on current plan
    try {
        const { activeSubscription } = useSubscriptionStore.getState();
        const planId: number | undefined = activeSubscription?.plan?.id as any;

        // If Basic (plan 1) -> suggest upgrade
        if (planId === 1) {
            setTimeout(() => {
                const handler = typeof onUpgrade === 'function'
                    ? onUpgrade
                    : typeof onUpgrade === 'string'
                        ? () => NavigationService.navigate(onUpgrade)
                        : undefined;
                toast.showToast({
                    type: 'upgrade',
                    title: 'Nâng cấp để tiếp tục',
                    message: 'Chạm để mở nâng cấp gói và tăng giới hạn sử dụng.',
                    onPress: handler,
                    duration: 5000,
                    position: 'top',
                } as any);
            }, delayMs);
        }
        // If Premium (plan 2 or higher) -> only show limit reached, no upgrade toast
    } catch {
        // Silent fail: keep only the error toast if store is unavailable
    }
}


