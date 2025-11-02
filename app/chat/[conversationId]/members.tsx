import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crown, MoreHorizontal, Plus, Shield, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import AddMemberModal from '../../../components/AddMemberModal';
import Header from '../../../components/Header';
import { ChatErrorBoundary } from '../../../components/errorBoundaries';
import { useToast } from '../../../contexts/ToastContext';
import { chatService } from '../../../services/chatService';
import { ChatMember } from '../../../types/chat';
import { useSubscriptionStore } from '../../../store/subscriptionStore';

// Member Item Component with Animation
const MemberItem: React.FC<{
    item: ChatMember;
    canManage: boolean;
    isDark: boolean;
    onPress: (member: ChatMember) => void;
    getRoleIcon: (role: string) => React.ReactNode;
    getRoleText: (role: string) => string;
}> = ({ item, canManage, isDark, onPress, getRoleIcon, getRoleText }) => {
    const scaleValue = React.useRef(new Animated.Value(1)).current;
    const opacityValue = React.useRef(new Animated.Value(1)).current;

    // Reset animation values on mount
    React.useEffect(() => {
        scaleValue.setValue(1);
        opacityValue.setValue(1);
    }, [scaleValue, opacityValue]);

    const handlePressIn = () => {
        if (canManage) {
            Animated.parallel([
                Animated.timing(scaleValue, {
                    toValue: 0.95,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 0.7,
                    duration: 100,
                    useNativeDriver: true,
                })
            ]).start();
        }
    };

    const handlePressOut = () => {
        if (canManage) {
            Animated.parallel([
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                })
            ]).start();
        }
    };

    const handleMenuPress = () => {
        if (canManage) {
            // Bounce effect before showing ActionSheet
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 0.9,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 80,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                onPress(item);
                // Ensure animation values are reset after ActionSheet
                setTimeout(() => {
                    scaleValue.setValue(1);
                    opacityValue.setValue(1);
                }, 100);
            });
        }
    };

    return (
        <Animated.View style={{
            transform: [{ scale: scaleValue }],
            opacity: opacityValue
        }}>
            <View style={[styles.memberItem, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                <View style={styles.memberInfo}>
                    {item.avatarUrl ? (
                        <Image
                            source={{ uri: item.avatarUrl }}
                            style={styles.memberAvatar}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={[styles.defaultAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <User size={32} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </View>
                    )}

                    <View style={styles.memberDetails}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.memberName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {item.userName}
                            </Text>
                            {item.isCurrentUser && (
                                <Text style={[styles.youText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                    (Bạn)
                                </Text>
                            )}
                        </View>

                        <View style={styles.roleRow}>
                            {getRoleIcon(item.role)}
                            <Text style={[styles.roleText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {getRoleText(item.role)}
                            </Text>
                        </View>
                    </View>
                </View>

                {canManage && (
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={handleMenuPress}
                        activeOpacity={1}
                    >
                        <MoreHorizontal size={28} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const GroupMembersScreen: React.FC = () => {
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    const [members, setMembers] = useState<ChatMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [conversationName, setConversationName] = useState('');

    // Get maxMember from store (fetched in details screen)
    const groupStatus = useSubscriptionStore(state => state.groupStatus[conversationId || '']);

    // Load group members and conversation info
    const loadMembers = useCallback(async () => {
        if (!conversationId) return;

        try {
            setLoading(true);
            const [membersResponse, conversationResponse] = await Promise.all([
                chatService.getGroupMembers(conversationId),
                chatService.getConversation(conversationId)
            ]);

            setMembers(membersResponse.data);
            setConversationName(conversationResponse.data.name);

            // Set current user role from conversation response
            setCurrentUserRole(conversationResponse.data.userRole);
        } catch (err: any) {
            console.error('[Members] Failed to load group members:', err);
            showError('Lỗi khi tải danh sách thành viên');
        } finally {
            setLoading(false);
        }
    }, [conversationId, showError]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    // Handle remove member
    const handleRemoveMember = useCallback((member: ChatMember) => {
        if (member.isCurrentUser) {
            showError('Bạn không thể xóa chính mình');
            return;
        }

        Alert.alert(
            'Xóa thành viên',
            `Bạn có chắc chắn muốn xóa ${member.userName} khỏi nhóm?`,
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await chatService.removeMember(conversationId!, member.userId);
                            showSuccess(`Đã xóa ${member.userName} khỏi nhóm`);
                            loadMembers(); // Reload members
                        } catch (err: any) {
                            console.error('[Members] Failed to remove member:', err);
                            showError('Lỗi khi xóa thành viên');
                        }
                    },
                },
            ]
        );
    }, [conversationId, showSuccess, showError, loadMembers]);

    // Check if user can manage members
    const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

    // Handle press on member (for ADMIN/OWNER)
    const handleMemberPress = useCallback((member: ChatMember) => {
        if (!canManageMembers) return;
        if (member.isCurrentUser) return;
        if (member.role === 'OWNER') return;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Hủy', 'Xóa thành viên'],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                    title: `Quản lý ${member.userName}`,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleRemoveMember(member);
                    }
                }
            );
        } else {
            // For Android, show Alert
            Alert.alert(
                `Quản lý ${member.userName}`,
                'Chọn hành động',
                [
                    { text: 'Hủy', style: 'cancel' },
                    {
                        text: 'Xóa thành viên',
                        style: 'destructive',
                        onPress: () => handleRemoveMember(member)
                    },
                ]
            );
        }
    }, [canManageMembers, handleRemoveMember]);

    // Get role icon
    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'OWNER':
                return <Crown size={16} color="#F59E0B" />;
            case 'ADMIN':
                return <Shield size={16} color="#3B82F6" />;
            default:
                return <User size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />;
        }
    };

    // Get role text
    const getRoleText = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'Chủ nhóm';
            case 'ADMIN':
                return 'Quản trị viên';
            default:
                return 'Thành viên';
        }
    };

    // Handle add member modal
    const handleAddMember = () => {
        setShowAddMemberModal(true);
    };

    const handleCloseAddMemberModal = () => {
        setShowAddMemberModal(false);
    };

    const handleAddMemberSuccess = () => {
        loadMembers(); // Reload members after adding
        setShowAddMemberModal(false);
    };

    // Render member item
    const renderMemberItem = ({ item }: { item: ChatMember }) => {
        const canManage = canManageMembers && !item.isCurrentUser && item.role !== 'OWNER';

        return (
            <MemberItem
                item={item}
                canManage={canManage}
                isDark={isDark}
                onPress={handleMemberPress}
                getRoleIcon={getRoleIcon}
                getRoleText={getRoleText}
            />
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />
                <Header
                    title="Đang tải..."
                    showBackButton={true}
                    onBackPress={() => router.back()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F48C06" />
                    <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Đang tải danh sách thành viên...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <ChatErrorBoundary>
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />

                {/* Header */}
                <Header
                    title={(() => {
                        const maxMember = groupStatus?.maxMember;
                        if (maxMember !== undefined && maxMember >= 0) {
                            return `Thành viên (${members.length}/${maxMember})`;
                        } else if (maxMember !== undefined && maxMember < 0) {
                            return `Thành viên (${members.length}/∞)`;
                        }
                        return `Thành viên (${members.length} người)`;
                    })()}
                    showBackButton={true}
                    onBackPress={() => router.back()}
                    rightIcon={{
                        icon: Plus,
                        size: 28,
                        onPress: handleAddMember
                    }}
                />

                {/* Members List */}
                <FlatList
                    data={members}
                    keyExtractor={(item) => item.userId}
                    renderItem={renderMemberItem}
                    style={styles.membersList}
                    contentContainerStyle={styles.membersContent}
                    showsVerticalScrollIndicator={false}
                />

                {/* Add Member Modal */}
                <AddMemberModal
                    isVisible={showAddMemberModal}
                    onClose={handleCloseAddMemberModal}
                    onSuccess={handleAddMemberSuccess}
                    conversationId={conversationId!}
                    conversationName={conversationName}
                />
            </View>
        </ChatErrorBoundary>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    membersList: {
        flex: 1,
    },
    membersContent: {
        paddingBottom: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    defaultAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    memberDetails: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    memberName: {
        fontSize: 18,
        fontWeight: '600',
    },
    youText: {
        fontSize: 14,
        marginLeft: 8,
        fontStyle: 'italic',
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleText: {
        fontSize: 14,
        marginLeft: 6,
    },
    menuButton: {
        padding: 8,
        marginRight: -8,
    },
});

export default GroupMembersScreen;
