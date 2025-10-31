import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CloudinaryService } from '../services/cloudinaryService';
import { profileService } from '../services/profileService';
import { UserProfile } from '../types/profile';

// Types
export interface ProfileState {
    // State
    profile: UserProfile | null;
    isLoading: boolean;
    isUpdating: boolean;
    error: string | null;

    // Actions
    fetchProfile: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    uploadAvatar: (imageUri: string) => Promise<void>;
    initializeProfile: (profileData: {
        gender: 'MALE' | 'FEMALE' | 'OTHER';
        displayName: string;
        categoryTerms: string[];
        purposeTerms: string[];
        tagTerms: string[];
    }) => Promise<void>;
    clearProfile: () => void;
    clearError: () => void;
    setLoading: (loading: boolean) => void;
    setProfile: (profile: UserProfile) => void;
}

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            // Initial state
            profile: null,
            isLoading: false,
            isUpdating: false,
            error: null,

            // Actions
            fetchProfile: async () => {
                try {
                    // If profile already exists, don't fetch again
                    const currentProfile = get().profile;
                    if (currentProfile) {
                        console.log('[ProfileStore] Profile already exists, skipping fetch');
                        return;
                    }

                    set({ isLoading: true, error: null });

                    const response = await profileService.getUserProfile();

                    set({
                        profile: response.data,
                        isLoading: false,
                        error: null
                    });
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.message || 'Failed to fetch profile'
                    });
                    throw error;
                }
            },

            refreshProfile: async () => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await profileService.getUserProfile();

                    set({
                        profile: response.data,
                        isLoading: false,
                        error: null
                    });
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.message || 'Failed to refresh profile'
                    });
                    throw error;
                }
            },

            updateProfile: async (updates: Partial<UserProfile>) => {
                try {
                    set({ isUpdating: true, error: null });

                    // Store original profile for rollback
                    const currentProfile = get().profile;

                    // Optimistic update: Update local state immediately for instant UI feedback
                    if (currentProfile) {
                        set({
                            profile: { ...currentProfile, ...updates },
                            isUpdating: false,
                            error: null
                        });
                    }

                    // Sync with server in background
                    try {
                        await profileService.updateProfile(updates);
                        // Success - keep the optimistic update
                    } catch (serverError: any) {
                        // If server update fails, revert to original state
                        if (currentProfile) {
                            set({
                                profile: currentProfile,
                                isUpdating: false,
                                error: serverError.message || 'Failed to update profile'
                            });
                        }
                        throw serverError;
                    }
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to update profile'
                    });
                    throw error;
                }
            },

            uploadAvatar: async (imageUri: string) => {
                try {
                    set({ isUpdating: true, error: null });

                    // Store original profile for rollback
                    const currentProfile = get().profile;

                    // Upload to Cloudinary first
                    const uploadedUrl = await CloudinaryService.uploadImage(imageUri, 'avatars');

                    // Optimistic update: Update local state immediately for instant UI feedback
                    if (currentProfile) {
                        set({
                            profile: { ...currentProfile, avatarUrl: uploadedUrl },
                            isUpdating: false,
                            error: null
                        });
                    }

                    // Sync with server in background
                    try {
                        await profileService.uploadAvatar(uploadedUrl);
                        // Success - keep the optimistic update
                    } catch (serverError: any) {
                        // If server update fails, revert to original state
                        if (currentProfile) {
                            set({
                                profile: currentProfile,
                                isUpdating: false,
                                error: serverError.message || 'Failed to upload avatar'
                            });
                        }
                        throw serverError;
                    }
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to upload avatar'
                    });
                    throw error;
                }
            },

            initializeProfile: async (profileData) => {
                try {
                    set({ isUpdating: true, error: null });

                    const response = await profileService.initializeProfile(profileData);

                    // Update local state with initialized profile
                    set({
                        profile: {
                            displayName: profileData.displayName,
                            gender: profileData.gender,
                            dateOfBirth: '',
                            bio: '',
                            avatarUrl: undefined,
                            categoryTerms: profileData.categoryTerms,
                            purposeTerms: profileData.purposeTerms,
                            tagTerms: profileData.tagTerms
                        },
                        isUpdating: false,
                        error: null
                    });
                } catch (error: any) {
                    set({
                        isUpdating: false,
                        error: error.message || 'Failed to initialize profile'
                    });
                    throw error;
                }
            },

            clearProfile: () => {
                // Clear AsyncStorage
                AsyncStorage.removeItem('profile-storage');

                // Clear in-memory state
                set({
                    profile: null,
                    isLoading: false,
                    isUpdating: false,
                    error: null
                });
            },
            clearError: () => set({ error: null }),
            setLoading: (loading: boolean) => set({ isLoading: loading }),
            setProfile: (profile: UserProfile) => set({ profile }),
        }),
        {
            name: 'profile-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                profile: state.profile,
            }),
        }
    )
);
