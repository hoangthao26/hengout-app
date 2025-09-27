import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STATUS_KEY = 'onboarding_complete';

export class OnboardingService {
    /**
     * Store onboarding completion status from auth response
     */
    static async setOnboardingStatus(onboardingComplete: boolean): Promise<void> {
        try {
            await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, JSON.stringify(onboardingComplete));
            console.log('✅ Onboarding status saved:', onboardingComplete);
        } catch (error) {
            console.error('❌ Failed to save onboarding status:', error);
        }
    }

    /**
     * Get stored onboarding completion status
     */
    static async getOnboardingStatus(): Promise<boolean | null> {
        try {
            const status = await AsyncStorage.getItem(ONBOARDING_STATUS_KEY);
            if (status !== null) {
                const onboardingComplete = JSON.parse(status);
                console.log('📱 Retrieved onboarding status:', onboardingComplete);
                return onboardingComplete;
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to get onboarding status:', error);
            return null;
        }
    }

    /**
     * Clear onboarding status (on logout)
     */
    static async clearOnboardingStatus(): Promise<void> {
        try {
            await AsyncStorage.removeItem(ONBOARDING_STATUS_KEY);
            console.log('✅ Onboarding status cleared');
        } catch (error) {
            console.error('❌ Failed to clear onboarding status:', error);
        }
    }

    /**
     * Check if onboarding is complete using stored status
     */
    static async isOnboardingComplete(): Promise<boolean> {
        const status = await this.getOnboardingStatus();
        return status === true;
    }
}

export default OnboardingService;
