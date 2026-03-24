import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Linking
} from 'react-native';
import { ExternalLink, CheckCircle, XCircle, ChevronLeft, BadgeCheck, Crown, Info } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { paymentFlowManager } from '../../services/paymentFlowManager';
import { subscriptionService } from '../../services/subscriptionService';
import { PAYMENT_CONFIG } from '../../config/paymentConfig';
import { Plan } from '../../types/subscription';
import GradientButton from '../GradientButton';

interface PaymentScreenProps {
    plan: Plan;
    onBack: () => void;
    onSuccess: () => void;
}

export default function PaymentScreen({ plan, onBack, onSuccess }: PaymentScreenProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [isLoading, setIsLoading] = useState(false);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [isWebViewDismissed, setIsWebViewDismissed] = useState(false);
    const [dismissTimeout, setDismissTimeout] = useState<NodeJS.Timeout | null>(null);
    const [isOpening, setIsOpening] = useState(false);

    useEffect(() => {
        // Subscribe to payment flow changes
        const unsubscribe = paymentFlowManager.subscribe(() => {
            const currentPayment = paymentFlowManager.getCurrentPayment();
            if (currentPayment) {
                setPaymentData(currentPayment.paymentData);
            } else {
                setPaymentData(null);
            }
        });

        // Get current payment data (don't start new payment)
        const currentPayment = paymentFlowManager.getCurrentPayment();
        if (currentPayment) {
            setPaymentData(currentPayment.paymentData);
        }

        return () => {
            unsubscribe();
            // Clear timeout when component unmounts
            if (dismissTimeout) {
                clearTimeout(dismissTimeout);
            }
        };
    }, [plan.id, dismissTimeout]);

    // Do not handle deep link business logic here; dedicated deep link screens will handle
    useEffect(() => {
        const subscription = Linking.addEventListener('url', () => {
            // Deep link handled by dedicated screens, no logging needed
        });
        return () => subscription?.remove();
    }, []);


    const handleOpenPayment = async () => {
        if (isOpening || paymentFlowManager.getIsProcessing()) {
            return;
        }
        setIsOpening(true);
        if (!paymentData?.checkoutUrl) {
            Alert.alert('Error', 'Payment URL not available');
            setIsOpening(false);
            return;
        }

        try {
            const result = await WebBrowser.openBrowserAsync(paymentData.checkoutUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                controlsColor: '#FAA307',
                showTitle: true,
                enableBarCollapsing: false,
            });

            if (result.type === 'dismiss' || result.type === 'cancel') {
                // User dismissed or cancelled the browser without completing payment
                setIsWebViewDismissed(true);

                // Set timeout to auto-cancel order after 5 minutes if user doesn't reopen payment
                const timeout = setTimeout(() => {
                    paymentFlowManager.cancelPayment();
                    onBack();
                }, PAYMENT_CONFIG.AUTO_CANCEL_MS);

                setDismissTimeout(timeout);
            }
        } catch (error: any) {
            console.error('[PaymentScreen] Failed to open payment:', error);
            Alert.alert('Payment Error', error.message || 'Failed to open payment');
        } finally {
            setIsOpening(false);
        }
    };

    const handleReopenPayment = () => {
        // Clear timeout when user reopens payment
        if (dismissTimeout) {
            clearTimeout(dismissTimeout);
            setDismissTimeout(null);
        }
        if (!isOpening && !paymentFlowManager.getIsProcessing()) {
            setIsWebViewDismissed(false);
            handleOpenPayment();
        }
    };

    const handleCancelPayment = () => {
        if (paymentFlowManager.getIsProcessing()) {
            return;
        }
        Alert.alert(
            'Hủy Thanh Toán',
            'Bạn có chắc chắn muốn hủy thanh toán này không?',
            [
                {
                    text: 'Không',
                    style: 'cancel',
                },
                {
                    text: 'Có, Hủy',
                    style: 'destructive',
                    onPress: () => {
                        // Clear timeout when user cancels payment
                        if (dismissTimeout) {
                            clearTimeout(dismissTimeout);
                            setDismissTimeout(null);
                        }
                        paymentFlowManager.cancelPayment();
                        onBack();
                    },
                },
            ]
        );
    };

    // Immediate cancel when user dismisses the modal (swipe down or system back)
    const handleImmediateClose = () => {
        if (paymentFlowManager.getIsProcessing()) {
            return;
        }
        if (dismissTimeout) {
            clearTimeout(dismissTimeout);
            setDismissTimeout(null);
        }
        paymentFlowManager.cancelPayment();
        onBack();
    };

    const renderLoading = () => (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#FAA307" />
                <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
                    Đang tạo thanh toán...
                </Text>
            </View>
        </View>
    );

    const renderPayment = () => (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <TouchableOpacity onPress={handleCancelPayment} style={styles.backButton}>
                    <ChevronLeft size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
                <Text style={[styles.title, isDark && styles.titleDark]}>
                    Hoàn Thành Thanh Toán
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {(() => {
                    const isPopular = (plan as any)?.code === 'PREMIUM' || (plan as any)?.id === 2;
                    if (isPopular) {
                        return (
                            <LinearGradient
                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.planCardGradientBorder}
                            >
                                <View style={[styles.planCardInner, isDark && styles.planCardInnerDark]}>
                                    <View style={styles.planHeaderRow}>
                                        <View style={styles.planIconContainerSmall}>
                                            <Crown size={24} color="#F59E0B" />
                                        </View>
                                        <View style={styles.planInfoCol}>
                                            <Text style={[styles.planName, isDark && styles.planNameDark]}>
                                                {plan.name}
                                            </Text>
                                            <Text style={[styles.planPrice, isDark && styles.planPriceDark]}>
                                                {subscriptionService.formatPlanPrice(plan)}
                                            </Text>
                                            <Text style={[styles.planInterval, isDark && styles.planIntervalDark]}>
                                                / {subscriptionService.getPlanIntervalDescription(plan)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.featureRow}>
                                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                            <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                                {plan.maxExtraFolder} collections
                                            </Text>
                                        </View>
                                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                            <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                                {plan.maxFriend} bạn bè
                                            </Text>
                                        </View>
                                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                            <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                                {plan.maxAttendGroup} nhóm
                                            </Text>
                                        </View>
                                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                            <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                                {plan.maxMember} thành viên/nhóm
                                            </Text>
                                        </View>
                                        {(plan as any)?.groupBoost !== undefined && (plan as any)?.groupBoost > 0 && (
                                            <View style={[styles.featurePill, isDark && styles.featurePillDark, styles.boostPill, isDark && styles.boostPillDark]}>
                                                <Crown size={14} color="#FAA307" />
                                                <Text style={[styles.featureText, isDark && styles.featureTextDark, styles.boostText, isDark && styles.boostTextDark]}>
                                                    Boost nhóm: {(plan as any)?.groupBoost} lần
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </LinearGradient>
                        );
                    }
                    return (
                        <View style={[styles.planCard, isDark && styles.planCardDark]}>
                            <View style={styles.planHeaderRow}>
                                <View style={styles.planIconContainerSmall}>
                                    <BadgeCheck size={24} color="#10B981" />
                                </View>
                                <View style={styles.planInfoCol}>
                                    <Text style={[styles.planName, isDark && styles.planNameDark]}>
                                        {plan.name}
                                    </Text>
                                    <Text style={[styles.planPrice, isDark && styles.planPriceDark]}>
                                        {subscriptionService.formatPlanPrice(plan)}
                                    </Text>
                                    <Text style={[styles.planInterval, isDark && styles.planIntervalDark]}>
                                        per {subscriptionService.getPlanIntervalDescription(plan)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.featureRow}>
                                <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                    <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {plan.maxExtraFolder} collections
                                    </Text>
                                </View>
                                <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                    <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {plan.maxFriend} bạn bè
                                    </Text>
                                </View>
                                <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                    <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {plan.maxAttendGroup} nhóm
                                    </Text>
                                </View>
                                <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                                    <CheckCircle size={14} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {plan.maxMember} thành viên/nhóm
                                    </Text>
                                </View>
                                {(plan as any)?.groupBoost !== undefined && (plan as any)?.groupBoost > 0 && (
                                    <View style={[styles.featurePill, isDark && styles.featurePillDark, styles.boostPill, isDark && styles.boostPillDark]}>
                                        <Crown size={14} color="#FAA307" />
                                        <Text style={[styles.featureText, isDark && styles.featureTextDark, styles.boostText, isDark && styles.boostTextDark]}>
                                            Boost nhóm: {(plan as any)?.groupBoost} lần
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })()}

                {paymentData && (
                    <View style={[styles.paymentInfo, isDark && styles.paymentInfoDark]}>
                        <Text style={[styles.paymentLabel, isDark && styles.paymentLabelDark]}>
                            Mã đơn hàng: {paymentData.orderCode}
                        </Text>
                        <Text style={[styles.paymentAmount, isDark && styles.paymentAmountDark]}>
                            {subscriptionService.formatPlanPrice(plan)}
                        </Text>
                    </View>
                )}

                <GradientButton
                    title="Tiến Hành Thanh Toán"
                    onPress={handleOpenPayment}
                    disabled={isOpening || paymentFlowManager.getIsProcessing()}
                    size="large"
                    textFontSize={18}
                    className="w-full"
                />

                <Text style={[styles.helpText, isDark && styles.helpTextDark]}>
                    Nhấn để mở trang thanh toán bảo mật
                </Text>
            </ScrollView>
        </View>
    );

    const renderPolling = () => (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <TouchableOpacity onPress={handleCancelPayment} style={styles.backButton}>
                    <ChevronLeft size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
                <Text style={[styles.title, isDark && styles.titleDark]}>
                    {isWebViewDismissed ? 'Chờ Hoàn Thành Thanh Toán' : 'Đang Chờ Thanh Toán'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {(() => {
                    const isPopular = (plan as any)?.code === 'PREMIUM' || (plan as any)?.id === 2;
                    if (isPopular) {
                        return (
                            <LinearGradient
                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.planCardGradientBorder}
                            >
                                <View style={[styles.planCardInner, isDark && styles.planCardInnerDark]}>
                                    <View style={styles.planHeaderRow}>
                                        <View style={styles.planIconContainerSmall}>
                                            <Crown size={24} color="#F59E0B" />
                                        </View>
                                        <View style={styles.planInfoCol}>
                                            <Text style={[styles.planName, isDark && styles.planNameDark]}>
                                                {plan.name}
                                            </Text>
                                            <Text style={[styles.planPrice, isDark && styles.planPriceDark]}>
                                                {subscriptionService.formatPlanPrice(plan)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        );
                    }
                    return (
                        <View style={[styles.planCard, isDark && styles.planCardDark]}>
                            <View style={styles.planHeaderRow}>
                                <View style={styles.planIconContainerSmall}>
                                    <BadgeCheck size={24} color="#10B981" />
                                </View>
                                <View style={styles.planInfoCol}>
                                    <Text style={[styles.planName, isDark && styles.planNameDark]}>
                                        {plan.name}
                                    </Text>
                                    <Text style={[styles.planPrice, isDark && styles.planPriceDark]}>
                                        {subscriptionService.formatPlanPrice(plan)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    );
                })()}

                <View style={[styles.waitingContainer, isDark && styles.waitingContainerDark]}>
                    <View style={styles.statusContainer}>
                        <ActivityIndicator size="large" color="#FAA307" />
                        <Text style={[styles.statusText, isDark && styles.statusTextDark]}>
                            Đang chờ hoàn thành thanh toán...
                        </Text>
                        <Text style={[styles.statusSubtext, isDark && styles.statusSubtextDark]}>
                            {isWebViewDismissed
                                ? 'Bạn có thể mở lại thanh toán hoặc đợi hệ thống xử lý'
                                : 'Vui lòng hoàn thành thanh toán trong trình duyệt'
                            }
                        </Text>
                    </View>

                    <View style={styles.actionButtons}>
                        {isWebViewDismissed && (
                            <TouchableOpacity
                                onPress={handleReopenPayment}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#FAA307', '#F48C06', '#DC2F02', '#9D0208']}
                                    locations={[0, 0.31, 0.69, 1]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.reopenButton, isDark && styles.reopenButtonDark]}
                                >
                                    <ExternalLink size={20} color="#FFFFFF" />
                                    <Text style={[styles.reopenButtonText, isDark && styles.reopenButtonTextDark]}>
                                        Mở Lại Thanh Toán
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
                            onPress={handleCancelPayment}
                            activeOpacity={0.8}
                        >
                            <XCircle size={20} color="#EF4444" />
                            <Text style={[styles.cancelButtonText, isDark && styles.cancelButtonTextDark]}>
                                Hủy Thanh Toán
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.helpContainer, isDark && styles.helpContainerDark]}>
                        <Info size={16} color={isDark ? '#93C5FD' : '#2563EB'} />
                        <Text style={[styles.helpText, isDark && styles.helpTextDark]}>
                            {isWebViewDismissed
                                ? 'Nếu bạn đã thanh toán thành công, vui lòng đợi vài giây để hệ thống xử lý'
                                : 'Sau khi thanh toán thành công, bạn sẽ được chuyển về ứng dụng tự động'
                            }
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );

    // Determine which view to render
    let content: React.ReactNode;
    if (isLoading) {
        content = renderLoading();
    } else if (paymentData && !isWebViewDismissed) {
        content = renderPayment();
    } else {
        content = renderPolling();
    }

    return (
        <Modal
            visible
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleImmediateClose}
        >
            {content}
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        borderBottomColor: '#374151',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
    },
    titleDark: {
        color: '#FFFFFF',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 24,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 24,
        alignItems: 'center',
    },
    planCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        width: '100%',
        alignItems: 'center',
    },
    planCardDark: {
        backgroundColor: '#1F2937',
    },
    planCardGradientBorder: {
        borderRadius: 16,
        padding: 1.5,
        marginBottom: 20,
        width: '100%',
    },
    planCardInner: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
    },
    planCardInnerDark: {
        backgroundColor: '#1F2937',
    },
    planHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    planIconContainerSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    planInfoCol: {
        flex: 1,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 4,
    },
    planNameDark: {
        color: '#FFFFFF',
    },
    planPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FAA307',
        marginBottom: 4,
    },
    planPriceDark: {
        color: '#FAA307',
    },
    planInterval: {
        fontSize: 14,
        color: '#6B7280',
    },
    planIntervalDark: {
        color: '#9CA3AF',
    },
    featureRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
    },
    featurePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    featurePillDark: {
        backgroundColor: '#111827',
        borderColor: '#374151',
    },
    boostPill: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FCD34D',
    },
    boostPillDark: {
        backgroundColor: '#78350F',
        borderColor: '#F59E0B',
    },
    boostText: {
        color: '#D97706',
        fontWeight: '600',
    },
    boostTextDark: {
        color: '#FCD34D',
    },
    featureText: {
        marginLeft: 6,
        color: '#111827',
        fontSize: 13,
        fontWeight: '500',
    },
    featureTextDark: {
        color: '#F3F4F6',
    },
    paymentInfo: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        width: '100%',
    },
    paymentInfoDark: {
        backgroundColor: '#374151',
    },
    paymentLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    paymentLabelDark: {
        color: '#9CA3AF',
    },
    paymentAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    paymentAmountDark: {
        color: '#FFFFFF',
    },
    helpText: {
        flex: 1,
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
        textAlign: 'center',

    },
    helpTextDark: {
        color: '#F59E0B',
    },
    helpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        gap: 8,
    },
    helpContainerDark: {
        backgroundColor: '#0B1220',
        borderColor: '#1D4ED8',
    },
    helpIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    helpIconDark: {
    },
    waitingContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 24,
        marginVertical: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    waitingContainerDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    statusContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    statusText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 16,
        textAlign: 'center',
    },
    statusTextDark: {
        color: '#F9FAFB',
    },
    statusSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
    statusSubtextDark: {
        color: '#9CA3AF',
    },
    actionButtons: {
        gap: 12,
        marginBottom: 20,
    },
    reopenButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    reopenButtonDark: {
        // Gradient colors are the same for both light and dark themes
    },
    reopenButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    reopenButtonTextDark: {
        color: '#FFFFFF',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEE2E2',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    cancelButtonDark: {
        backgroundColor: '#450A0A',
        borderColor: '#DC2626',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#DC2626',
        marginLeft: 8,
    },
    cancelButtonTextDark: {
        color: '#EF4444',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    loadingTextDark: {
        color: '#9CA3AF',
    },
});

