import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { useSubscriptionStore } from '../store/subscriptionStore';
import useLimits from '../hooks/useLimits';
import GradientButton from './GradientButton';
import NavigationService from '../services/navigationService';
import { SubscriptionModal, PaymentScreen } from '../components/subscription';
import { paymentFlowManager } from '../services/paymentFlowManager';
import { Plan } from '../types/subscription';
import { chatService } from '../services/chatService';
import subscriptionService from '../services/subscriptionService';

interface BoostGroupModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conversationId: string;
    conversationName: string;
}

const BoostGroupModal: React.FC<BoostGroupModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
    conversationId,
    conversationName,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    // Selectors to avoid re-render loops
    const fetchActiveSubscription = useSubscriptionStore(state => state.fetchActiveSubscription);
    const activeSubscription = useSubscriptionStore(state => state.activeSubscription);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [months, setMonths] = useState('1');
    const [boosting, setBoosting] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    // Sync with global payment flow
    useEffect(() => {
        const unsubscribe = paymentFlowManager.subscribe(() => {
            const current = paymentFlowManager.getCurrentPayment();
            if (current) {
                setSelectedPlan(current.plan);
                setShowPaymentScreen(true);
            } else {
                setShowPaymentScreen(false);
                setSelectedPlan(null);
            }
        });
        return unsubscribe;
    }, []);

    const handlePlanSelect = useCallback((plan: Plan) => {
        setShowSubscriptionModal(false);
        paymentFlowManager.startPayment(plan).catch(() => { /* handled elsewhere */ });
    }, []);

    const handlePaymentBack = useCallback(() => {
        setShowPaymentScreen(false);
        setSelectedPlan(null);
    }, []);
    const [currentMembersCount, setCurrentMembersCount] = useState(0);
    const [maxMember, setMaxMember] = useState<number | null>(null);

    // Ensure limits are available when modal opens
    React.useEffect(() => {
        if (isVisible && !activeSubscription) {
            fetchActiveSubscription().catch(() => { });
        }
    }, [isVisible, activeSubscription, fetchActiveSubscription]);

    // Get maxMember from store (fetched in details screen)
    const groupStatus = useSubscriptionStore(state => state.groupStatus[conversationId]);

    // Load subscription data and group members when modal opens
    useEffect(() => {
        if (isVisible) {
            fetchActiveSubscription();

            // Load group members to get current count
            chatService.getGroupMembers(conversationId)
                .then(response => {
                    if (response.status === 'success') {
                        setCurrentMembersCount(response.data.length);
                    }
                })
                .catch(err => {
                    console.error('[BoostGroupModal] Failed to load group members:', err);
                });
        }
    }, [isVisible, fetchActiveSubscription, conversationId]);

    // Update maxMember from store when groupStatus changes
    useEffect(() => {
        if (groupStatus?.maxMember !== undefined) {
            setMaxMember(groupStatus.maxMember);
        }
    }, [groupStatus]);

    // Format members label: current/maxMember
    const membersLabel = useMemo(() => {
        if (maxMember === null) {
            return `${currentMembersCount}/–`;
        }
        if (maxMember < 0) {
            return `${currentMembersCount}/∞`;
        }
        return `${currentMembersCount}/${maxMember}`;
    }, [currentMembersCount, maxMember]);

    // Check limits using useLimits hook for boost
    const currentBoostCount = 0; // TODO: Get actual boost count from API
    const { label: boostLabel, limit: boostLimit, guard: guardBoost } = useLimits(
        'groupBoost' as any,
        currentBoostCount,
        () => setShowSubscriptionModal(true)
    );

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['90%'], []);

    // Backdrop: close sheet and dismiss keyboard on outside press
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setTimeout(() => {
                onClose();
                setMonths('1');
            }, 100);
        }
    }, [onClose]);

    // Show/hide modal
    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    // Validate months input
    const validateMonths = (value: string): boolean => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num > 0 && num <= 12;
    };

    const handleMonthsChange = (value: string) => {
        // Only allow numbers
        const numericValue = value.replace(/[^0-9]/g, '');
        if (numericValue === '' || parseInt(numericValue, 10) <= 12) {
            setMonths(numericValue);
        }
    };

    const handleBoost = async () => {
        if (!validateMonths(months)) {
            showError('Vui lòng nhập số tháng hợp lệ (1-12)');
            return;
        }

        const monthsNum = parseInt(months, 10);

        // Check limits using guard
        if (!guardBoost()) {
            return;
        }

        setBoosting(true);
        try {
            // Use conversationId as groupId (no need to initGroup)
            const groupIdForBoost = conversationId;
            const boostRes = await subscriptionService.applyGroupBoost(groupIdForBoost, monthsNum);

            // Handle both formats: BaseApiResponse wrapper or direct data
            let boostSuccess = false;
            let successMessage: string | null = null;

            if (boostRes.status !== undefined) {
                // Has BaseApiResponse wrapper
                boostSuccess = boostRes.status === 'success';
                if (boostSuccess) {
                    // Use message from response if available, otherwise use default
                    successMessage = boostRes.message || `Boost nhóm thành công trong ${monthsNum} tháng!`;
                } else {
                    const errorMsg = boostRes.message || 'Không thể boost nhóm';
                    console.error('[BoostGroupModal] applyGroupBoost failed:', errorMsg);
                    showError(errorMsg);
                    return;
                }
            } else {
                // Direct data response (no wrapper) - assume success if we get data
                boostSuccess = !!boostRes;
                successMessage = `Boost nhóm thành công trong ${monthsNum} tháng!`;
            }

            if (boostSuccess) {
                // Show message from API response
                showSuccess(successMessage || `Boost nhóm thành công trong ${monthsNum} tháng!`);
                // Refresh group status to get new maxMember
                const { fetchGroupStatus } = useSubscriptionStore.getState();
                await fetchGroupStatus(conversationId);
                // Update maxMember from refreshed status (will be updated via useEffect when groupStatus changes)
                onSuccess();
                onClose();
                setMonths('1');
            } else {
                const errorMsg = 'Không thể boost nhóm';
                console.error('[BoostGroupModal] applyGroupBoost failed:', errorMsg);
                showError(errorMsg);
            }
        } catch (e: any) {
            const errorMsg = e?.response?.data?.message || e?.message || 'Không thể boost nhóm';
            console.error('[BoostGroupModal] Boost failed:', errorMsg);
            showError(errorMsg);
        } finally {
            setBoosting(false);
        }
    };


    return (
        <>
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetChanges}
                enablePanDownToClose
                backgroundStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                }}
                handleIndicatorStyle={{
                    backgroundColor: isDark ? '#6B7280' : '#D1D5DB',
                    width: 40,
                    height: 4,
                }}
                backdropComponent={renderBackdrop}
            >
                <BottomSheetView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <View style={{ flex: 1 }}>
                            {/* Header */}
                            <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    disabled={boosting}
                                    style={styles.headerButton}
                                >
                                    <Text style={[
                                        styles.cancelText,
                                        { color: isDark ? '#9CA3AF' : '#6B7280' }
                                    ]}>
                                        Hủy
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.titleContainer}>
                                    <Text style={[
                                        styles.title,
                                        { color: isDark ? '#FFFFFF' : '#000000' }
                                    ]}>
                                        Boost nhóm
                                    </Text>
                                    <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        Thành viên: {membersLabel}
                                    </Text>

                                </View>

                                <View style={styles.headerButtonPlaceholder} />
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                {/* Boost Info */}
                                <View style={styles.infoContainer}>
                                    <View style={styles.iconContainer}>
                                        <Sparkles size={32} color="#F48C06" />
                                    </View>
                                    <Text style={[styles.infoText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        Boost nhóm giúp tăng giới hạn thành viên.
                                    </Text>
                                    {/* {boostLimit !== null && boostLimit >= 0 && (
                                        <Text style={[styles.infoText, { color: '#F48C06', marginTop: 8 }]}>
                                            Boost còn lại: {boostLabel}
                                        </Text>
                                    )} */}
                                </View>

                                {/* Input */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                        Số tháng boost
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                                color: isDark ? '#FFFFFF' : '#000000',
                                                borderColor: isDark ? '#4B5563' : '#D1D5DB',
                                            }
                                        ]}
                                        value={months}
                                        onChangeText={handleMonthsChange}
                                        placeholder="Nhập số tháng (1-12)"
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        keyboardType="numeric"
                                        maxLength={2}
                                        editable={!boosting}
                                    />
                                    <Text style={[styles.hint, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                                        Tối đa 12 tháng
                                    </Text>
                                </View>

                                {/* Boost Button */}
                                <View style={styles.buttonContainer}>
                                    <GradientButton
                                        title={boosting ? 'Đang boost...' : `Boost ${months} tháng`}
                                        onPress={handleBoost}
                                        disabled={boosting || !validateMonths(months)}
                                    />
                                </View>

                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </BottomSheetView>
            </BottomSheet>

            {/* Subscription Modal */}
            <SubscriptionModal
                isVisible={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                onPlanSelect={handlePlanSelect}
            />

            {/* Payment Screen */}
            {showPaymentScreen && selectedPlan ? (
                <PaymentScreen
                    plan={selectedPlan as Plan}
                    onBack={handlePaymentBack}
                    onSuccess={handlePaymentBack}
                />
            ) : null}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        position: 'relative',
    },
    headerButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerButtonPlaceholder: {
        width: 70,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '500',
    },
    titleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '400',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(244, 140, 6, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        alignSelf: 'center',
    },
    infoContainer: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(244, 140, 6, 0.05)',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '600',
        borderWidth: 1,
        textAlign: 'center',
    },
    hint: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    buttonContainer: {
        marginBottom: 16,
    },
});

export default BoostGroupModal;

