import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, ChevronRight, CheckCircle } from 'lucide-react-native';
import { Subscription } from '../../types/subscription';

interface SubscriptionStatusCardProps {
    subscription?: Subscription | null;
    onUpgrade?: () => void;
}

export default function SubscriptionStatusCard({ subscription, onUpgrade }: SubscriptionStatusCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isBasicPlan = !subscription || subscription.plan.id === 1;

    // Shine sweep animation for Basic plan
    const shineAnim = useRef(new Animated.Value(-200)).current;

    useEffect(() => {
        if (!isBasicPlan) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(3000),
                Animated.timing(shineAnim, {
                    toValue: 400,
                    duration: 1600,
                    useNativeDriver: true,
                }),
                Animated.delay(3000),
                Animated.timing(shineAnim, {
                    toValue: -200,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isBasicPlan, shineAnim]);

    return (
        <View>
            {subscription && subscription.plan.id !== 1 && (
                <View style={[styles.currentRow, isDark && styles.currentRowDark]}>
                    <Crown size={16} color={isDark ? '#FCD34D' : '#D97706'} />
                    <Text style={[styles.currentText, isDark && styles.currentTextDark]}>
                        {subscription.plan.name} • Hết hạn {formatDate(subscription.endDate)}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.upgradeCard, isDark && styles.upgradeCardDark]}
                onPress={onUpgrade}
                activeOpacity={0.7}
            >
                {/* Shine overlay for Basic plan */}
                {isBasicPlan && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.shineContainer,
                            { transform: [{ translateX: shineAnim }, { rotate: '18deg' }] }
                        ]}
                    >
                        <LinearGradient
                            colors={[
                                'transparent',
                                isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                                isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.28)',
                                isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                                'transparent'
                            ]}
                            locations={[0, 0.42, 0.5, 0.58, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shineGradient}
                        />
                    </Animated.View>
                )}

                <View style={styles.upgradeContent}>
                    <View style={styles.upgradeIcon}>
                        <Crown size={20} color="#FAA307" />
                    </View>
                    <View style={styles.upgradeText}>
                        <Text style={[styles.upgradeTitle, isDark && styles.upgradeTitleDark]}>
                            {subscription && subscription.plan.id !== 1 ? 'Gia Hạn Thời Gian' : 'Nâng Cấp Gói Đăng Ký'}
                        </Text>
                        <Text style={[styles.upgradeSubtitle, isDark && styles.upgradeSubtitleDark]}>
                            {subscription && subscription.plan.id !== 1 ? 'Mua thêm để cộng dồn thời gian' : 'Nâng cấp để có thêm quyền hạn'}
                        </Text>
                    </View>
                    <ChevronRight size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
            </TouchableOpacity>
        </View>
    );
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const styles = StyleSheet.create({
    currentRow: {
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    currentRowDark: {
    },
    currentText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    currentTextDark: {
        color: '#9CA3AF',
    },
    subscriptionCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    subscriptionCardDark: {
        backgroundColor: '#064E3B',
        borderColor: '#065F46',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    premiumText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
        marginLeft: 4,
    },
    subscriptionText: {
        fontSize: 14,
        color: '#047857',
        marginBottom: 12,
    },
    subscriptionTextDark: {
        color: '#10B981',
    },
    subscriptionDetails: {
        gap: 6,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 12,
        color: '#047857',
        marginLeft: 6,
    },
    detailTextDark: {
        color: '#10B981',
    },
    upgradeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    upgradeCardDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    shineContainer: {
        position: 'absolute',
        top: -36,
        bottom: -36,
        width: 90,
        left: -60,
        right: undefined,
        zIndex: 5,
    },
    shineGradient: {
        flex: 1,
        opacity: 0.8,
        borderRadius: 20,
    },
    upgradeContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    upgradeIcon: {
        marginRight: 12,
    },
    upgradeText: {
        flex: 1,
    },
    upgradeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 2,
    },
    upgradeTitleDark: {
        color: '#FFFFFF',
    },
    upgradeSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    upgradeSubtitleDark: {
        color: '#9CA3AF',
    },
    premiumNote: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FEF3C7',
    },
    premiumNoteText: {
        fontSize: 12,
        color: '#D97706',
        fontStyle: 'italic',
    },
    premiumNoteTextDark: {
        color: '#FCD34D',
    },
});

