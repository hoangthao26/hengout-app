import { useCallback, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { socialService } from '../services/socialService';
import { useFriendStore } from '../store/friendStore';
import { SearchUser } from '../types/social';
import { useRetry } from './useRetry';

export const useFriendActions = (
    searchResults: SearchUser[],
    setSearchResults: React.Dispatch<React.SetStateAction<SearchUser[]>>
) => {
    const [processingUser, setProcessingUser] = useState<string | null>(null);
    const { success: showSuccess, error: showError } = useToast();
    const { executeWithRetry, isRetrying } = useRetry({
        strategy: 'network'
    });

    // Get global friend actions
    const {
        acceptRequest: globalAcceptRequest,
        rejectRequest: globalRejectRequest,
        removeFriend: globalRemoveFriend,
        blockFriend: globalBlockFriend,
        cancelSentRequest: globalCancelSentRequest,
        sendFriendRequest: globalSendFriendRequest,
        updateSearchUser: globalUpdateSearchUser,
        removeFromSearch: globalRemoveFromSearch,
    } = useFriendStore();

    // Use ref to capture current searchResults
    const searchResultsRef = useRef<SearchUser[]>(searchResults);
    searchResultsRef.current = searchResults;

    const handleSendFriendRequest = useCallback(async (userId: string) => {
        // Store original state for rollback
        let originalUser: SearchUser | undefined;

        try {
            setProcessingUser(userId);

            // 1. Get original user state for rollback
            originalUser = searchResultsRef.current.find(u => u.id === userId);

            // 2. Send friend request to server with retry logic
            console.log('🔗 [Friend Request] Send URL:', `POST /api/social/friend-requests`);
            console.log('📝 [Friend Request] Send User ID:', userId);
            const response = await executeWithRetry(
                () => socialService.sendFriendRequest(userId)
            );
            showSuccess('Friend request sent!');

            // 3. Update relationshipStatus first (optimistic)
            setSearchResults(prev => prev.map(user =>
                user.id === userId
                    ? { ...user, relationshipStatus: "REQUEST_SENT" as const }
                    : user
            ));

            // Also update global store
            globalUpdateSearchUser(userId, { relationshipStatus: "REQUEST_SENT" });

            // 4. Call search API to get updated friendRequestId
            console.log('🔄 API response does not contain friendRequestId, calling search API...');
            try {
                // Get the user's name to search for them specifically
                const currentUser = searchResultsRef.current.find(u => u.id === userId);
                if (currentUser?.name) {
                    const searchResponse = await executeWithRetry(
                        () => socialService.searchUsersDetail(currentUser.name, 0, 10)
                    );

                    // Find the user in search results and get their friendRequestId
                    const updatedUser = searchResponse.data.content.find((u: any) => u.id === userId);
                    if (updatedUser && updatedUser.friendRequestId) {
                        console.log('🔄 Found friendRequestId from search:', updatedUser.friendRequestId);
                        setSearchResults(prev => prev.map(user =>
                            user.id === userId
                                ? {
                                    ...user,
                                    relationshipStatus: "REQUEST_SENT" as const,
                                    friendRequestId: updatedUser.friendRequestId
                                }
                                : user
                        ));

                        // Also update global store with friendRequestId
                        globalSendFriendRequest(userId, updatedUser.friendRequestId);
                    }
                }
            } catch (searchError) {
                console.warn('⚠️ Failed to get friendRequestId from search:', searchError);
                // Keep the optimistic update without friendRequestId
            }
        } catch (error: any) {
            console.error('Failed to send friend request:', error);
            showError(`Failed to send friend request: ${error.message}`);

            // 5. Rollback to original state on error
            if (originalUser) {
                setSearchResults(prev => prev.map(user =>
                    user.id === userId ? originalUser! : user
                ));
            }
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError]);

    const handleCancelRequest = useCallback(async (userId: string) => {
        // Store original state for rollback
        let originalUser: SearchUser | undefined;
        let friendRequestId: string | undefined;

        try {
            setProcessingUser(userId);

            // Get original user state and friendRequestId from current ref
            originalUser = searchResultsRef.current.find(u => u.id === userId);
            friendRequestId = originalUser?.friendRequestId;
            console.log('🔍 Cancel Request - Current searchResults:', searchResultsRef.current);
            console.log('🔍 Cancel Request - Original user:', originalUser);
            console.log('🔍 Cancel Request - friendRequestId:', friendRequestId);

            if (!friendRequestId) {
                console.error('❌ Cannot find friend request ID for user:', userId);
                console.error('❌ Available users:', searchResultsRef.current.map(u => ({ id: u.id, name: u.name, friendRequestId: u.friendRequestId })));
                showError('Cannot find friend request ID');
                return;
            }

            // Optimistic update
            setSearchResults(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, relationshipStatus: "NONE" as const, friendRequestId: undefined }
                    : u
            ));

            console.log('🔗 [Friend Request] Cancel URL:', `DELETE /api/social/friend-requests/${friendRequestId}`);
            console.log('📝 [Friend Request] Cancel Request ID:', friendRequestId);
            await executeWithRetry(
                () => socialService.cancelSentFriendRequest(friendRequestId!)
            );
            showSuccess('Friend request cancelled!');
        } catch (error: any) {
            console.error('Failed to cancel friend request:', error);
            showError(`Failed to cancel friend request: ${error.message}`);

            // Rollback to original state
            if (originalUser) {
                setSearchResults(prev => prev.map(u =>
                    u.id === userId ? originalUser! : u
                ));
            }
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError]);

    const handleRemoveFriend = useCallback(async (userId: string) => {
        let originalUser: SearchUser | undefined;

        try {
            setProcessingUser(userId);

            // Get original user state for rollback from current ref
            originalUser = searchResultsRef.current.find(u => u.id === userId);

            // Optimistic update
            setSearchResults(prev => prev.map(user =>
                user.id === userId
                    ? { ...user, relationshipStatus: "NONE" as const }
                    : user
            ));

            console.log('🔗 [Friend Request] Remove Friend URL:', `DELETE /api/social/friends/${userId}`);
            console.log('📝 [Friend Request] Remove Friend User ID:', userId);
            await socialService.removeFriend(userId);
            showSuccess('Friend removed successfully!');
        } catch (error: any) {
            console.error('Failed to remove friend:', error);
            showError(`Failed to remove friend: ${error.message}`);

            // Rollback to original state
            if (originalUser) {
                setSearchResults(prev => prev.map(user =>
                    user.id === userId ? originalUser! : user
                ));
            }
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError]);

    const handleAcceptRequestFromSearch = useCallback(async (userId: string) => {
        let originalUser: SearchUser | undefined;
        let friendRequestId: string | undefined;

        try {
            setProcessingUser(userId);

            // Get original user state and friendRequestId from current ref
            originalUser = searchResultsRef.current.find(u => u.id === userId);
            friendRequestId = originalUser?.friendRequestId;

            if (!friendRequestId) {
                showError('Cannot find friend request ID');
                return;
            }

            // Optimistic update
            setSearchResults(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, relationshipStatus: "FRIEND" as const }
                    : u
            ));

            // Also update global store
            globalUpdateSearchUser(userId, { relationshipStatus: "FRIEND" });

            console.log('🔗 [Friend Request] Accept from Search URL:', `PUT /api/social/friend-requests/${friendRequestId}?status=ACCEPTED`);
            console.log('📝 [Friend Request] Accept from Search Request ID:', friendRequestId);
            await socialService.handleFriendRequest(friendRequestId, 'ACCEPTED');
            showSuccess('Friend request accepted!');

            // Remove from pending requests in global store
            globalAcceptRequest(friendRequestId);
        } catch (error: any) {
            console.error('Failed to accept friend request:', error);
            showError(`Failed to accept friend request: ${error.message}`);

            // Rollback to original state
            if (originalUser) {
                setSearchResults(prev => prev.map(u =>
                    u.id === userId ? originalUser! : u
                ));
            }
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError]);

    const handleRejectRequestFromSearch = useCallback(async (userId: string) => {
        let originalUser: SearchUser | undefined;
        let friendRequestId: string | undefined;

        try {
            setProcessingUser(userId);

            // Get original user state and friendRequestId from current ref
            originalUser = searchResultsRef.current.find(u => u.id === userId);
            friendRequestId = originalUser?.friendRequestId;

            if (!friendRequestId) {
                showError('Cannot find friend request ID');
                return;
            }

            // Optimistic update
            setSearchResults(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, relationshipStatus: "NONE" as const }
                    : u
            ));

            // Also update global store
            globalUpdateSearchUser(userId, { relationshipStatus: "NONE" });

            console.log('🔗 [Friend Request] Reject from Search URL:', `PUT /api/social/friend-requests/${friendRequestId}?status=REJECTED`);
            console.log('📝 [Friend Request] Reject from Search Request ID:', friendRequestId);
            await socialService.handleFriendRequest(friendRequestId, 'REJECTED');
            showSuccess('Friend request rejected');

            // Remove from pending requests in global store
            globalRejectRequest(friendRequestId);
        } catch (error: any) {
            console.error('Failed to reject friend request:', error);
            showError(`Failed to reject friend request: ${error.message}`);

            // Rollback to original state
            if (originalUser) {
                setSearchResults(prev => prev.map(u =>
                    u.id === userId ? originalUser! : u
                ));
            }
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError]);

    const handleBlockUser = useCallback(async (userId: string) => {
        try {
            setProcessingUser(userId);
            console.log('🔗 [Friend Request] Block User URL:', `PUT /api/social/friends/${userId}/block`);
            console.log('📝 [Friend Request] Block User ID:', userId);
            await socialService.blockFriend(userId, 'BLOCKED');
            showSuccess('User blocked successfully!');

            setSearchResults(prev => prev.filter(user => user.id !== userId));
        } catch (error: any) {
            console.error('Failed to block user:', error);
            showError(`Failed to block user: ${error.message}`);
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError]);

    return {
        processingUser,
        handleSendFriendRequest,
        handleCancelRequest,
        handleRemoveFriend,
        handleAcceptRequestFromSearch,
        handleRejectRequestFromSearch,
        handleBlockUser,
    };
};
