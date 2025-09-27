import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Bell,
    ChevronRight,
    Link,
    MoreHorizontal,
    Search,
    Shield,
    Type,
    UserPlus,
    Users
} from 'lucide-react-native';
import NavigationService from '../../../services/navigationService';
import React, { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import AddMemberModal from '../../../components/AddMemberModal';
import CreateGroupModal from '../../../components/CreateGroupModal';
import EditGroupModal from '../../../components/EditGroupModal';
import Header from '../../../components/Header';
import { chatService } from '../../../services/chatService';
import { useChatStore } from '../../../store/chatStore';
import { ChatConversation } from '../../../types/chat';

export default function ConversationDetailsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

    const {
        conversations,
        currentConversation,
        setCurrentConversation
    } = useChatStore();

    const [loading, setLoading] = useState(true);

    // Get conversation from store or local state
    const conversation = conversations.find(c => c.id === conversationId) || currentConversation;
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showEditGroupModal, setShowEditGroupModal] = useState(false);

    useEffect(() => {
        loadConversation();
    }, [conversationId]);

    const loadConversation = async () => {
        if (!conversationId) return;

        try {
            setLoading(true);
            const response = await chatService.getConversation(conversationId);
            if (response.status === 'success') {
                setCurrentConversation(response.data);
            }
        } catch (error) {
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
        // Reload conversation data after adding members
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
        </View>
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
