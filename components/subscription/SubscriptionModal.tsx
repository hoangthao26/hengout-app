import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Crown, BadgeCheck, Check } from 'lucide-react-native';
import { Plan } from '../../types/subscription';
import { subscriptionService } from '../../services/subscriptionService';

interface SubscriptionModalProps {
    isVisible: boolean;
    onClose: () => void;
    onPlanSelect?: (plan: Plan) => void;
}

export default function SubscriptionModal({ isVisible, onClose, onPlanSelect }: SubscriptionModalProps) {
    const isDark = useColorScheme() === 'dark';

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isVisible) return;
        loadPlans();
    }, [isVisible]);

    const loadPlans = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await subscriptionService.getPlans();
            if (res.status === 'success') {
                setPlans(res.data);
            } else {
                setError(res.message || 'Không thể tải danh sách gói');
            }
        } catch (e: any) {
            setError(e?.message || 'Không thể tải danh sách gói');
        } finally {
            setLoading(false);
        }
    };

    const PopularPlanCard = ({ plan }: { plan: Plan }) => {
        const cardIsDark = useColorScheme() === 'dark';
        const bounceAnim = useRef(new Animated.Value(1)).current;
        const shineAnim = useRef(new Animated.Value(-220)).current;

        useEffect(() => {
            let cancelled = false;
            const runCycle = () => {
                if (cancelled) return;
                shineAnim.setValue(-220);
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(bounceAnim, {
                            toValue: 1.015,
                            duration: 1600,
                            useNativeDriver: true,
                        }),
                        Animated.timing(bounceAnim, {
                            toValue: 1,
                            duration: 1600,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.delay(600),
                        Animated.timing(shineAnim, {
                            toValue: 480,
                            duration: 1600,
                            useNativeDriver: true,
                        }),
                        Animated.timing(shineAnim, {
                            toValue: -220,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                        Animated.delay(400),
                    ]),
                ]).start(() => runCycle());
            };
            runCycle();
            return () => {
                cancelled = true;
            };
        }, [bounceAnim, shineAnim]);

        return (
            <View style={styles.planCardWrapper}>
                <Animated.View
                    style={[
                        styles.planCardAnimatedWrapper,
                        { transform: [{ scale: bounceAnim }] }
                    ]}
                >
                    <View style={styles.planCardGradientBorder}>
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.popularShineContainer, { transform: [{ translateX: shineAnim }, { rotate: '18deg' }] }]}
                        >
                            <LinearGradient
                                colors={[
                                    'transparent',
                                    cardIsDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                                    cardIsDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.28)',
                                    cardIsDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                                    'transparent'
                                ]}
                                locations={[0, 0.42, 0.5, 0.58, 1]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.popularShineGradient}
                            />
                        </Animated.View>
                        <LinearGradient
                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                            locations={[0, 0.31, 0.69, 1]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.planCardGradientBorderInner}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.planCardInner,
                                    cardIsDark && styles.planCardInnerDark,
                                ]}
                                onPress={() => onPlanSelect?.(plan)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.planHeader}>
                                    <View style={styles.planIconContainer}>
                                        <Crown size={28} color="#F59E0B" />
                                    </View>
                                    <View style={styles.planInfo}>
                                        <Text style={[styles.planName, cardIsDark && styles.planNameDark]}>
                                            {plan.name}
                                        </Text>
                                        <Text style={[styles.planPrice, cardIsDark && styles.planPriceDark]}>
                                            {subscriptionService.formatPlanPrice(plan)}
                                        </Text>
                                        <Text style={[styles.planInterval, cardIsDark && styles.planIntervalDark]}>
                                            / {subscriptionService.getPlanIntervalDescription(plan)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.planFeatures}>
                                    <View style={[styles.featureItem, cardIsDark && styles.featureItemDark]}>
                                        <Check size={16} color="#10B981" />
                                        <Text style={[styles.featureText, cardIsDark && styles.featureTextDark]}>
                                            {plan.maxExtraFolder} thư mục
                                        </Text>
                                    </View>
                                    <View style={[styles.featureItem, cardIsDark && styles.featureItemDark]}>
                                        <Check size={16} color="#10B981" />
                                        <Text style={[styles.featureText, cardIsDark && styles.featureTextDark]}>
                                            {plan.maxFriend} bạn bè
                                        </Text>
                                    </View>
                                    <View style={[styles.featureItem, cardIsDark && styles.featureItemDark]}>
                                        <Check size={16} color="#10B981" />
                                        <Text style={[styles.featureText, cardIsDark && styles.featureTextDark]}>
                                            {plan.maxAttendGroup} nhóm
                                        </Text>
                                    </View>
                                    <View style={[styles.featureItem, cardIsDark && styles.featureItemDark]}>
                                        <Check size={16} color="#10B981" />
                                        <Text style={[styles.featureText, cardIsDark && styles.featureTextDark]}>
                                            {plan.maxMember} thành viên/nhóm
                                        </Text>
                                    </View>
                                    {(plan as any)?.groupBoost !== undefined && (plan as any)?.groupBoost > 0 && (
                                        <View style={[styles.featureItem, cardIsDark && styles.featureItemDark, styles.boostPill]}>
                                            <Crown size={16} color="#FAA307" />
                                            <Text style={[styles.featureText, cardIsDark && styles.featureTextDark, styles.boostText]}>
                                                Boost nhóm: {(plan as any)?.groupBoost} lần
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                    <View style={styles.popularBadge}>
                        <LinearGradient
                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                            locations={[0, 0.31, 0.69, 1]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.popularBadgeGradient}
                        >
                            <Text style={styles.popularText}>Phổ biến nhất</Text>
                        </LinearGradient>
                    </View>
                </Animated.View>
            </View>
        );
    };

    const renderPlan = (plan: Plan) => {
        const isBasic = plan.code?.toUpperCase() === 'BASIC' || plan.id === 1;
        const isPopular = plan.id === 2;

        if (isPopular) {
            return <PopularPlanCard key={plan.id} plan={plan} />;
        }

        return (
            <View key={plan.id} style={styles.planCardWrapper}>
                {isBasic && (
                    <View style={styles.basicBadge}>
                        <Text style={styles.basicBadgeText}>Gói mặc định</Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[
                        styles.planCard,
                        isDark && styles.planCardDark,
                        isBasic && styles.basicPlan,
                    ]}
                    onPress={isBasic ? undefined : () => onPlanSelect?.(plan)}
                    disabled={isBasic}
                    activeOpacity={isBasic ? 1 : 0.8}
                >
                    <View style={styles.planHeaderRow}>
                        <View style={styles.planIconContainerSmall}>
                            {isBasic ? (
                                <BadgeCheck size={28} color="#10B981" />
                            ) : (
                                <Crown size={28} color="#F59E0B" />
                            )}
                        </View>
                        <View style={styles.planInfoCol}>
                            <Text style={[styles.planName, isDark && styles.planNameDark]}>{plan.name}</Text>
                            <Text style={[styles.planPrice, isDark && styles.planPriceDark]}>
                                {subscriptionService.formatPlanPrice(plan)}
                            </Text>
                            <Text style={[styles.planInterval, isDark && styles.planIntervalDark]}>
                                / {subscriptionService.getPlanIntervalDescription(plan)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.planFeatures}>
                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                            <Check size={16} color="#10B981" />
                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                {plan.maxExtraFolder} collections
                            </Text>
                        </View>
                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                            <Check size={16} color="#10B981" />
                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                {plan.maxFriend} bạn bè
                            </Text>
                        </View>
                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                            <Check size={16} color="#10B981" />
                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                {plan.maxAttendGroup} nhóm
                            </Text>
                        </View>
                        <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                            <Check size={16} color="#10B981" />
                            <Text style={[styles.featureText, isDark && styles.featureTextDark]}>
                                {plan.maxMember} thành viên/nhóm
                            </Text>
                        </View>
                        {(plan as any)?.groupBoost !== undefined && (plan as any)?.groupBoost > 0 && (
                            <View style={[styles.featurePill, isDark && styles.featurePillDark, styles.boostPill]}>
                                <Crown size={16} color="#FAA307" />
                                <Text style={[styles.featureText, isDark && styles.featureTextDark, styles.boostText]}>
                                    Boost nhóm: {(plan as any)?.groupBoost} lần
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const Header = (
        <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>Chọn Gói Của Bạn</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={isDark ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
        </View>
    );

    if (!isVisible) return null;

    return (
        <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
                {Header}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FAA307" />
                        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>Đang tải gói...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadPlans}>
                            <Text style={styles.retryButtonText}>Thử lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.contentContainer}>
                        <ScrollView style={styles.plansContainer} showsVerticalScrollIndicator={false}>
                            {plans.map(renderPlan)}
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <Text style={[styles.renewalText, isDark && styles.renewalTextDark]}>Mua cùng gói sẽ cộng dồn thời gian</Text>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalContainerDark: {
        backgroundColor: '#000000',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    modalTitleDark: {
        color: '#FFFFFF',
    },
    closeButton: {
        padding: 4,
    },
    plansContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    contentContainer: {
        flex: 1,
    },
    planCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    planCardDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
        shadowColor: '#000',
        shadowOpacity: 0.3,
    },
    popularPlan: {
        borderColor: '#FAA307',
        borderWidth: 1.5,
        shadowColor: '#FAA307',
        shadowOpacity: 0.12,
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
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    planNameDark: {
        color: '#F9FAFB',
    },
    planPrice: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FAA307',
        marginBottom: 2,
    },
    planPriceDark: {
        color: '#FAA307',
    },
    planInterval: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    planIntervalDark: {
        color: '#9CA3AF',
    },
    planFeatures: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featurePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
        marginBottom: 8,
        marginRight: 8,
    },
    featurePillDark: {
        backgroundColor: '#374151',
    },
    boostPill: {
        backgroundColor: '#FEF3C7',
    },
    boostPillDark: {
        backgroundColor: '#78350F',
    },
    boostText: {
        color: '#D97706',
        fontWeight: '600',
    },
    boostTextDark: {
        color: '#FCD34D',
    },
    featureText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginLeft: 8,
    },
    featureTextDark: {
        color: '#D1D5DB',
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    termsText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    termsTextDark: {
        color: '#9CA3AF',
    },
    renewalText: {
        fontSize: 12,
        color: '#D97706',
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '500',
    },
    renewalTextDark: {
        color: '#FCD34D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    loadingTextDark: {
        color: '#9CA3AF',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    errorTextDark: {
        color: '#F87171',
    },
    retryButton: {
        backgroundColor: '#FAA307',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButtonText: {
        color: '#6B7280',
        fontSize: 16,
    },
    planCardWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        right: 16,
        zIndex: 10,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#FAA307',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    popularBadgeGradient: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    popularText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    planCardGradientBorder: {
        borderRadius: 16,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    planCardAnimatedWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    planCardGradientBorderInner: {
        borderRadius: 14,
        padding: 2,
    },
    planCardInner: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    planCardInnerDark: {
        backgroundColor: '#1F2937',
    },
    popularShineContainer: {
        position: 'absolute',
        top: -50,
        bottom: -50,
        width: 90,
        left: -60,
        zIndex: 5,
    },
    popularShineGradient: {
        flex: 1,
        opacity: 0.8,
        borderRadius: 20,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    planIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    planInfo: {
        flex: 1,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
        marginBottom: 8,
        marginRight: 8,
    },
    featureItemDark: {
        backgroundColor: '#374151',
    },
    basicBadge: {
        position: 'absolute',
        top: -10,
        right: 16,
        zIndex: 10,
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    basicBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    basicPlan: {
        opacity: 0.7,
    },
});


