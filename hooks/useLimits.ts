import React, { useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { formatCounter, LimitEntity, promptUpgradeIfNeeded } from '../services/limitsService';
import { useSubscriptionStore } from '../store/subscriptionStore';

export interface UseLimitsResult {
    label: string;
    limit: number | null;
    isUnlimited: boolean;
    isAtLimit: boolean;
    isNearLimit: boolean;
    count: number;
    guard: () => boolean;
}

type UseLimitsOptions = { groupId?: string };

export function useLimits(entity: LimitEntity, currentCount: number, onUpgrade: () => void, options: UseLimitsOptions = {}): UseLimitsResult {
    const toast = useToast();
    const activeSubscription = useSubscriptionStore(state => state.activeSubscription);
    const usageLimits = useSubscriptionStore(state => state.usageLimits);
    const folderLimits = useSubscriptionStore(state => state.folderLimits);
    const friendLimits = useSubscriptionStore(state => state.friendLimits);
    const groupLimits = useSubscriptionStore(state => state.groupLimits);
    const groupStatusMap = useSubscriptionStore(state => state.groupStatus);

    // Derive limit reactively from activeSubscription so the hook re-renders when plan loads
    const limit = useMemo(() => {
        const plan = activeSubscription?.plan;

        // 1) Group members limit from group status (boosted like Discord)
        if (entity === 'groupMembers' && options.groupId) {
            const status = groupStatusMap?.[options.groupId];
            if (typeof status?.maxMember === 'number' && status.maxMember > 0) {
                return status.maxMember;
            }
        }
        const fromPlan = () => {
            if (!plan) return null;
            switch (entity) {
                case 'collections':
                    return plan.maxExtraFolder;
                case 'collectionItems':
                    return plan.maxFolderItem;
                case 'friends':
                    return (plan as any).maxFriend;
                case 'groups':
                    return (plan as any).maxAttendGroup;
                case 'groupMembers':
                    return (plan as any).maxMember;
                case 'groupBoost':
                    return (plan as any).groupBoost;
                default:
                    return null;
            }
        };

        const p = fromPlan();
        if (p != null) return p;

        // Fallback to specific limits already in store if available
        switch (entity) {
            case 'collections':
                return folderLimits?.maxExtraFolder ?? usageLimits?.maxExtraFolder ?? null;
            case 'collectionItems':
                return folderLimits?.maxFolderItem ?? usageLimits?.maxFolderItem ?? null;
            case 'friends':
                return friendLimits?.maxFriend ?? (usageLimits as any)?.maxFriend ?? null;
            case 'groups':
                return groupLimits?.maxAttendGroup ?? (usageLimits as any)?.maxAttendGroup ?? null;
            case 'groupMembers':
                return (usageLimits as any)?.maxMember ?? null;
            case 'groupBoost':
                return (usageLimits as any)?.groupBoost ?? null;
            default:
                return null;
        }
    }, [entity, options.groupId, groupStatusMap, activeSubscription, usageLimits, folderLimits, friendLimits, groupLimits]);

    const result = useMemo(() => {
        const THRESHOLD_RATIO = 0.85;
        const THRESHOLD_REMAINING = 1; // Alert when remaining slots <= 2

        if (limit == null) {
            // Unknown limit: not unlimited, force guard to block
            return { limit: -1, count: currentCount, isUnlimited: false, isAtLimit: false, isNearLimit: false };
        }
        if (limit < 0) {
            return { limit, count: currentCount, isUnlimited: true, isAtLimit: false, isNearLimit: false };
        }
        const isAtLimit = currentCount >= limit;

        // Calculate near limit: either percentage-based OR remaining slots threshold
        // This ensures low limits (e.g., 3) still get proper warnings
        const remainingSlots = limit - currentCount;
        const percentageThreshold = Math.floor(limit * THRESHOLD_RATIO);
        const isNearLimitByPercentage = !isAtLimit && currentCount >= percentageThreshold;
        const isNearLimitByRemaining = !isAtLimit && remainingSlots <= THRESHOLD_REMAINING;

        const isNearLimit = isNearLimitByPercentage || isNearLimitByRemaining;

        return { limit, count: currentCount, isUnlimited: false, isAtLimit, isNearLimit };
    }, [limit, currentCount]);
    const label = useMemo(() => formatCounter(result.count, limit), [result.count, limit]);

    const guard = () => {
        // If limit is unknown, block action (wait until fetched)
        if (limit == null) return false;
        // Return true if allowed to proceed
        const canProceed = result.isUnlimited || !result.isAtLimit;
        if (!canProceed) {
            promptUpgradeIfNeeded(toast, entity, result, onUpgrade);
        } else if (result.isNearLimit) {
            // soft prompt when near limit
            promptUpgradeIfNeeded(toast, entity, result, onUpgrade);
        }
        return canProceed;
    };

    return {
        label, // e.g., "3/12" or "3/∞"
        ...result, // limit, isUnlimited, isAtLimit, isNearLimit, count
        guard,
    };
}

export default useLimits;


