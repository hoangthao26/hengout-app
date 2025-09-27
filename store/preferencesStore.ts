import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { preferenceService } from '../services/preferenceService';
import { UserPreferences } from '../types/preference';

// Types
export interface PreferencesState {
    // State
    preferences: UserPreferences | null;
    isLoading: boolean;
    isUpdating: boolean;
    error: string | null;

    // Actions
    fetchPreferences: () => Promise<void>;
    updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
    updateCategoryTerms: (terms: string[]) => Promise<void>;
    updatePurposeTerms: (terms: string[]) => Promise<void>;
    updateTagTerms: (terms: string[]) => Promise<void>;
    clearPreferences: () => void;
    clearError: () => void;
    setLoading: (loading: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set, get) => ({
            // Initial state
            preferences: null,
            isLoading: false,
            isUpdating: false,
            error: null,

            // Actions
            fetchPreferences: async () => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await preferenceService.getUserPreferences();

                    set({
                        preferences: response.data,
                        isLoading: false,
                        error: null
                    });
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.message || 'Failed to fetch preferences'
                    });
                    throw error;
                }
            },

            updatePreferences: async (updates: Partial<UserPreferences>) => {
                try {
                    set({ isUpdating: true, error: null });

                    await preferenceService.updateUserPreferences(updates);

                    // Update local state
                    const currentPreferences = get().preferences;
                    if (currentPreferences) {
                        set({
                            preferences: { ...currentPreferences, ...updates },
                            isUpdating: false,
                            error: null
                        });
                    }
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to update preferences'
                    });
                    throw error;
                }
            },

            updateCategoryTerms: async (terms: string[]) => {
                try {
                    set({ isUpdating: true, error: null });

                    await preferenceService.updateUserPreferences({ categoryTerms: terms });

                    // Update local state
                    const currentPreferences = get().preferences;
                    if (currentPreferences) {
                        set({
                            preferences: { ...currentPreferences, categoryTerms: terms },
                            isUpdating: false,
                            error: null
                        });
                    }
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to update category terms'
                    });
                    throw error;
                }
            },

            updatePurposeTerms: async (terms: string[]) => {
                try {
                    set({ isUpdating: true, error: null });

                    await preferenceService.updateUserPreferences({ purposeTerms: terms });

                    // Update local state
                    const currentPreferences = get().preferences;
                    if (currentPreferences) {
                        set({
                            preferences: { ...currentPreferences, purposeTerms: terms },
                            isUpdating: false,
                            error: null
                        });
                    }
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to update purpose terms'
                    });
                    throw error;
                }
            },

            updateTagTerms: async (terms: string[]) => {
                try {
                    set({ isUpdating: true, error: null });

                    await preferenceService.updateUserPreferences({ tagTerms: terms });

                    // Update local state
                    const currentPreferences = get().preferences;
                    if (currentPreferences) {
                        set({
                            preferences: { ...currentPreferences, tagTerms: terms },
                            isUpdating: false,
                            error: null
                        });
                    }
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to update tag terms'
                    });
                    throw error;
                }
            },

            clearPreferences: () => {
                // Clear AsyncStorage
                AsyncStorage.removeItem('preferences-storage');

                // Clear in-memory state
                set({
                    preferences: null,
                    isLoading: false,
                    isUpdating: false,
                    error: null
                });
            },
            clearError: () => set({ error: null }),
            setLoading: (loading: boolean) => set({ isLoading: loading }),
        }),
        {
            name: 'preferences-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                preferences: state.preferences,
            }),
        }
    )
);
