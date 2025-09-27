import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Types
export interface ModalState {
    isVisible: boolean;
    type?: 'datePicker' | 'imagePicker' | 'confirmation' | 'custom';
    data?: any;
}

export interface LoadingState {
    isLoading: boolean;
    message?: string;
    type?: 'global' | 'local';
}

export interface UIState {
    // Modal state
    modal: ModalState;

    // Loading state
    loading: LoadingState;

    // Theme state
    theme: 'light' | 'dark' | 'system';

    // Actions
    showModal: (type: ModalState['type'], data?: any) => void;
    hideModal: () => void;

    setLoading: (loading: boolean, message?: string, type?: LoadingState['type']) => void;

    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    // Utility actions
    clearAllStates: () => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            // Initial state
            modal: {
                isVisible: false,
                type: undefined,
                data: undefined,
            },

            loading: {
                isLoading: false,
                message: undefined,
                type: 'local',
            },

            theme: 'system',

            // Actions
            showModal: (type, data) => {
                set({
                    modal: {
                        isVisible: true,
                        type,
                        data,
                    },
                });
            },

            hideModal: () => {
                set({
                    modal: {
                        isVisible: false,
                        type: undefined,
                        data: undefined,
                    },
                });
            },

            setLoading: (isLoading, message, type = 'local') => {
                set({
                    loading: {
                        isLoading,
                        message,
                        type,
                    },
                });
            },

            setTheme: (theme) => {
                set({ theme });
            },

            clearAllStates: () => {
                set({
                    modal: {
                        isVisible: false,
                        type: undefined,
                        data: undefined,
                    },
                    loading: {
                        isLoading: false,
                        message: undefined,
                        type: 'local',
                    },
                });
            },
        }),
        {
            name: 'ui-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                theme: state.theme,
            }),
        }
    )
);
