import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import AuthBackButton from '../../components/AuthBackButton';
import GradientButton from '../../components/GradientButton';
import GradientText from '../../components/GradientText';
import { AuthErrorBoundary } from '../../components/errorBoundaries';
import { useToast } from '../../contexts/ToastContext';
import { CATEGORY_TERMS, PURPOSE_TERMS, TAG_TERMS } from '../../data/onboardingTerms';
import NavigationService from '../../services/navigationService';
import { OnboardingService } from '../../services/onboardingService';
import { useProfileStore } from '../../store';
import { InitializeProfileRequest } from '../../types/profile';
import { useAuthStore } from '../../store/authStore';

// Gradient Term Component
interface GradientTermProps {
    label: string;
    isSelected: boolean;
    onPress: () => void;
    isDark: boolean;
}

const GradientTerm: React.FC<GradientTermProps> = ({ label, isSelected, onPress, isDark }) => {
    return (
        <TouchableOpacity
            style={styles.termChip}
            onPress={onPress}
            activeOpacity={1}
        >
            {isSelected ? (
                <LinearGradient
                    colors={['#FAA307', '#F48C06', '#DC2F02', '#9D0208']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.termGradientSelected}
                >
                    <Text style={[styles.termText, { color: '#FFFFFF' }]}>
                        {label}
                    </Text>
                </LinearGradient>
            ) : (
                <View style={[
                    styles.termGradientUnselected,
                    {
                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                        borderColor: isDark ? '#374151' : '#D1D5DB'
                    }
                ]}>
                    <Text style={[
                        styles.termText,
                        { color: isDark ? '#FFFFFF' : '#000000' }
                    ]}>
                        {label}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

interface OnboardingData {
    displayName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    categoryTerms: string[];
    purposeTerms: string[];
    tagTerms: string[];
}

const ONBOARDING_STEPS = [
    { id: 'displayName', title: 'Tên hiển thị', required: true },
    { id: 'gender', title: 'Giới tính', required: true },
    { id: 'categories', title: 'Loại địa điểm', required: false },
    { id: 'purposes', title: 'Mục đích', required: false },
    { id: 'tags', title: 'Tiện ích', required: false },
] as const;

export default function OnboardingWizardScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Zustand store
    const { initializeProfile } = useProfileStore();
    const { fastLogout } = useAuthStore();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        displayName: '',
        gender: 'MALE',
        categoryTerms: [],
        purposeTerms: [],
        tagTerms: []
    });

    const currentStepInfo = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    const updateData = (field: keyof OnboardingData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (currentStepInfo.required) {
            if (currentStepInfo.id === 'displayName' && !data.displayName.trim()) {
                showError('Vui lòng nhập tên hiển thị',);
                return;
            }
        }

        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    // Check if current step is valid for next button
    const isStepValid = () => {
        if (currentStepInfo.id === 'displayName') {
            return data.displayName.trim().length > 0;
        }
        if (currentStepInfo.id === 'gender') {
            return data.gender !== null;
        }
        return true; // Optional steps are always valid
    };

    const handleBack = () => {
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    // TEMP: Logout for testing - can be commented out later
    const handleTestLogout = async () => {
        try {
            // Navigate to login immediately for better UX
            NavigationService.logoutToLogin();
            showSuccess('Đã đăng xuất (test)');

            // Background logout to clear data without blocking UI
            setTimeout(async () => {
                try {
                    const { setLogoutMode, setUserLoggedOut } = await import('../../config/axios');
                    setLogoutMode(true);
                    setUserLoggedOut(true);
                    await fastLogout();
                } catch (e) {
                    console.error('Background test logout failed:', e);
                }
            }, 100);
        } catch (e: any) {
            console.error('Test logout failed:', e);
            showError('Đăng xuất thất bại');
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            console.log('[OnboardingWizard] Completing onboarding...', data);

            const profileData: InitializeProfileRequest = {
                displayName: data.displayName,
                gender: data.gender,
                categoryTerms: data.categoryTerms,
                purposeTerms: data.purposeTerms,
                tagTerms: data.tagTerms
            };

            // Use Zustand store instead of direct API call
            await initializeProfile(profileData);

            // Update onboarding status to complete
            await OnboardingService.setOnboardingStatus(true);

            showSuccess('Thiết lập hồ sơ hoàn tất!',);

            // Initialize current vibes after onboarding is complete
            try {
                const { locationService } = await import('../../services/locationService');
                await locationService.initCurrentVibes();
            } catch { }

            // Prefer real GPS for Discover navigation
            try {
                const { smartLocationService } = await import('../../services/smartLocationService');
                const location = await smartLocationService.getCurrentLocation({
                    accuracy: 3,
                    timeout: 10000,
                    retries: 2,
                    useCache: true
                });
                if (location) {
                    NavigationService.secureNavigateToDiscover({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy || 0
                    });
                } else {
                    NavigationService.secureNavigateToDiscover();
                }
            } catch {
            NavigationService.secureNavigateToDiscover();
            }
        } catch (error: any) {
            console.error('[OnboardingWizard] Onboarding failed:', error);
            showError(error.message || 'Không thể hoàn tất thiết lập hồ sơ',);
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStepInfo.id) {
            case 'displayName':
                return (
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Chúng tôi nên gọi bạn là gì?
                        </Text>
                        <View style={[styles.inputContainer, {
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                            borderColor: isDark ? '#374151' : '#D1D5DB'
                        }]}>
                            <TextInput
                                style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                placeholder="Nhập tên hiển thị của bạn"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                value={data.displayName}
                                onChangeText={(text) => updateData('displayName', text)}
                                autoCapitalize="words"
                                autoCorrect={false}
                                autoFocus
                            />
                        </View>
                    </View>
                );

            case 'gender':
                return (
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Bạn xác định giới tính như thế nào?
                        </Text>
                        <View style={styles.genderContainer}>
                            {(['MALE', 'FEMALE', 'OTHER'] as const).map((gender) => (
                                <TouchableOpacity
                                    key={gender}
                                    onPress={() => updateData('gender', gender)}
                                    style={styles.genderOption}
                                >
                                    {data.gender === gender ? (
                                        <LinearGradient
                                            colors={['#F48C06', '#F97316']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.genderGradient}
                                        >
                                            <Text style={[styles.genderText, { color: '#FFFFFF' }]}>
                                                {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={[
                                            styles.genderGradient,
                                            {
                                                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                                borderColor: isDark ? '#374151' : '#D1D5DB'
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.genderText,
                                                { color: isDark ? '#FFFFFF' : '#000000' }
                                            ]}>
                                                {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );


            case 'categories':
                return (
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Bạn thích loại địa điểm nào? (tùy chọn)
                        </Text>
                        <View style={styles.termsContainer}>
                            {CATEGORY_TERMS.map((term) => (
                                <GradientTerm
                                    key={term.id}
                                    label={term.label}
                                    isSelected={data.categoryTerms.includes(term.id)}
                                    isDark={isDark}
                                    onPress={() => {
                                        const newTerms = data.categoryTerms.includes(term.id)
                                            ? data.categoryTerms.filter(id => id !== term.id)
                                            : [...data.categoryTerms, term.id];
                                        updateData('categoryTerms', newTerms);
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                );

            case 'purposes':
                return (
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Bạn thường đi để làm gì? (tùy chọn)
                        </Text>
                        <View style={styles.termsContainer}>
                            {PURPOSE_TERMS.map((term) => (
                                <GradientTerm
                                    key={term.id}
                                    label={term.label}
                                    isSelected={data.purposeTerms.includes(term.id)}
                                    isDark={isDark}
                                    onPress={() => {
                                        const newTerms = data.purposeTerms.includes(term.id)
                                            ? data.purposeTerms.filter(id => id !== term.id)
                                            : [...data.purposeTerms, term.id];
                                        updateData('purposeTerms', newTerms);
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                );

            case 'tags':
                return (
                    <View style={styles.stepContent}>
                        <Text style={[styles.stepDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Bạn quan tâm đến tiện ích gì? (tùy chọn)
                        </Text>
                        <View style={styles.termsContainer}>
                            {TAG_TERMS.map((term) => (
                                <GradientTerm
                                    key={term.id}
                                    label={term.label}
                                    isSelected={data.tagTerms.includes(term.id)}
                                    isDark={isDark}
                                    onPress={() => {
                                        const newTerms = data.tagTerms.includes(term.id)
                                            ? data.tagTerms.filter(id => id !== term.id)
                                            : [...data.tagTerms, term.id];
                                        updateData('tagTerms', newTerms);
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <AuthErrorBoundary>
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.container}>
                    {/* Back Button - Only show if not first step */}
                    {!isFirstStep && <AuthBackButton onPress={handleBack} />}

                    {/* TEMP Test Logout Button - comment out after testing */}
                    <View style={styles.logoutContainer}>
                        <TouchableOpacity onPress={handleTestLogout} style={styles.logoutButton}>
                            <Text style={[styles.logoutText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Đăng xuất (test)</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <GradientText
                            style={styles.title}
                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                        >
                            {t('setup_profile')}
                        </GradientText>

                        {/* Progress Bar */}
                        <View style={[styles.progressContainer, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                            <View
                                style={[
                                    styles.progressBar,
                                    {
                                        width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
                                        backgroundColor: '#F48C06'
                                    }
                                ]}
                            />
                        </View>

                        <Text style={[styles.stepTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Bước {currentStep + 1} trong {ONBOARDING_STEPS.length}: {currentStepInfo.title}
                        </Text>
                    </View>

                    {/* Step Content */}
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <View style={styles.buttonContainer}>
                        <View style={styles.mainButtons}>
                            {!currentStepInfo.required && (
                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={handleSkip}
                                    disabled={loading}
                                >
                                    <Text style={[styles.skipText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        Bỏ qua
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <GradientButton
                                title={loading ? 'Đang khởi tạo...' : (isLastStep ? 'Hoàn tất' : 'Tiếp theo')}
                                onPress={handleNext}
                                textFontSize={18}
                                disabled={loading || !isStepValid()}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </AuthErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
    logoutContainer: {
        position: 'absolute',
        top: 20,
        right: 24,
    },
    logoutButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    logoutText: {
        fontSize: 12,
        fontWeight: '500',
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    progressContainer: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    stepContent: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 0,
    },
    stepDescription: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    inputContainer: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    textInput: {
        fontSize: 16,
        minHeight: 22,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    genderOption: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    genderGradient: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderText: {
        fontSize: 16,
        fontWeight: '500',
    },
    termsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        paddingHorizontal: 16,
        maxHeight: 280,
    },
    termChip: {
        borderRadius: 20,
        marginBottom: 8,
        overflow: 'hidden',
    },
    termGradientSelected: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent', // Invisible border to maintain size consistency
    },
    termGradientUnselected: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    termText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    placeholderContainer: {
        alignItems: 'center',
        padding: 40,
    },
    placeholderText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: 32,
        paddingBottom: 40,
    },
    mainButtons: {
        gap: 12,
    },
    skipButton: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

