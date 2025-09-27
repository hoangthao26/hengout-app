import React from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import {
    Ban,
    CheckCircle,
    Clock,
    MinusCircle,
    UserPlus,
    UserMinus,
    XCircle
} from 'lucide-react-native';
import ContextMenu, { MenuAction } from '../components/ContextMenu';

export type RelationshipStatus = "REQUEST_PENDING" | "FRIEND" | "NONE" | "REQUEST_SENT";

interface FriendActionButtonProps {
    relationshipStatus: RelationshipStatus;
    friendRequestId?: string | null;
    onAddFriend?: () => void;
    onRemoveFriend?: () => void;
    onCancelRequest?: () => void;
    onAcceptRequest?: () => void;
    onRejectRequest?: () => void;
    onBlock?: () => void;
    loading?: boolean;
    disabled?: boolean;
}

const FriendActionButton: React.FC<FriendActionButtonProps> = ({
    relationshipStatus,
    friendRequestId,
    onAddFriend,
    onRemoveFriend,
    onCancelRequest,
    onAcceptRequest,
    onRejectRequest,
    onBlock,
    loading = false,
    disabled = false,
}) => {
    const isDark = useColorScheme() === 'dark';

    const getMenuActions = (): MenuAction[] => {
        const actions: MenuAction[] = [];

        switch (relationshipStatus) {
            case "FRIEND":
                // Đã là bạn bè - chỉ có thể xóa bạn
                actions.push({
                    id: 'remove',
                    title: 'Xóa bạn',
                    icon: UserMinus,
                    onPress: onRemoveFriend || (() => { }),
                    destructive: true,
                });
                break;
            case "REQUEST_PENDING":
                // Người khác đã gửi lời mời cho mình - có thể accept/reject
                actions.push({
                    id: 'accept',
                    title: 'Chấp nhận',
                    icon: CheckCircle,
                    onPress: onAcceptRequest || (() => { }),
                });
                actions.push({
                    id: 'reject',
                    title: 'Từ chối',
                    icon: XCircle,
                    onPress: onRejectRequest || (() => { }),
                    destructive: true,
                });
                break;
            case "REQUEST_SENT":
                // Mình đã gửi lời mời
                console.log('🔍 REQUEST_SENT - friendRequestId:', friendRequestId);
                if (friendRequestId) {
                    // Có friendRequestId → có thể hủy
                    console.log('✅ Showing cancel button');
                    actions.push({
                        id: 'cancel',
                        title: 'Hủy lời mời',
                        icon: XCircle,
                        onPress: onCancelRequest || (() => { }),
                    });
                } else {
                    // Chưa có friendRequestId → đang gửi
                    console.log('⏳ Showing sending state');
                    actions.push({
                        id: 'sending',
                        title: 'Đang gửi lời mời...',
                        icon: Clock,
                        onPress: () => { }, // No action
                        disabled: true,
                    });
                }
                break;
            case "NONE":
            default:
                // Chưa có relationship - có thể thêm bạn
                actions.push({
                    id: 'add',
                    title: 'Thêm bạn',
                    icon: UserPlus,
                    onPress: onAddFriend || (() => { }),
                });
                break;
        }

        // Always add block action if onBlock is provided
        if (onBlock) {
            actions.push({
                id: 'block',
                title: 'Chặn',
                icon: Ban,
                onPress: onBlock,
                destructive: true,
            });
        }

        return actions;
    };

    if (loading) {
        return (
            <ActivityIndicator
                size="small"
                color={isDark ? '#9CA3AF' : '#6B7280'}
                style={styles.loadingIndicator}
            />
        );
    }

    const menuActions = getMenuActions();

    // Nếu không có actions nào thì không hiển thị menu
    if (menuActions.length === 0) {
        return null;
    }

    return (
        <ContextMenu
            actions={menuActions}
            disabled={disabled}
        />
    );
};

const styles = StyleSheet.create({
    loadingIndicator: {
        marginLeft: 8,
    },
});

export default FriendActionButton;
