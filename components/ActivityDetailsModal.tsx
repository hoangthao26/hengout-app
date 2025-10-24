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
import { X, User, Calendar, Clock, CheckCircle, AlertCircle, Vote, Users, MessageSquare } from 'lucide-react-native';
import { activityService } from '../services/activityService';
import { Activity } from '../types/activity';
import { useToast } from '../contexts/ToastContext';
import SubmitPreferenceModal from './SubmitPreferenceModal';
import ActivityResultModal from './ActivityResultModal';
import { useChatStore } from '../store/chatStore';
import { useRouter } from 'expo-router';
import { useCountdown } from '../hooks/useCountdown';

interface ActivityDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    activityId: string;
    activityName?: string; // Fallback name from chat message
}

export default function ActivityDetailsModal({
    visible,
    onClose,
    activityId,
    activityName
}: ActivityDetailsModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { error } = useToast();
    const router = useRouter();

    const [activity, setActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSubmitPreferenceModal, setShowSubmitPreferenceModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);

    const { conversationMessages } = useChatStore();

    useEffect(() => {
        if (visible && activityId) {
            loadActivityDetails();
        }
    }, [visible, activityId]);

    // Listen for WebSocket updates to this activity
    useEffect(() => {
        if (!visible || !activityId) return;

        // Find the activity message in any conversation
        let foundActivityMessage = null;
        for (const messages of Object.values(conversationMessages)) {
            foundActivityMessage = messages.find(
                (msg: any) => msg.type === 'ACTIVITY' && msg.content.activityId === activityId
            );
            if (foundActivityMessage) break;
        }

        // Update activity status if found
        if (foundActivityMessage && foundActivityMessage.content.status) {
            setActivity(prev => {
                if (prev && prev.id === activityId) {
                    return {
                        ...prev,
                        status: foundActivityMessage.content.status as "ON_GOING" | "ANALYZING" | "VOTING" | "COMPLETED"
                    };
                }
                return prev;
            });
        }
    }, [conversationMessages, visible, activityId]);

    const loadActivityDetails = async () => {
        setLoading(true);
        try {
            const response = await activityService.getActivityById(activityId);
            setActivity((response as any).data);
        } catch (err: any) {
            console.error('Failed to load activity details:', err);
            error('Không thể tải chi tiết hoạt động');
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'ON_GOING':
                return {
                    text: 'Đang diễn ra',
                    color: '#10B981',
                    icon: <Clock size={16} color="#10B981" />
                };
            case 'ANALYZING':
                return {
                    text: 'Đang phân tích',
                    color: '#F59E0B',
                    icon: <AlertCircle size={16} color="#F59E0B" />
                };
            case 'VOTING':
                return {
                    text: 'Đang bình chọn',
                    color: '#8B5CF6',
                    icon: <Vote size={16} color="#8B5CF6" />
                };
            case 'COMPLETED':
                return {
                    text: 'Hoàn thành',
                    color: '#10B981',
                    icon: <CheckCircle size={16} color="#10B981" />
                };
            default:
                return {
                    text: status,
                    color: '#6B7280',
                    icon: <Clock size={16} color="#6B7280" />
                };
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

    // Countdown timers for different phases
    const submitCountdown = useCountdown({
        endTime: activity?.submitEndTime || '',
        onExpired: () => {
            // Submit time expired - no action needed
        }
    });

    const voteCountdown = useCountdown({
        endTime: activity?.voteEndTime || '',
        onExpired: () => {
            // Vote time expired - no action needed
        }
    });

    const handleVote = () => {
        // Close modal first
        onClose();
        // Navigate to voting screen with vote end time
        const voteEndTime = activity?.voteEndTime || '';
        router.push(`/settings/custom-swipe?activityId=${activityId}&voteEndTime=${encodeURIComponent(voteEndTime)}`);
    };

    const handleSubmitSuccess = () => {
        // Optimistic update: set hasSubmitted to true immediately
        setActivity(prev => {
            if (prev && prev.id === activityId) {
                return {
                    ...prev,
                    hasSubmitted: true
                };
            }
            return prev;
        });
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
                        Chi tiết hoạt động
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
                                Đang tải chi tiết...
                            </Text>
                        </View>
                    ) : activity ? (
                        <>
                            {/* Activity Info */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                <Text style={[styles.activityName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {activity.name}
                                </Text>

                                {activity.purpose && (
                                    <Text style={[styles.activityPurpose, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                        {activity.purpose}
                                    </Text>
                                )}

                                {/* Status */}
                                <View style={styles.statusContainer}>
                                    {getStatusInfo(activity.status).icon}
                                    <Text style={[styles.statusText, { color: getStatusInfo(activity.status).color }]}>
                                        {getStatusInfo(activity.status).text}
                                    </Text>
                                </View>
                            </View>

                            {/* Creator Info - Compact */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                <View style={styles.creatorInfo}>
                                    {activity.creatorAvatar ? (
                                        <Image
                                            source={{ uri: activity.creatorAvatar }}
                                            style={styles.creatorAvatar}
                                        />
                                    ) : (
                                        <View style={styles.defaultCreatorAvatar}>
                                            <User size={16} color="#9CA3AF" />
                                        </View>
                                    )}
                                    <View style={styles.creatorDetails}>
                                        <Text style={[styles.creatorName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            {activity.creatorName}
                                        </Text>
                                        <Text style={[styles.createdAt, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                            {formatDateTime(activity.createdAt)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Timeline - Only show relevant info */}
                            <View style={[styles.section, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                                {activity.status === 'ON_GOING' && (
                                    <View style={styles.timelineItem}>
                                        <Clock size={16} color="#F48C06" />
                                        <View style={styles.timelineContent}>
                                            <Text style={[styles.timelineLabel, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                                Thời gian submit
                                            </Text>
                                            <Text style={[styles.timelineValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Còn lại: {submitCountdown.timeRemaining}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {activity.status === 'VOTING' && (
                                    <View style={styles.timelineItem}>
                                        <Vote size={16} color="#8B5CF6" />
                                        <View style={styles.timelineContent}>
                                            <Text style={[styles.timelineLabel, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                                Thời gian bình chọn
                                            </Text>
                                            <Text style={[styles.timelineValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Còn lại: {voteCountdown.timeRemaining}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {activity.status === 'COMPLETED' && (
                                    <View style={styles.timelineItem}>
                                        <CheckCircle size={16} color="#10B981" />
                                        <View style={styles.timelineContent}>
                                            <Text style={[styles.timelineLabel, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                                Hoàn thành
                                            </Text>
                                            <Text style={[styles.timelineValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                {formatDateTime(activity.voteEndTime || activity.submitEndTime)}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                {activity.status === 'ON_GOING' && !activity.hasSubmitted && (
                                    <TouchableOpacity
                                        style={styles.submitPreferenceButton}
                                        onPress={() => setShowSubmitPreferenceModal(true)}
                                        activeOpacity={0.8}
                                    >
                                        <MessageSquare size={20} color="#FFFFFF" />
                                        <Text style={styles.submitPreferenceButtonText}>Gửi sở thích</Text>
                                    </TouchableOpacity>
                                )}

                                {activity.status === 'ON_GOING' && activity.hasSubmitted && (
                                    <View style={styles.submittedIndicator}>
                                        <CheckCircle size={20} color="#10B981" />
                                        <Text style={[styles.submittedText, { color: isDark ? '#10B981' : '#059669' }]}>
                                            Đã gửi sở thích
                                        </Text>
                                    </View>
                                )}

                                {activity.status === 'VOTING' && (
                                    <TouchableOpacity style={styles.voteButton} onPress={handleVote}>
                                        <Vote size={20} color="#FFFFFF" />
                                        <Text style={styles.voteButtonText}>Bình chọn</Text>
                                    </TouchableOpacity>
                                )}

                                {activity.status === 'COMPLETED' && (
                                    <TouchableOpacity
                                        style={styles.resultsButton}
                                        onPress={() => setShowResultModal(true)}
                                    >
                                        <Users size={20} color="#FFFFFF" />
                                        <Text style={styles.resultsButtonText}>Xem kết quả</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    ) : (
                        <View style={styles.errorContainer}>
                            <Text style={[styles.errorText, { color: isDark ? '#EF4444' : '#DC2626' }]}>
                                Không thể tải chi tiết hoạt động
                            </Text>
                            <Text style={[styles.fallbackName, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {activityName || 'Hoạt động không xác định'}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Submit Preference Modal */}
            <SubmitPreferenceModal
                visible={showSubmitPreferenceModal}
                onClose={() => setShowSubmitPreferenceModal(false)}
                activityId={activityId}
                activityName={activity?.name || activityName || 'Hoạt động'}
                onSubmitSuccess={handleSubmitSuccess}
            />

            {/* Activity Result Modal */}
            <ActivityResultModal
                visible={showResultModal}
                onClose={() => setShowResultModal(false)}
                activityId={activityId}
                activityName={activity?.name || activityName || 'Hoạt động'}
            />
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
    activityName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    activityPurpose: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 16,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    creatorDetails: {
        flex: 1,
    },
    creatorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    defaultCreatorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    creatorName: {
        fontSize: 14,
        fontWeight: '500',
    },
    createdAt: {
        fontSize: 12,
        marginTop: 2,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    timelineContent: {
        flex: 1,
    },
    timelineLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    timelineValue: {
        fontSize: 16,
        fontWeight: '500',
    },
    timeRemaining: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    actionButtons: {
        marginTop: 20,
        marginBottom: 40,
        gap: 12,
    },
    submitPreferenceButton: {
        backgroundColor: '#F48C06',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    submitPreferenceButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    voteButton: {
        backgroundColor: '#8B5CF6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    voteButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    resultsButton: {
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    resultsButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    submittedIndicator: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    submittedText: {
        fontSize: 16,
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
