import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import GradientButton from '../../components/GradientButton';
import GradientText from '../../components/GradientText';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';
import { useProfileStore } from '../../store';
import { InitializeProfileRequest } from '../../types/profile';

export default function InitializeProfileScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Zustand store
    const { initializeProfile } = useProfileStore();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<InitializeProfileRequest>({
        gender: 'MALE',
        displayName: '',
        categoryTerms: [],
        purposeTerms: [],
        tagTerms: []
    });

    const handleInitializeProfile = async () => {
        if (!formData.displayName.trim()) {
            showError('Please enter your display name',);
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Initializing profile with data:', formData);

            // Use Zustand store instead of direct API call
            await initializeProfile(formData);

            showSuccess('Profile initialized successfully!',);
            NavigationService.secureNavigateToTabs();
        } catch (error: any) {
            console.error('❌ Profile initialization failed:', error);
            showError(error.message || 'Failed to initialize profile',);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Profile Setup',
            'You can set up your profile later from the Profile tab. Continue to the app?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Skip',
                    style: 'destructive',
                    onPress: () => NavigationService.secureNavigateToTabs()
                }
            ]
        );
    };

    return (
        <AuthErrorBoundary>
            <ScrollView
                style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.header}>
                    {/* No back button - user must complete profile setup */}
                </View>

                {/* Logo Section */}
                <View style={styles.logoSection}>
                    <GradientText
                        style={styles.logo}
                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                    >
                        Hengout
                    </GradientText>
                    <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Complete Your Profile
                    </Text>
                    <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Tell us about yourself to get personalized recommendations
                    </Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                    {/* Display Name */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Display Name *
                        </Text>
                        <View style={[styles.inputContainer, {
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                            borderColor: isDark ? '#374151' : '#E5E7EB'
                        }]}>
                            <TextInput
                                style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                placeholder="Enter your display name"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                value={formData.displayName}
                                onChangeText={(text: string) => setFormData(prev => ({ ...prev, displayName: text }))}
                            />
                        </View>
                    </View>

                    {/* Gender Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Gender
                        </Text>
                        <View style={styles.genderContainer}>
                            {(['MALE', 'FEMALE', 'OTHER'] as const).map((gender) => (
                                <GradientButton
                                    key={gender}
                                    title={gender === 'MALE' ? 'Male' : gender === 'FEMALE' ? 'Female' : 'Other'}
                                    onPress={() => setFormData(prev => ({ ...prev, gender }))}
                                    textFontSize={16}
                                    className={`${formData.gender === gender ? 'opacity-100' : 'opacity-50'}`}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Coming Soon Message */}
                    <View style={styles.comingSoonSection}>
                        <Text style={[styles.comingSoonTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            More Options Coming Soon
                        </Text>
                        <Text style={[styles.comingSoonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Categories, purposes, and tags will be available after Cloudinary setup
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <GradientButton
                        title={loading ? "Setting up..." : "Complete Profile"}
                        onPress={handleInitializeProfile}
                        textFontSize={18}
                        disabled={loading || !formData.displayName.trim()}
                    />

                    <GradientButton
                        title="Skip for Now"
                        onPress={handleSkip}
                        textFontSize={18}
                    />
                </View>
            </ScrollView>
        </AuthErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%'
    },
    header: {
        marginBottom: 20,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        fontSize: 80,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Dongle',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    formSection: {
        marginBottom: 40,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    input: {
        fontSize: 16,
        minHeight: 20,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    genderButton: {
        flex: 1,
        paddingVertical: 12,
    },
    genderButtonActive: {
        opacity: 0.8,
    },
    comingSoonSection: {
        backgroundColor: 'rgba(244, 140, 6, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(244, 140, 6, 0.3)',
        marginTop: 20,
    },
    comingSoonTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    comingSoonText: {
        fontSize: 14,
        lineHeight: 20,
    },
    actionSection: {
        gap: 16,
    },
    skipButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#6B7280',
    },
});
