import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SearchUser } from '../types/social';
import FriendActionButton from './FriendActionButton';
import SimpleAvatar from './SimpleAvatar';

interface SearchUserItemProps {
    user: SearchUser;
    onAddFriend?: (userId: string) => void;
    onRemoveFriend?: (userId: string) => void;
    onCancelRequest?: (userId: string) => void;
    onAcceptRequest?: (userId: string) => void;
    onRejectRequest?: (userId: string) => void;
    onBlock?: (userId: string) => void;
    loading?: boolean;
    disabled?: boolean;
}

const SearchUserItem: React.FC<SearchUserItemProps> = ({
    user,
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

    // Log user data for debugging
    console.log('🎨 SearchUserItem - Rendering user:', {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        relationshipStatus: user.relationshipStatus,
        friendRequestId: user.friendRequestId,
        loading,
        disabled
    });

    return (
        <View style={[styles.friendItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
            <View style={styles.friendInfo}>
                <SimpleAvatar
                    size={55}
                    avatarUrl={user.avatarUrl}
                />
                <View style={styles.friendDetails}>
                    <Text style={[styles.friendName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {user.name}
                    </Text>
                </View>
            </View>

            <FriendActionButton
                relationshipStatus={user.relationshipStatus}
                friendRequestId={user.friendRequestId}
                onAddFriend={() => onAddFriend?.(user.id)}
                onRemoveFriend={() => onRemoveFriend?.(user.id)}
                onCancelRequest={() => onCancelRequest?.(user.id)}
                onAcceptRequest={() => onAcceptRequest?.(user.id)}
                onRejectRequest={() => onRejectRequest?.(user.id)}
                onBlock={() => onBlock?.(user.id)}
                loading={loading}
                disabled={disabled}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendDetails: {
        marginLeft: 12,
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    friendEmail: {
        fontSize: 14,
    },
});

export default SearchUserItem;
