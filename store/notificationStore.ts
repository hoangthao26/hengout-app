import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationState {
    // Badge counts
    totalUnreadCount: number;
    conversationUnreadCounts: Record<string, number>; // conversationId -> count

    // Notification settings
    isInAppNotificationEnabled: boolean;
    isSoundEnabled: boolean;
    isVibrationEnabled: boolean;

    // Active notifications
    activeNotifications: string[]; // conversationIds that have active notifications

    // Actions
    incrementUnreadCount: (conversationId: string) => void;
    decrementUnreadCount: (conversationId: string) => void;
    resetUnreadCount: (conversationId: string) => void;
    resetAllUnreadCounts: () => void;

    // Settings
    toggleInAppNotification: () => void;
    toggleSound: () => void;
    toggleVibration: () => void;

    // Notification management
    addActiveNotification: (conversationId: string) => void;
    removeActiveNotification: (conversationId: string) => void;
    clearActiveNotifications: () => void;

    // Computed values
    getUnreadCount: (conversationId: string) => number;
    hasUnreadMessages: (conversationId: string) => boolean;
    hasAnyUnreadMessages: () => boolean;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            // Initial state
            totalUnreadCount: 0,
            conversationUnreadCounts: {},
            isInAppNotificationEnabled: true,
            isSoundEnabled: true,
            isVibrationEnabled: true,
            activeNotifications: [],

            // Badge count actions
            incrementUnreadCount: (conversationId: string) => {
                set((state) => {
                    const currentCount = state.conversationUnreadCounts[conversationId] || 0;
                    const newCount = currentCount + 1;

                    return {
                        conversationUnreadCounts: {
                            ...state.conversationUnreadCounts,
                            [conversationId]: newCount,
                        },
                        totalUnreadCount: state.totalUnreadCount + 1,
                    };
                });
            },

            decrementUnreadCount: (conversationId: string) => {
                set((state) => {
                    const currentCount = state.conversationUnreadCounts[conversationId] || 0;
                    if (currentCount <= 0) return state;

                    const newCount = Math.max(0, currentCount - 1);
                    const newConversationCounts = { ...state.conversationUnreadCounts };

                    if (newCount === 0) {
                        delete newConversationCounts[conversationId];
                    } else {
                        newConversationCounts[conversationId] = newCount;
                    }

                    return {
                        conversationUnreadCounts: newConversationCounts,
                        totalUnreadCount: Math.max(0, state.totalUnreadCount - 1),
                    };
                });
            },

            resetUnreadCount: (conversationId: string) => {
                set((state) => {
                    const currentCount = state.conversationUnreadCounts[conversationId] || 0;
                    if (currentCount === 0) return state;

                    const newConversationCounts = { ...state.conversationUnreadCounts };
                    delete newConversationCounts[conversationId];

                    return {
                        conversationUnreadCounts: newConversationCounts,
                        totalUnreadCount: Math.max(0, state.totalUnreadCount - currentCount),
                    };
                });
            },

            resetAllUnreadCounts: () => {
                set({
                    totalUnreadCount: 0,
                    conversationUnreadCounts: {},
                    activeNotifications: [],
                });
            },

            // Settings actions
            toggleInAppNotification: () => {
                set((state) => ({
                    isInAppNotificationEnabled: !state.isInAppNotificationEnabled,
                }));
            },

            toggleSound: () => {
                set((state) => ({
                    isSoundEnabled: !state.isSoundEnabled,
                }));
            },

            toggleVibration: () => {
                set((state) => ({
                    isVibrationEnabled: !state.isVibrationEnabled,
                }));
            },

            // Notification management
            addActiveNotification: (conversationId: string) => {
                set((state) => ({
                    activeNotifications: [...state.activeNotifications, conversationId],
                }));
            },

            removeActiveNotification: (conversationId: string) => {
                set((state) => ({
                    activeNotifications: state.activeNotifications.filter(id => id !== conversationId),
                }));
            },

            clearActiveNotifications: () => {
                set({ activeNotifications: [] });
            },

            // Computed values
            getUnreadCount: (conversationId: string) => {
                return get().conversationUnreadCounts[conversationId] || 0;
            },

            hasUnreadMessages: (conversationId: string) => {
                return (get().conversationUnreadCounts[conversationId] || 0) > 0;
            },

            hasAnyUnreadMessages: () => {
                return get().totalUnreadCount > 0;
            },
        }),
        {
            name: 'notification-store',
            partialize: (state) => ({
                // Only persist settings, not counts (counts should reset on app restart)
                isInAppNotificationEnabled: state.isInAppNotificationEnabled,
                isSoundEnabled: state.isSoundEnabled,
                isVibrationEnabled: state.isVibrationEnabled,
            }),
        }
    )
);

