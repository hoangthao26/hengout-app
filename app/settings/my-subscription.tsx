import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    useColorScheme,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { Crown, CheckCircle, Calendar, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { subscriptionService } from '../../services/subscriptionService';
import { SubscriptionModal, PaymentScreen } from '../../components/subscription';
import { paymentFlowManager } from '../../services/paymentFlowManager';
import { useToast } from '../../contexts/ToastContext';

export default function MySubscriptionScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { success: showSuccess, error: showError } = useToast();

    const {
        activeSubscription,
        subscriptionLoading,
        subscriptionError,
        fetchActiveSubscription,
        plans
    } = useSubscriptionStore();

    const [refreshing, setRefreshing] = React.useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);

    useEffect(() => {
        fetchActiveSubscription();
    }, [fetchActiveSubscription]);

    // Listen for payment flow changes
    useEffect(() => {
        const unsubscribe = paymentFlowManager.subscribe(() => {
            const currentPayment = paymentFlowManager.getCurrentPayment();
            if (currentPayment) {
                setSelectedPlan(currentPayment.plan);
                setShowPaymentScreen(true);
            } else {
                setShowPaymentScreen(false);
                setSelectedPlan(null);
            }
        });

        return unsubscribe;
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchActiveSubscription();
        setRefreshing(false);
    }, [fetchActiveSubscription]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysLeft = (endDate: string) => {
        const end = new Date(endDate).getTime();
        if (Number.isNaN(end)) return null;
        const now = Date.now();
        const diffMs = end - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    const handleUpgrade = () => {
        setShowSubscriptionModal(true);
    };

    const handlePlanSelect = async (plan: any) => {
        setShowSubscriptionModal(false);

        try {
            const paymentData = await paymentFlowManager.startPayment(plan);
        } catch (error: any) {
            console.error('[MySubscriptionScreen] Failed to start payment:', error);
            showError('Không thể bắt đầu thanh toán. Vui lòng thử lại.');
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentScreen(false);
        setSelectedPlan(null);
        showSuccess('Kích hoạt gói đăng ký thành công!');
        fetchActiveSubscription();
    };

    const handlePaymentBack = () => {
        setShowPaymentScreen(false);
        setSelectedPlan(null);
    };

    const handleSubscriptionModalClose = () => {
        setShowSubscriptionModal(false);
    };

    if (subscriptionLoading && !activeSubscription) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <Header
                    title="Gói Đăng Ký"
                    onBackPress={() => router.back()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FAA307" />
                    <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Đang tải thông tin gói đăng ký...
                    </Text>
                </View>
            </View>
        );
    }

    const daysLeft = activeSubscription ? getDaysLeft(activeSubscription.endDate) : null;
    const isPremium = activeSubscription?.plan?.id === 2;
    const plan = activeSubscription?.plan;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title="Gói Đăng Ký"
                onBackPress={() => router.back()}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#FFFFFF' : '#000000'}
                    />
                }
            >
                {subscriptionError && !activeSubscription ? (
                    <View style={[styles.errorContainer, isDark && styles.errorContainerDark]}>
                        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
                            {subscriptionError}
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryButton, isDark && styles.retryButtonDark]}
                            onPress={() => fetchActiveSubscription()}
                        >
                            <Text style={styles.retryButtonText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : !activeSubscription ? (
                    <View style={[styles.noSubscriptionContainer, isDark && styles.noSubscriptionContainerDark]}>
                        <Crown size={64} color={isDark ? '#6B7280' : '#9CA3AF'} />
                        <Text style={[styles.noSubscriptionTitle, isDark && styles.noSubscriptionTitleDark]}>
                            Chưa có gói đăng ký
                        </Text>
                        <Text style={[styles.noSubscriptionText, isDark && styles.noSubscriptionTextDark]}>
                            Nâng cấp ngay để mở khóa đầy đủ tính năng
                        </Text>
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={handleUpgrade}
                        >
                            <LinearGradient
                                colors={['#FAA307', '#F48C06', '#DC2F02', '#9D0208']}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.upgradeButtonGradient}
                            >
                                <Crown size={20} color="#FFFFFF" />
                                <Text style={styles.upgradeButtonText}>Nâng Cấp Ngay</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Plan Card */}
                        <View style={[styles.planCard, isDark && styles.planCardDark]}>
                            {isPremium ? (
                                <LinearGradient
                                    colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                    locations={[0, 0.31, 0.69, 1]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.premiumGradient}
                                >
                                    <View style={styles.planHeader}>
                                        <View style={styles.planIconContainer}>
                                            <Crown size={32} color="#FFFFFF" />
                                        </View>
                                        <View style={styles.planInfo}>
                                            <Text style={styles.premiumPlanName}>{plan?.name || 'Premium'}</Text>
                                            <Text style={styles.premiumPrice}>
                                                {subscriptionService.formatPlanPrice(plan!)}
                                            </Text>
                                            <Text style={styles.premiumInterval}>
                                                / {subscriptionService.getPlanIntervalDescription(plan!)}
                                            </Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={styles.basicPlanHeader}>
                                    <View style={styles.planIconContainer}>
                                        <CheckCircle size={32} color={isDark ? '#10B981' : '#059669'} />
                                    </View>
                                    <View style={styles.planInfo}>
                                        <Text style={[styles.basicPlanName, isDark && styles.basicPlanNameDark]}>
                                            {plan?.name || 'Basic'}
                                        </Text>
                                        <Text style={[styles.basicPrice, isDark && styles.basicPriceDark]}>
                                            {subscriptionService.formatPlanPrice(plan!)}
                                        </Text>
                                        <Text style={[styles.basicInterval, isDark && styles.basicIntervalDark]}>
                                            / {subscriptionService.getPlanIntervalDescription(plan!)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Subscription Details */}
                        <View style={[styles.detailsCard, isDark && styles.detailsCardDark]}>
                            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                                Thông Tin Gói Đăng Ký
                            </Text>

                            {/* Status */}
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, isDark && styles.detailLabelDark]}>Trạng thái:</Text>
                                <View style={[
                                    styles.statusBadge,
                                    activeSubscription.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive,
                                    isDark && styles.statusBadgeDark
                                ]}>
                                    <Text style={styles.statusText}>
                                        {activeSubscription.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã hết hạn'}
                                    </Text>
                                </View>
                            </View>

                            {/* Start Date */}
                            <View style={styles.detailRow}>
                                <Calendar size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                <View style={styles.detailInfo}>
                                    <Text style={[styles.detailLabel, isDark && styles.detailLabelDark]}>Ngày bắt đầu:</Text>
                                    <Text style={[styles.detailValue, isDark && styles.detailValueDark]}>
                                        {formatDateTime(activeSubscription.startDate)}
                                    </Text>
                                </View>
                            </View>

                            {/* End Date */}
                            <View style={styles.detailRow}>
                                <Clock size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                <View style={styles.detailInfo}>
                                    <Text style={[styles.detailLabel, isDark && styles.detailLabelDark]}>Ngày hết hạn:</Text>
                                    <Text style={[styles.detailValue, isDark && styles.detailValueDark]}>
                                        {formatDateTime(activeSubscription.endDate)}
                                    </Text>
                                </View>
                            </View>

                            {/* Days Left */}
                            {daysLeft !== null && (
                                <View style={styles.detailRow}>
                                    <View style={styles.detailInfo}>
                                        <Text style={[styles.detailLabel, isDark && styles.detailLabelDark]}>Còn lại:</Text>
                                        <Text style={[
                                            styles.daysLeftText,
                                            daysLeft <= 7 && daysLeft > 0 ? styles.daysLeftWarning : styles.daysLeftNormal,
                                            isDark && styles.daysLeftTextDark
                                        ]}>
                                            {daysLeft > 0 ? `${daysLeft} ngày` : daysLeft === 0 ? 'Hết hạn hôm nay' : 'Đã hết hạn'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Plan Features */}
                        <View style={[styles.featuresCard, isDark && styles.featuresCardDark]}>
                            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                                Tính Năng
                            </Text>

                            <View style={styles.featuresList}>
                                <View style={styles.featureItem}>
                                    <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {plan?.maxExtraFolder || 0} collections
                                    </Text>
                                </View>

                                <View style={styles.featureItem}>
                                    <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {plan?.maxFolderItem === -1 ? '∞' : plan?.maxFolderItem || 0} items/collection
                                    </Text>
                                </View>

                                <View style={styles.featureItem}>
                                    <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {(plan as any)?.maxFriend || 0} bạn bè
                                    </Text>
                                </View>

                                <View style={styles.featureItem}>
                                    <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {(plan as any)?.maxAttendGroup || 0} nhóm
                                    </Text>
                                </View>

                                <View style={styles.featureItem}>
                                    <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        {(plan as any)?.maxMember || 0} thành viên/nhóm
                                    </Text>
                                </View>

                                <View style={styles.featureItem}>
                                    <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                    <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                        Boost nhóm: {(plan as any)?.groupBoost || 0} lần
                                    </Text>
                                </View>

                                {(plan as any)?.friendTracking !== undefined && (
                                    <View style={styles.featureItem}>
                                        <CheckCircle size={18} color={isDark ? '#10B981' : '#059669'} />
                                        <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                            Theo dõi bạn bè: {(plan as any)?.friendTracking ? 'Có' : 'Không'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsContainer}>
                            {daysLeft !== null && daysLeft <= 30 && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleUpgrade}
                                >
                                    <LinearGradient
                                        colors={['#FAA307', '#F48C06', '#DC2F02', '#9D0208']}
                                        locations={[0, 0.31, 0.69, 1]}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.actionButtonGradient}
                                    >
                                        <Crown size={20} color="#FFFFFF" />
                                        <Text style={styles.actionButtonText}>
                                            {daysLeft <= 0 ? 'Gia Hạn Ngay' : 'Gia Hạn Sớm'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}

                            {(!daysLeft || daysLeft > 30) && (
                                <TouchableOpacity
                                    style={[styles.actionButtonSecondary, isDark && styles.actionButtonSecondaryDark]}
                                    onPress={handleUpgrade}
                                >
                                    <Text style={[styles.actionButtonSecondaryText, isDark && styles.actionButtonSecondaryTextDark]}>
                                        Xem Gói Khác
                                    </Text>
                                    <ChevronRight size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Subscription Modal */}
            <SubscriptionModal
                isVisible={showSubscriptionModal}
                onClose={handleSubscriptionModalClose}
                onPlanSelect={handlePlanSelect}
            />

            {/* Payment Screen */}
            {showPaymentScreen && selectedPlan && (
                <PaymentScreen
                    plan={selectedPlan}
                    onBack={handlePaymentBack}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        gap: 16,
    },
    errorContainerDark: {
        backgroundColor: '#450A0A',
    },
    errorText: {
        fontSize: 16,
        color: '#DC2626',
        textAlign: 'center',
    },
    errorTextDark: {
        color: '#EF4444',
    },
    retryButton: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonDark: {
        backgroundColor: '#EF4444',
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    noSubscriptionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    noSubscriptionContainerDark: {
    },
    noSubscriptionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    noSubscriptionTitleDark: {
        color: '#FFFFFF',
    },
    noSubscriptionText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 8,
    },
    noSubscriptionTextDark: {
        color: '#9CA3AF',
    },
    upgradeButton: {
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    upgradeButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        gap: 8,
    },
    upgradeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    planCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    planCardDark: {
    },
    premiumGradient: {
        padding: 24,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    basicPlanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F9FAFB',
    },
    planIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    planInfo: {
        flex: 1,
    },
    premiumPlanName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    premiumPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    premiumInterval: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    basicPlanName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 4,
    },
    basicPlanNameDark: {
        color: '#FFFFFF',
    },
    basicPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#059669',
        marginBottom: 4,
    },
    basicPriceDark: {
        color: '#10B981',
    },
    basicInterval: {
        fontSize: 14,
        color: '#6B7280',
    },
    basicIntervalDark: {
        color: '#9CA3AF',
    },
    detailsCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    detailsCardDark: {
        backgroundColor: '#1F2937',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 16,
    },
    sectionTitleDark: {
        color: '#FFFFFF',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    detailInfo: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    detailLabelDark: {
        color: '#9CA3AF',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    detailValueDark: {
        color: '#FFFFFF',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusBadgeDark: {
    },
    statusActive: {
        backgroundColor: '#D1FAE5',
    },
    statusInactive: {
        backgroundColor: '#FEE2E2',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
    },
    daysLeftText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    daysLeftNormal: {
        color: '#059669',
    },
    daysLeftWarning: {
        color: '#DC2626',
    },
    daysLeftTextDark: {
        color: '#10B981',
    },
    featuresCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    featuresCardDark: {
        backgroundColor: '#1F2937',
    },
    featuresList: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        color: '#000000',
    },
    featureTextDark: {
        color: '#FFFFFF',
    },
    actionsContainer: {
        gap: 12,
    },
    actionButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionButtonSecondaryDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
    },
    actionButtonSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginRight: 8,
    },
    actionButtonSecondaryTextDark: {
        color: '#FFFFFF',
    },
});
