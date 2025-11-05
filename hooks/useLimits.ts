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

/**
 * React hook for managing subscription limits with intelligent fallback strategy
 * 
 * Multi-source limit resolution (priority order):
 * 1. Group status (for groupMembers with groupId) - highest priority (includes boosts)
 * 2. Active subscription plan limits
 * 3. Specific limit stores (folderLimits, friendLimits, groupLimits)
 * 4. Usage limits store (fallback)
 * 
 * Features:
 * - Reactive limit updates when subscription changes
 * - Dual threshold "near limit" detection (percentage + remaining slots)
 * - Guard function that blocks actions and prompts upgrade
 * - Formatted counter label (e.g., "12/200" or "12/∞")
 * 
 * @param entity - Type of limit to check
 * @param currentCount - Current usage count
 * @param onUpgrade - Callback when upgrade is needed/prompted
 * @param options - Optional: groupId for groupMembers limit lookup
 * @returns Limit state with guard function and formatted label
 */
export function useLimits(entity: LimitEntity, currentCount: number, onUpgrade: () => void, options: UseLimitsOptions = {}): UseLimitsResult {
    const toast = useToast();
    const activeSubscription = useSubscriptionStore(state => state.activeSubscription);
    const usageLimits = useSubscriptionStore(state => state.usageLimits);
    const folderLimits = useSubscriptionStore(state => state.folderLimits);
    const friendLimits = useSubscriptionStore(state => state.friendLimits);
    const groupLimits = useSubscriptionStore(state => state.groupLimits);
    const groupStatusMap = useSubscriptionStore(state => state.groupStatus);

    /**
     * Derive limit from multiple sources with priority-based fallback
     * 
     * Priority order:
     * 1. Group status (for groupMembers) - includes boosted limits
     * 2. Active subscription plan
     * 3. Specific limit stores (folder/friend/group limits)
     * 4. General usage limits (fallback)
     */
    const limit = useMemo(() => {
        const plan = activeSubscription?.plan;

        // Priority 1: Group status for groupMembers (supports boosted limits like Discord)
        // Boosted groups may have higher member limits than base plan
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

    /**
     * Calculate limit status with dual threshold strategy
     * 
     * Uses same logic as checkLimit() but memoized for performance.
     * Dual threshold ensures warnings for both high and low limits.
     */
    const result = useMemo(() => {
        const THRESHOLD_RATIO = 0.85;
        const THRESHOLD_REMAINING = 1; // Alert when remaining slots <= 1

        // Unknown limit: Block action until limit is fetched (safety first)
        if (limit == null) {
            return { limit: -1, count: currentCount, isUnlimited: false, isAtLimit: false, isNearLimit: false };
        }

        // Explicitly unlimited (negative value)
        if (limit < 0) {
            return { limit, count: currentCount, isUnlimited: true, isAtLimit: false, isNearLimit: false };
        }

        const isAtLimit = currentCount >= limit;

        // Dual threshold "near limit" calculation:
        // - Percentage: 85% of limit (e.g., 170/200 friends)
        // - Remaining: 1 slot left (e.g., 2/3 groups)
        // OR logic ensures both scenarios are covered
        const remainingSlots = limit - currentCount;
        const percentageThreshold = Math.floor(limit * THRESHOLD_RATIO);
        const isNearLimitByPercentage = !isAtLimit && currentCount >= percentageThreshold;
        const isNearLimitByRemaining = !isAtLimit && remainingSlots <= THRESHOLD_REMAINING;

        const isNearLimit = isNearLimitByPercentage || isNearLimitByRemaining;

        return { limit, count: currentCount, isUnlimited: false, isAtLimit, isNearLimit };
    }, [limit, currentCount]);
    const label = useMemo(() => formatCounter(result.count, limit), [result.count, limit]);

    /**
     * Guard function: Validates if action should proceed
     * 
     * Business logic:
     * - Blocks if limit unknown (safety: wait for limit to load)
     * - Blocks if at limit (shows upgrade prompt)
     * - Allows if unlimited or under limit
     * - Shows soft prompt if near limit (warning before blocking)
     * 
     * @returns true if action allowed, false if blocked
     */
    const guard = () => {
        // Safety: Block if limit not yet loaded (prevents exceeding limits)
        if (limit == null) return false;

        // Check if action is allowed (unlimited or under limit)
        const canProceed = result.isUnlimited || !result.isAtLimit;

        // Show upgrade prompt if blocked or near limit
        if (!canProceed) {
            // At limit - show upgrade prompt (blocks action)
            promptUpgradeIfNeeded(toast, entity, result, onUpgrade);
        } else if (result.isNearLimit) {
            // Near limit - soft warning (allows action but suggests upgrade)
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


