import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Calendar, ChevronRight, Clock, Users } from 'lucide-react-native';
import Header from '../../../components/Header';
import { activityService } from '../../../services/activityService';
import { Activity } from '../../../types/activity';
import { useToast } from '../../../contexts/ToastContext';
import ActivityDetailsModal from '../../../components/ActivityDetailsModal';
import { useChatWebSocket } from '../../../hooks/useChatWebSocket';
import { useChatStore } from '../../../store/chatStore';

interface ActivityItem {
    id: string;
    name: string;
    purpose: string;
    status: 'ON_GOING' | 'ANALYZING' | 'VOTING' | 'COMPLETED';
    submitStartTime: string;
    submitEndTime: string;
    voteStartTime?: string;
    voteEndTime?: string;
    createdBy: string;
    creatorName: string;
    creatorAvatar: string;
    hasSubmitted?: boolean;
    createdAt: string;
}

export default function ConversationActivitiesScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const { error } = useToast();

    // WebSocket subscription
    const { subscribe, unsubscribe } = useChatWebSocket();
    const { conversationMessages } = useChatStore();

    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Modal states
    const [showActivityDetails, setShowActivityDetails] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

    const loadActivities = async (pageNum: number = 0, isRefresh: boolean = false) => {
        try {
            if (pageNum === 0) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await activityService.getConversationActivities(
                conversationId!,
                pageNum,
                20
            );

            if (response.status === 'success') {
                const newActivities = response.data;

                if (pageNum === 0) {
                    setActivities(newActivities);
                } else {
                    setActivities(prev => [...prev, ...newActivities]);
                }

                setHasMore(newActivities.length === 20);
                setPage(pageNum);
            } else {
                error('Lỗi', 'Không thể tải danh sách hoạt động');
            }
        } catch (err) {
            console.error('Error loading activities:', err);
            error('Lỗi', 'Không thể tải danh sách hoạt động');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        loadActivities(0, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadActivities(page + 1);
        }
    };

    const handleActivityPress = (activity: ActivityItem) => {
        setSelectedActivity(activity);
        setShowActivityDetails(true);
    };

    const handleCloseActivityDetails = () => {
        setShowActivityDetails(false);
        setSelectedActivity(null);
    };

    // Update activity status when WebSocket receives activity update
    const updateActivityStatus = (activityId: string, newStatus: string, hasSubmitted?: boolean) => {
        setActivities(prevActivities =>
            prevActivities.map(activity =>
                activity.id === activityId
                    ? { ...activity, status: newStatus as any, hasSubmitted: hasSubmitted ?? activity.hasSubmitted }
                    : activity
            )
        );
    };


    const getStatusText = (status: string) => {
        switch (status) {
            case 'ON_GOING':
                return 'Đang diễn ra';
            case 'ANALYZING':
                return 'Đang phân tích';
            case 'VOTING':
                return 'Đang bình chọn';
            case 'COMPLETED':
                return 'Hoàn thành';
            default:
                return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ON_GOING':
                return '#10B981'; // Green
            case 'ANALYZING':
                return '#3B82F6'; // Blue
            case 'VOTING':
                return '#F59E0B'; // Orange
            case 'COMPLETED':
                return '#6B7280'; // Gray
            default:
                return '#6B7280';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderActivityItem = ({ item }: { item: ActivityItem }) => (
        <TouchableOpacity
            style={[styles.activityItem, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
            onPress={() => handleActivityPress(item)}
        >
            <View style={styles.activityHeader}>
                <View style={styles.activityInfo}>
                    <Text style={[styles.activityName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {item.name}
                    </Text>
                    <Text style={[styles.activityPurpose, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {item.purpose}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>
                        {getStatusText(item.status)}
                    </Text>
                </View>
            </View>

            <View style={styles.activityDetails}>
                <View style={styles.detailRow}>
                    <Users size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text style={[styles.detailText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Tạo bởi: {item.creatorName}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Clock size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text style={[styles.detailText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
            </View>

            {/* Tap indicator */}
            <View style={styles.tapIndicator}>
                <Text style={[styles.tapIndicatorText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    Nhấn để xem chi tiết
                </Text>
                <ChevronRight size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </View>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Calendar size={64} color={isDark ? '#6B7280' : '#9CA3AF'} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Chưa có hoạt động nào
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Các hoạt động trong cuộc trò chuyện sẽ hiển thị ở đây
            </Text>
        </View>
    );

    useEffect(() => {
        if (conversationId) {
            loadActivities();
        }
    }, [conversationId]);

    // WebSocket subscription for real-time activity updates
    useEffect(() => {
        if (conversationId) {
            console.log('🔌 [Activities] Subscribing to WebSocket for conversation:', conversationId);
            subscribe(conversationId);

            return () => {
                console.log('🔌 [Activities] Unsubscribing from WebSocket');
                unsubscribe(conversationId);
            };
        }
    }, [conversationId, subscribe, unsubscribe]);

    // Listen for activity message updates from WebSocket
    useEffect(() => {
        if (conversationId && conversationMessages[conversationId]) {
            const messages = conversationMessages[conversationId];

            // Find activity messages and update activities list
            messages.forEach(message => {
                if (message.type === 'ACTIVITY' && message.content.activityId) {
                    const activityId = message.content.activityId;
                    const newStatus = message.content.status;
                    const hasSubmitted = (message.content as any).hasSubmitted;

                    // Update activity in list if it exists
                    setActivities(prevActivities =>
                        prevActivities.map(activity =>
                            activity.id === activityId
                                ? {
                                    ...activity,
                                    status: newStatus as any,
                                    hasSubmitted: hasSubmitted ?? activity.hasSubmitted,
                                    name: message.content.name || activity.name,
                                    purpose: message.content.purpose || activity.purpose
                                }
                                : activity
                        )
                    );
                }
            });
        }
    }, [conversationId, conversationMessages]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <Header
                    title="Lịch sử hoạt động"
                    showBackButton
                    onBackPress={() => router.back()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Đang tải...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            <Header
                title="Lịch sử hoạt động"
                showBackButton
                onBackPress={() => router.back()}
            />

            <FlatList
                data={activities}
                keyExtractor={(item) => item.id}
                renderItem={renderActivityItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={isDark ? '#FFFFFF' : '#000000'}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
            />

            {/* Activity Details Modal */}
            {selectedActivity && (
                <ActivityDetailsModal
                    visible={showActivityDetails}
                    activityId={selectedActivity.id}
                    onClose={handleCloseActivityDetails}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    listContainer: {
        padding: 16,
        flexGrow: 1,
    },
    activityItem: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    activityInfo: {
        flex: 1,
        marginRight: 12,
    },
    activityName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    activityPurpose: {
        fontSize: 14,
        lineHeight: 20,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    activityDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
    },
    footerLoader: {
        padding: 16,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    tapIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(156, 163, 175, 0.2)',
    },
    tapIndicatorText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
