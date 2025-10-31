import { useLocalSearchParams, router } from 'expo-router';
import NavigationService from '../../../services/navigationService';
import {
    Bell,
    Calendar,
    ChevronRight,
    Sparkles,
    Link,
    LogOut,
    MoreHorizontal,
    Search,
    Shield,
    Trash2,
    Type,
    UserPlus,
    Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ChatErrorBoundary } from '../../../components/errorBoundaries';
import {
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Alert
} from 'react-native';
import AddMemberModal from '../../../components/AddMemberModal';
import CreateGroupModal from '../../../components/CreateGroupModal';
import EditGroupModal from '../../../components/EditGroupModal';
import BoostGroupModal from '../../../components/BoostGroupModal';
import Header from '../../../components/Header';
import { chatService } from '../../../services/chatService';
import { useToast } from '../../../contexts/ToastContext';
import { useChatStore } from '../../../store/chatStore';
import { useChatSync } from '../../../hooks/useChatSync';
import { useChat } from '../../../hooks/useChat';
import subscriptionService from '../../../services/subscriptionService';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import useLimits from '../../../hooks/useLimits';
import { ChatConversation } from '../../../types/chat';

export default function ConversationDetailsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const { error: showError, success: showSuccess } = useToast();
    const subscriptionStore = useSubscriptionStore();

    const {
        conversations,
        currentConversation,
        setCurrentConversation
    } = useChatStore();

    const { fetchGroupStatus, groupStatus } = useSubscriptionStore();

    const { loadConversations } = useChat();

    // SQLite Chat Sync
    const {
        isInitialized: chatSyncInitialized,
        getMembers: getMembersFromDB,
        syncMembers,
        syncConversations: syncConversationsToDB,
        deleteConversation: deleteConversationFromDB
    } = useChatSync();

    const [loading, setLoading] = useState(true);

    // Get conversation from store or local state
    const conversation = conversations.find(c => c.id === conversationId) || currentConversation;
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showEditGroupModal, setShowEditGroupModal] = useState(false);
    const [showBoostGroupModal, setShowBoostGroupModal] = useState(false);

    useEffect(() => {
        loadConversation();
    }, [conversationId]);

    const loadConversation = async () => {
        if (!conversationId) return;

        try {
            setLoading(true);

            // Check if conversation still exists in store (might have been removed)
            const conversationExists = conversations.find(c => c.id === conversationId);
            if (!conversationExists && !currentConversation) {
                // Conversation was removed (e.g., after disband), don't try to load
                console.log(`[Details] Conversation ${conversationId} no longer exists, skipping load`);
                return;
            }

            // Load conversation data
            let conversation = conversations.find(c => c.id === conversationId) || currentConversation;

            if (chatSyncInitialized) {
                // Conversation data is already available from store
                // Just sync members in background for GROUP conversations only
                if (conversation?.type === 'GROUP') {
                    try {
                        await syncMembers(conversationId);
                    } catch (syncError) {
                        console.error('Background member sync failed:', syncError);
                    }
                }
            } else {
                // Fallback to direct API call if SQLite not ready
                const response = await chatService.getConversation(conversationId);
                if (response.status === 'success') {
                    setCurrentConversation(response.data);
                    conversation = response.data; // Update conversation with fetched data
                }
            }

            // Fetch group status for GROUP conversations (independent of SQLite state)
            // Only fetch if not already in store (cache check)
            // Check conversation type again after potentially loading it
            const finalConversation = conversation || conversations.find(c => c.id === conversationId) || currentConversation;
            if (finalConversation?.type === 'GROUP') {
                // Check if we already have groupStatus in store for this conversation
                const existingStatus = groupStatus[conversationId];
                if (!existingStatus) {
                    // Only fetch if not in store yet (cache optimization)
                    try {
                        await fetchGroupStatus(conversationId);
                    } catch (statusError) {
                        console.error('Failed to fetch group status:', statusError);
                    }
                }
            }
        } catch (error: any) {
            // If 403 or 404, conversation was likely deleted/disbanded
            if (error?.response?.status === 403 || error?.response?.status === 404) {
                console.log(`[Details] Conversation ${conversationId} not accessible (403/404), likely disbanded`);
                // Navigate back if we're on a deleted conversation
                router.replace('/(tabs)/chat');
                return;
            }
            console.error('Failed to load conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleChangeNameOrPhoto = () => {
        setShowEditGroupModal(true);
    };

    const handleCloseEditGroupModal = () => {
        setShowEditGroupModal(false);
    };

    const handleEditGroupSuccess = () => {
        loadConversation(); // Reload conversation data after editing
        setShowEditGroupModal(false);
    };

    const handleAddMember = () => {
        setShowAddMemberModal(true);
    };

    const handleCloseAddMemberModal = () => {
        setShowAddMemberModal(false);
    };

    const handleAddMemberSuccess = () => {
        // Reload conversation data after adding members (only for GROUP conversations)
        loadConversation();
        setShowAddMemberModal(false);
    };

    const handleViewMembers = () => {
        NavigationService.goToChatMembers(conversationId);
    };

    const handleViewMedia = () => {
        // TODO: Implement view media
        console.log('View media');
    };

    const handlePinnedMessages = () => {
        // TODO: Implement pinned messages
        console.log('Pinned messages');
    };

    const handleCreateGroup = () => {
        setShowCreateGroupModal(true);
    };

    const handleViewActivities = () => {
        NavigationService.goToConversationActivities(conversationId);
    };

    const handleBoostGroup = () => {
        if (!conversation || conversation.type !== 'GROUP') return;
        setShowBoostGroupModal(true);
    };

    const handleCloseBoostGroupModal = () => {
        setShowBoostGroupModal(false);
    };

    const handleBoostSuccess = async () => {
        // Reload conversation data after boost
        await loadConversation();
        setShowBoostGroupModal(false);
    };

    const handleCloseCreateGroupModal = () => {
        setShowCreateGroupModal(false);
    };

    const handleCreateGroupSuccess = () => {
        setShowCreateGroupModal(false);
        // Có thể navigate đến group chat mới tạo hoặc reload data
        console.log('Group created successfully');
    };

    const handleSearch = () => {
        // TODO: Implement search
        console.log('Search');
    };

    const handleMute = () => {
        // TODO: Implement mute
        console.log('Mute');
    };

    const handleOptions = () => {
        // TODO: Implement options
        console.log('Options');
    };

    const handleTheme = () => {
        // TODO: Implement theme
        console.log('Theme');
    };

    const handleInviteLink = () => {
        // TODO: Implement invite link
        console.log('Invite link');
    };

    const handleNickname = () => {
        // TODO: Implement nickname
        console.log('Nickname');
    };

    const handlePrivacy = () => {
        // TODO: Implement privacy
        console.log('Privacy');
    };

    const handleLeaveGroup = () => {
        if (!conversation) return;
        if (conversation.userRole === 'OWNER') {
            showError('Bạn là chủ phòng');
            return;
        }
        Alert.alert(
            'Rời khỏi nhóm',
            `Bạn có chắc muốn rời nhóm "${conversation.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Rời nhóm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await chatService.leaveConversation(conversation.id);
                            if (res.status === 'success') {
                                showSuccess(res.message || 'Đã rời nhóm');
                                // Clear current conversation first to prevent loading attempts
                                setCurrentConversation(null);
                                // Remove from local store immediately for responsive UI
                                useChatStore.getState().removeConversation(conversation.id);
                                // Sync with backend to update conversation list in store
                                await loadConversations();
                                // WebSocket: Unsubscribe from this conversation
                                try {
                                    const { chatWebSocketManager } = await import('../../../services/chatWebSocketManager');
                                    chatWebSocketManager.unsubscribeFromConversation(conversation.id);
                                    console.log('[Details] Unsubscribed WebSocket from disbanded conversation');
                                } catch (wsErr) {
                                    console.error('[Details] Failed to unsubscribe WebSocket:', wsErr);
                                }

                                // Delete from database immediately
                                if (chatSyncInitialized) {
                                    try {
                                        await deleteConversationFromDB(conversation.id);
                                        // Also sync to ensure consistency
                                        await syncConversationsToDB();
                                    } catch (dbError) {
                                        console.error('Failed to delete conversation from database:', dbError);
                                        // Don't block user, just log error
                                    }
                                }
                                // Navigate back to chat list using replace to remove current screen from stack
                                router.replace('/(tabs)/chat');
                            } else {
                                showError(res.message || 'Không thể rời nhóm');
                            }
                        } catch (e: any) {
                            showError(e?.response?.data?.message || e?.message || 'Không thể rời nhóm');
                        }
                    }
                }
            ]
        );
    };

    const handleDisbandGroup = () => {
        if (!conversation) return;
        if (conversation.userRole !== 'OWNER') return;
        Alert.alert(
            'Giải tán nhóm',
            `Giải tán nhóm "${conversation.name}"? Tất cả dữ liệu nhóm sẽ bị xóa.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Giải tán',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await chatService.disbandConversation(conversation.id);
                            if (res.status === 'success') {
                                showSuccess(res.message || 'Đã giải tán nhóm');
                                // Clear current conversation first to prevent loading attempts
                                setCurrentConversation(null);
                                // Remove from local store immediately for responsive UI
                                useChatStore.getState().removeConversation(conversation.id);
                                // Sync with backend to update conversation list in store
                                await loadConversations();
                                // WebSocket: Unsubscribe from this conversation
                                try {
                                    const { chatWebSocketManager } = await import('../../../services/chatWebSocketManager');
                                    chatWebSocketManager.unsubscribeFromConversation(conversation.id);
                                    console.log('[Details] Unsubscribed WebSocket from left conversation');
                                } catch (wsErr) {
                                    console.error('[Details] Failed to unsubscribe WebSocket:', wsErr);
                                }

                                // Delete from database immediately
                                if (chatSyncInitialized) {
                                    try {
                                        await deleteConversationFromDB(conversation.id);
                                        // Also sync to ensure consistency
                                        await syncConversationsToDB();
                                    } catch (dbError) {
                                        console.error('Failed to delete conversation from database:', dbError);
                                        // Don't block user, just log error
                                    }
                                }
                                // Navigate back to chat list using replace to remove current screen from stack
                                router.replace('/(tabs)/chat');
                            } else {
                                showError(res.message || 'Không thể giải tán nhóm');
                            }
                        } catch (e: any) {
                            showError(e?.response?.data?.message || e?.message || 'Không thể giải tán nhóm');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />
                <Header
                    title="Đang tải..."
                    showBackButton={true}
                    onBackPress={handleBack}
                />
            </View>
        );
    }

    if (!conversation) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />
                <Header
                    title="Không tìm thấy cuộc trò chuyện"
                    showBackButton={true}
                    onBackPress={handleBack}
                />
            </View>
        );
    }

    const isGroup = conversation.type === 'GROUP';

    return (
        <ChatErrorBoundary>
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />

                {/* Header */}
                <Header
                    title=""
                    showBackButton={true}
                    onBackPress={handleBack}
                />

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {conversation.avatarUrl ? (
                                <Image
                                    source={{ uri: conversation.avatarUrl }}
                                    style={styles.avatar}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={[styles.defaultAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                    <Users size={60} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </View>
                            )}
                        </View>

                        {/* Name */}
                        <Text style={[styles.conversationName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            {conversation.name}
                        </Text>

                        {/* Change name or photo (only for groups) */}
                        {isGroup && (
                            <TouchableOpacity onPress={handleChangeNameOrPhoto}>
                                <Text style={styles.changeNameText}>Đổi tên hoặc ảnh</Text>
                            </TouchableOpacity>
                        )}

                        {/* Action buttons (only for groups) */}
                        {isGroup && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.actionButton} onPress={handleAddMember}>
                                    <UserPlus size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                    <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                        Thêm
                                    </Text>
                                </TouchableOpacity>

                                {/* Tạm thời ẩn các action buttons này */}
                                {false && (
                                    <>
                                        <TouchableOpacity style={styles.actionButton} onPress={handleSearch}>
                                            <Search size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                            <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Tìm kiếm
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionButton} onPress={handleMute}>
                                            <Bell size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                            <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Tắt
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.actionButton} onPress={handleOptions}>
                                            <MoreHorizontal size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                            <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Lựa chọn
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Options List */}
                    <View style={styles.optionsList}>
                        {isGroup && (
                            <TouchableOpacity style={styles.optionItem} onPress={handleViewMembers}>
                                <View style={styles.optionLeft}>
                                    <Users size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            Mọi người
                                        </Text>
                                        <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                            Thành viên nhóm
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        )}

                        {/* Lịch sử hoạt động */}
                        <TouchableOpacity style={styles.optionItem} onPress={handleViewActivities}>
                            <View style={styles.optionLeft}>
                                <Calendar size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                        Lịch sử hoạt động
                                    </Text>
                                    <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        Xem tất cả hoạt động trong cuộc trò chuyện
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </TouchableOpacity>

                        {!isGroup && (
                            <TouchableOpacity style={styles.optionItem} onPress={handleCreateGroup}>
                                <View style={styles.optionLeft}>
                                    <UserPlus size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            Tạo nhóm chat mới
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        )}

                        {isGroup && (
                            <TouchableOpacity style={styles.optionItem} onPress={handleBoostGroup}>
                                <View style={styles.optionLeft}>
                                    <Sparkles size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Boost nhóm</Text>
                                        <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Tăng giới hạn nhóm</Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        )}

                        {/* Tạm thời ẩn các options này */}
                        {false && (
                            <>
                                <TouchableOpacity style={styles.optionItem} onPress={handleTheme}>
                                    <View style={styles.optionLeft}>
                                        <View style={styles.themeIcon}>
                                            <View style={styles.themeGradient} />
                                        </View>
                                        <View style={styles.optionTextContainer}>
                                            <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Chủ đề
                                            </Text>
                                            <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                                Mặc định
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.optionItem} onPress={handleInviteLink}>
                                    <View style={styles.optionLeft}>
                                        <Link size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                        <View style={styles.optionTextContainer}>
                                            <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Liên kết mời
                                            </Text>
                                            <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                                Đang tắt
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.optionItem} onPress={handleNickname}>
                                    <View style={styles.optionLeft}>
                                        <Type size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                        <View style={styles.optionTextContainer}>
                                            <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Biệt danh
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.optionItem} onPress={handlePrivacy}>
                                    <View style={styles.optionLeft}>
                                        <Shield size={28} color={isDark ? '#FFFFFF' : '#000000'} />
                                        <View style={styles.optionTextContainer}>
                                            <Text style={[styles.optionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                                Quyền riêng tư và an toàn
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Rời khỏi nhóm / Giải tán nhóm - Đặt ở cuối danh sách */}
                        {isGroup && (
                            <TouchableOpacity style={styles.optionItem} onPress={handleLeaveGroup}>
                                <View style={styles.optionLeft}>
                                    <LogOut size={28} color="#EF4444" />
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionText, { color: '#EF4444' }]}>
                                            Rời khỏi nhóm
                                        </Text>
                                        <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                            Bạn sẽ không nhận tin nhắn từ nhóm này
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        )}

                        {isGroup && conversation.userRole === 'OWNER' && (
                            <TouchableOpacity style={styles.optionItem} onPress={handleDisbandGroup}>
                                <View style={styles.optionLeft}>
                                    <Trash2 size={28} color="#B91C1C" />
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionText, { color: '#B91C1C', fontWeight: '700' }]}>
                                            Giải tán nhóm
                                        </Text>
                                        <Text style={[styles.optionSubtext, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                            Chỉ chủ phòng có thể thực hiện
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                {/* Add Member Modal */}
                {conversation && (
                    <AddMemberModal
                        isVisible={showAddMemberModal}
                        onClose={handleCloseAddMemberModal}
                        onSuccess={handleAddMemberSuccess}
                        conversationId={conversation.id}
                        conversationName={conversation.name}
                    />
                )}

                {/* Create Group Modal */}
                <CreateGroupModal
                    isVisible={showCreateGroupModal}
                    onClose={handleCloseCreateGroupModal}
                    onSuccess={handleCreateGroupSuccess}
                />

                {/* Edit Group Modal */}
                {conversation && (
                    <EditGroupModal
                        isVisible={showEditGroupModal}
                        onClose={handleCloseEditGroupModal}
                        onSuccess={handleEditGroupSuccess}
                        conversationId={conversation.id}
                        currentName={conversation.name}
                        currentAvatar={conversation.avatarUrl}
                    />
                )}

                {/* Boost Group Modal */}
                {conversation && (
                    <BoostGroupModal
                        isVisible={showBoostGroupModal}
                        onClose={handleCloseBoostGroupModal}
                        onSuccess={handleBoostSuccess}
                        conversationId={conversation.id}
                        conversationName={conversation.name}
                    />
                )}
            </View>
        </ChatErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    defaultAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    conversationName: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    changeNameText: {
        fontSize: 16,
        color: '#3B82F6',
        marginBottom: 24,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,

    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    optionsList: {
        paddingHorizontal: 16,

    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    optionSubtext: {
        fontSize: 14,
        marginTop: 2,
    },
    themeIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    themeGradient: {
        width: '100%',
        height: '100%',
        backgroundColor: '#8B5CF6',
    },
});
