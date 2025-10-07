import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { retryNetwork } from './retryService';
import {
    InitializeProfileRequest,
    InitializeResponse,
    ProfileResponse,
    UpdateProfileRequest
} from '../types/profile';

class ProfileService {
    private readonly baseUrl = SERVICES_CONFIG.USER_SERVICE.BASE_URL;

    /**
     * Get current user profile
     * GET /api/v1/profile
     */
    async getUserProfile(): Promise<ProfileResponse> {
        try {
            return await retryNetwork(async () => {
                const endpoint = buildEndpointUrl('USER_SERVICE', 'PROFILE');
                const response = await axiosInstance.get<ProfileResponse>(endpoint);
                return response.data;
            });
        } catch (error: any) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    /**
     * Initialize user profile with required information
     * POST /api/v1/profile/initialize
     */
    async initializeProfile(profileData: InitializeProfileRequest): Promise<InitializeResponse> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'INITIALIZE_PROFILE');
            const response = await axiosInstance.post<InitializeResponse>(endpoint, profileData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to initialize user profile:', error);
            throw error;
        }
    }

    /**
     * Check if user profile is initialized using onboardingComplete from auth response
     * This is the preferred method as it uses the field from login/register response
     */
    isOnboardingComplete(onboardingComplete: boolean): boolean {
        return onboardingComplete === true;
    }

    /**
     * Update user profile - sends full profile data as required by API
     * PUT /api/v1/profile
     */
    async updateProfile(profileData: UpdateProfileRequest): Promise<ProfileResponse> {
        try {
            // First, get current profile to merge with new data
            const currentProfileResponse = await this.getUserProfile();
            const currentProfile = currentProfileResponse.data;

            // Merge current profile with new data
            const fullProfileData = {
                displayName: profileData.displayName ?? currentProfile.displayName,
                gender: profileData.gender ?? currentProfile.gender,
                dateOfBirth: profileData.dateOfBirth ?? currentProfile.dateOfBirth,
                bio: profileData.bio ?? currentProfile.bio,
            };

            const endpoint = buildEndpointUrl('USER_SERVICE', 'UPDATE_PROFILE');
            const response = await axiosInstance.put<ProfileResponse>(endpoint, fullProfileData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to update user profile:', error);
            throw error;
        }
    }

    /**
     * Upload avatar to Cloudinary and update profile
     * PUT /api/v1/profile/avatar
     */
    async uploadAvatar(avatarUrl: string): Promise<ProfileResponse> {
        try {
            const endpoint = `${this.baseUrl}/profile/avatar`;
            const updateData = { avatarUrl };
            const response = await axiosInstance.put<ProfileResponse>(endpoint, updateData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to upload avatar:', error);
            throw error;
        }
    }

    /**
     * Check if user profile is initialized (legacy method - fallback)
     * This method makes an API call to check profile status
     */
    async isProfileInitialized(): Promise<boolean> {
        try {
            const response = await this.getUserProfile();
            return response.status === 'success' && !!response.data.displayName;
        } catch (error: any) {
            console.log('Profile not initialized or error:', error.message);
            return false;
        }
    }
}

// Export singleton instance
export const profileService = new ProfileService();
export default profileService;

