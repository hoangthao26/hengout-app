import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    StyleSheet,
    useColorScheme
} from 'react-native';
import { X, Trophy, Users, Vote, MapPin, Star, Heart } from 'lucide-react-native';
import { activityService } from '../services/activityService';
import { useToast } from '../contexts/ToastContext';
import { ActivityResult, ActivitySuggestion } from '../types/activity';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface ActivityResultModalProps {
    visible: boolean;
    onClose: () => void;
    activityId: string;
    activityName?: string;
}


export default function ActivityResultModal({
    visible,
    onClose,
    activityId,
    activityName
}: ActivityResultModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { error } = useToast();

    const [resultData, setResultData] = useState<ActivityResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && activityId) {
            loadActivityResult();
        }
    }, [visible, activityId]);

    const loadActivityResult = async () => {
        setLoading(true);
        try {
            const response = await activityService.getActivityResult(activityId);
            setResultData(response.data);
        } catch (err: any) {
            console.error('Failed to load activity result:', err);
            error('Không thể tải kết quả hoạt động');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderLocationCard = (suggestion: ActivitySuggestion, isWinner: boolean = false) => {
        // Null safety check
        if (!suggestion || !suggestion.location) {
            return null;
        }

        const { location, acceptCount, rejectCount } = suggestion;

        return (
            <View
                key={suggestion.id}
                style={[
                    styles.locationCard,
                    { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
                    isWinner && styles.winnerCard
                ]}
            >
                {/* Location Image */}
                <View style={styles.imageContainer}>
                    {location.imageUrls && location.imageUrls.length > 0 ? (
                        <Image
                            source={{ uri: location.imageUrls[0] }}
                            style={styles.locationImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                            <MapPin size={32} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </View>
                    )}
                    {isWinner && (
                        <View style={styles.winnerBadge}>
                            <Trophy size={16} color="#F59E0B" />
                        </View>
                    )}
                </View>

                {/* Location Info */}
                <View style={styles.locationInfo}>
                    <Text
                        style={[
                            styles.locationName,
                            {
                                color: isWinner
                                    ? '#92400E' // Dark brown for winner card
                                    : (isDark ? '#FFFFFF' : '#000000')
                            }
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                    >
                        {location.name}
                    </Text>
                    <Text
                        style={[
                            styles.locationAddress,
                            {
                                color: isWinner
                                    ? '#A16207' // Darker brown for winner card address
                                    : (isDark ? '#9CA3AF' : '#6B7280')
                            }
                        ]}
                        numberOfLines={2}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.6}
                    >
                        {location.address}
                    </Text>


                    {/* Vote Counts */}
                    <View style={styles.voteCounts}>
                        <View style={styles.voteItem}>
                            <MaskedView
                                style={{ width: 16, height: 16 }}
                                maskElement={
                                    <Heart
                                        size={16}
                                        color="white"
                                        fill="white"
                                    />
                                }
                            >
                                <LinearGradient
                                    colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                    locations={[0, 0.31, 0.69, 1]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ flex: 1 }}
                                />
                            </MaskedView>
                            <Text style={[
                                styles.voteCount,
                                {
                                    color: isWinner
                                        ? '#92400E' // Dark brown for winner card
                                        : (isDark ? '#FFFFFF' : '#000000')
                                }
                            ]}>
                                {acceptCount}
                            </Text>
                        </View>
                        <View style={styles.voteItem}>
                            <X size={16} strokeWidth={3} color="#EF4444" />
                            <Text style={[
                                styles.voteCount,
                                {
                                    color: isWinner
                                        ? '#92400E' // Dark brown for winner card
                                        : (isDark ? '#FFFFFF' : '#000000')
                                }
                            ]}>
                                {rejectCount}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Kết quả hoạt động
                    </Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F48C06" />
                            <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Đang tải kết quả...
                            </Text>
                        </View>
                    ) : resultData ? (
                        <>
                            {/* Activity Info */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                <Text style={[styles.activityName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {resultData.activityName}
                                </Text>
                                {resultData.activityPurpose && (
                                    <Text style={[styles.activityPurpose, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                        {resultData.activityPurpose}
                                    </Text>
                                )}
                                <Text style={[styles.completedAt, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    Hoàn thành: {formatDateTime(resultData.completedAt)}
                                </Text>
                            </View>

                            {/* Statistics */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    📊 Thống kê
                                </Text>
                                <View style={styles.statsContainer}>
                                    <View style={styles.statItem}>
                                        <Users size={20} color="#3B82F6" />
                                        <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            {resultData.totalParticipants}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                            Người tham gia
                                        </Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Vote size={20} color="#8B5CF6" />
                                        <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            {resultData.totalVotes}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                            Tổng số vote
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Winner */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Địa điểm thắng cuộc
                                </Text>
                                {renderLocationCard(resultData.winnerSuggestion, true)}
                            </View>

                            {/* All Suggestions */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    📋 Tất cả đề xuất
                                </Text>
                                {resultData.suggestions.map((suggestion) => renderLocationCard(suggestion))}
                            </View>
                        </>
                    ) : (
                        <View style={styles.errorContainer}>
                            <Text style={[styles.errorText, { color: isDark ? '#EF4444' : '#DC2626' }]}>
                                Không thể tải kết quả hoạt động
                            </Text>
                            <Text style={[styles.fallbackName, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {activityName || 'Hoạt động không xác định'}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    section: {
        marginTop: 20,
        padding: 20,
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    activityName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    activityPurpose: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 8,
    },
    completedAt: {
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    locationCard: {
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    winnerCard: {
        borderColor: '#F59E0B',
        borderWidth: 2,
        backgroundColor: '#FFFBEB',
    },
    imageContainer: {
        position: 'relative',
        height: 150,
    },
    locationImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    winnerBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    locationInfo: {
        padding: 12,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    locationAddress: {
        fontSize: 14,
        marginBottom: 8,
    },
    voteCounts: {
        flexDirection: 'row',
        gap: 16,
    },
    voteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    voteCount: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    fallbackName: {
        fontSize: 16,
    },
});
