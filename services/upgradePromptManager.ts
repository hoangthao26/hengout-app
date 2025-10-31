import { useSubscriptionStore } from '../store/subscriptionStore';

// ============================================================================
// UPGRADE PROMPT MANAGER - Manages contextual upgrade prompts
// ============================================================================

export interface UpgradePromptData {
    id: string;
    message: string;
    feature: string;
    currentLimit: number;
    requiredLimit: number;
    variant: 'warning' | 'info' | 'urgent';
    dismissed: boolean;
    createdAt: number;
}

class UpgradePromptManager {
    private static instance: UpgradePromptManager;
    private prompts: Map<string, UpgradePromptData> = new Map();
    private listeners: ((prompts: UpgradePromptData[]) => void)[] = [];

    static getInstance(): UpgradePromptManager {
        if (!UpgradePromptManager.instance) {
            UpgradePromptManager.instance = new UpgradePromptManager();
        }
        return UpgradePromptManager.instance;
    }

    /**
     * Subscribe to prompt changes
     */
    subscribe(listener: (prompts: UpgradePromptData[]) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Get all active prompts
     */
    getActivePrompts(): UpgradePromptData[] {
        return Array.from(this.prompts.values())
            .filter(prompt => !prompt.dismissed)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Check if user needs upgrade for a specific feature
     */
    checkUpgradeNeeded(feature: keyof import('../types/subscription').CurrentUsage): boolean {
        const { currentUsage, usageLimits } = useSubscriptionStore.getState();
        if (!usageLimits) return false;

        const current = currentUsage[feature];
        const limit = usageLimits[`max${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof import('../types/subscription').UsageLimits];

        if (typeof limit === 'number') {
            return current >= limit * 0.8; // Show upgrade prompt at 80% usage
        }

        return false;
    }

    /**
     * Create upgrade prompt for a feature
     */
    createPrompt(
        feature: string,
        currentUsage: number,
        limit: number,
        variant: 'warning' | 'info' | 'urgent' = 'info'
    ): UpgradePromptData {
        const usagePercentage = (currentUsage / limit) * 100;

        let message = '';
        if (usagePercentage >= 100) {
            message = `You've reached your ${feature} limit. Upgrade to continue using this feature.`;
            variant = 'urgent';
        } else if (usagePercentage >= 90) {
            message = `You're using ${Math.round(usagePercentage)}% of your ${feature} limit. Upgrade soon to avoid interruption.`;
            variant = 'warning';
        } else {
            message = `You're using ${Math.round(usagePercentage)}% of your ${feature} limit. Upgrade for unlimited access.`;
        }

        const prompt: UpgradePromptData = {
            id: `${feature}_${Date.now()}`,
            message,
            feature,
            currentLimit: currentUsage,
            requiredLimit: limit,
            variant,
            dismissed: false,
            createdAt: Date.now(),
        };

        this.prompts.set(prompt.id, prompt);
        this.notifyListeners();

        return prompt;
    }

    /**
     * Dismiss a prompt
     */
    dismissPrompt(promptId: string): void {
        const prompt = this.prompts.get(promptId);
        if (prompt) {
            prompt.dismissed = true;
            this.prompts.set(promptId, prompt);
            this.notifyListeners();
        }
    }

    /**
     * Dismiss all prompts for a feature
     */
    dismissFeaturePrompts(feature: string): void {
        this.prompts.forEach((prompt, id) => {
            if (prompt.feature === feature && !prompt.dismissed) {
                prompt.dismissed = true;
                this.prompts.set(id, prompt);
            }
        });
        this.notifyListeners();
    }

    /**
     * Clear all prompts
     */
    clearAllPrompts(): void {
        this.prompts.clear();
        this.notifyListeners();
    }

    /**
     * Check and create prompts for all features
     */
    checkAllFeatures(): void {
        const { currentUsage, usageLimits } = useSubscriptionStore.getState();
        if (!usageLimits) return;

        // Check folder limits
        if (currentUsage.folders >= usageLimits.maxExtraFolder * 0.8) {
            this.createPrompt(
                'folders',
                currentUsage.folders,
                usageLimits.maxExtraFolder,
                currentUsage.folders >= usageLimits.maxExtraFolder ? 'urgent' : 'warning'
            );
        }

        // Check friend limits
        if (currentUsage.friends >= usageLimits.maxFriend * 0.8) {
            this.createPrompt(
                'friends',
                currentUsage.friends,
                usageLimits.maxFriend,
                currentUsage.friends >= usageLimits.maxFriend ? 'urgent' : 'warning'
            );
        }

        // Check group limits
        if (currentUsage.groups >= usageLimits.maxAttendGroup * 0.8) {
            this.createPrompt(
                'groups',
                currentUsage.groups,
                usageLimits.maxAttendGroup,
                currentUsage.groups >= usageLimits.maxAttendGroup ? 'urgent' : 'warning'
            );
        }

        // Check group member limits
        if (currentUsage.groupMembers >= usageLimits.maxMember * 0.8) {
            this.createPrompt(
                'group members',
                currentUsage.groupMembers,
                usageLimits.maxMember,
                currentUsage.groupMembers >= usageLimits.maxMember ? 'urgent' : 'warning'
            );
        }
    }

    /**
     * Update usage and check for prompts
     */
    updateUsageAndCheck(usage: Partial<import('../types/subscription').CurrentUsage>): void {
        const { updateUsage } = useSubscriptionStore.getState();
        updateUsage(usage);

        // Check for new prompts after a short delay
        setTimeout(() => {
            this.checkAllFeatures();
        }, 100);
    }

    /**
     * Notify listeners of changes
     */
    private notifyListeners(): void {
        const activePrompts = this.getActivePrompts();
        this.listeners.forEach(listener => listener(activePrompts));
    }

    /**
     * Get prompt statistics
     */
    getStats(): {
        total: number;
        active: number;
        dismissed: number;
        byVariant: { [key: string]: number };
    } {
        const allPrompts = Array.from(this.prompts.values());
        const active = allPrompts.filter(p => !p.dismissed);
        const dismissed = allPrompts.filter(p => p.dismissed);

        const byVariant = allPrompts.reduce((acc, prompt) => {
            acc[prompt.variant] = (acc[prompt.variant] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return {
            total: allPrompts.length,
            active: active.length,
            dismissed: dismissed.length,
            byVariant,
        };
    }
}

// Export singleton instance
export const upgradePromptManager = UpgradePromptManager.getInstance();
export default upgradePromptManager;









