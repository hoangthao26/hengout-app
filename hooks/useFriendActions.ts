import { useCallback, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { socialService } from '../services/socialService';
import { useFriendStore } from '../store/friendStore';
import { useChatStore } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { SearchUser } from '../types/social';
import useLimits from '../hooks/useLimits';
import NavigationService from '../services/navigationService';
import { showLimitReachedThenUpgrade } from '../services/limitsService';

export const useFriendActions = (
    searchResults: SearchUser[],
    setSearchResults: React.Dispatch<React.SetStateAction<SearchUser[]>>,
    currentFriendsCount?: number,
    onUpgradeOpenModal?: () => void,
) => {
    const [processingUser, setProcessingUser] = useState<string | null>(null);
    const toastCtx = useToast();
    const { success: showSuccess, error: showError } = toastCtx;

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

    // Get chat store actions for refreshing conversations
    const { setConversations } = useChatStore();

    // Use ref to capture current searchResults
    const searchResultsRef = useRef<SearchUser[]>(searchResults);
    searchResultsRef.current = searchResults;

    /**
     * Refresh conversations list after friend-related actions
     * Called after accepting/removing friends to update conversation list
     */
    const refreshConversations = useCallback(async () => {
        try {
            const response = await chatService.getConversations();
            if (response.status === 'success') {
                setConversations(response.data);
            }
        } catch (error) {
            // Silently fail - conversation list will refresh on next navigation
            console.error('[useFriendActions] Error refreshing conversations:', error);
        }
    }, [setConversations]);

    // Compute friend limit status (optional if caller provides currentFriendsCount)
    const friendsLimit = useLimits('friends', currentFriendsCount || 0, () => NavigationService.navigate('/settings/my-subscription'));

    const promptUpgrade = () => showLimitReachedThenUpgrade(toastCtx, friendsLimit?.label || '', 4200, onUpgradeOpenModal);

    /**
     * Send friend request with optimistic updates and rollback mechanism
     * 
     * Complex multi-step process:
     * 1. Validates friend limit (blocks if at limit)
     * 2. Stores original state for potential rollback
     * 3. Sends friend request to server
     * 4. Optimistically updates UI (relationshipStatus → REQUEST_SENT)
     * 5. Fetches friendRequestId via search API (for cancellation support)
     * 6. Updates UI with friendRequestId
     * 7. Rolls back on error (restores original state)
     * 
     * Optimistic update pattern: UI updates immediately, rollback on failure.
     * Two-step update: relationshipStatus first, then friendRequestId separately.
     * 
     * @param userId - ID of user to send friend request to
     */
    const handleSendFriendRequest = useCallback(async (userId: string) => {
        // Guard: Block if friend limit reached (show upgrade prompt)
        if (friendsLimit && friendsLimit.isAtLimit) {
            promptUpgrade();
            return;
        }
        
        // Store original state for rollback on error
        let originalUser: SearchUser | undefined;

        try {
            setProcessingUser(userId);

            // Step 1: Capture original user state for rollback
            originalUser = searchResultsRef.current.find(u => u.id === userId);

            // Step 2: Send friend request to server
            const response = await socialService.sendFriendRequest(userId);
            showSuccess('Friend request sent!');

            // Step 3: Optimistic UI update - set relationshipStatus to REQUEST_SENT
            setSearchResults(prev => prev.map(user =>
                user.id === userId
                    ? { ...user, relationshipStatus: "REQUEST_SENT" as const }
                    : user
            ));

            // Also update global friend store
            globalUpdateSearchUser(userId, { relationshipStatus: "REQUEST_SENT" });

            // Step 4: Fetch friendRequestId via search API (needed for cancellation)
            // This is done separately because sendFriendRequest doesn't return friendRequestId
            try {
                const currentUser = searchResultsRef.current.find(u => u.id === userId);
                if (currentUser?.name) {
                    const searchResponse = await socialService.searchUsersDetail(currentUser.name, 0, 10);

                    // Find updated user in search results with friendRequestId
                    const updatedUser = searchResponse.data.content.find((u: any) => u.id === userId);
                    if (updatedUser && updatedUser.friendRequestId) {
                        // Update UI with friendRequestId for cancellation support
                        setSearchResults(prev => prev.map(user =>
                            user.id === userId
                                ? {
                                    ...user,
                                    relationshipStatus: "REQUEST_SENT" as const,
                                    friendRequestId: updatedUser.friendRequestId
                                }
                                : user
                        ));

                        // Update global store with friendRequestId
                        globalSendFriendRequest(userId, updatedUser.friendRequestId);
                    }
                }
            } catch (searchError) {
                // Non-critical: Keep optimistic update even if friendRequestId fetch fails
                // User can still see request was sent, cancellation just won't work until refresh
            }
        } catch (error: any) {
            console.error('[Friend Actions] Failed to send friend request:', error);
            showError(`Failed to send friend request: ${error.message}`);

            // Step 5: Rollback - restore original state on error
            if (originalUser) {
                setSearchResults(prev => prev.map(user =>
                    user.id === userId ? originalUser! : user
                ));
            }
        } finally {
            setProcessingUser(null);
        }
    }, [setSearchResults, showSuccess, showError, friendsLimit]);

    const handleCancelRequest = useCallback(async (userId: string) => {
        // Store original state for rollback
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
                    ? { ...u, relationshipStatus: "NONE" as const, friendRequestId: undefined }
                    : u
            ));

            await socialService.cancelSentFriendRequest(friendRequestId!);
            showSuccess('Friend request cancelled!');
        } catch (error: any) {
            console.error('[Friend Actions] Failed to cancel friend request:', error);
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

            await socialService.removeFriend(userId);
            showSuccess('Friend removed successfully!');

            // Refresh conversations to update conversation list
            await refreshConversations();
        } catch (error: any) {
            console.error('[Friend Actions] Failed to remove friend:', error);
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
        if (friendsLimit && friendsLimit.isAtLimit) {
            promptUpgrade();
            return;
        }
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

            await socialService.handleFriendRequest(friendRequestId, 'ACCEPTED');
            showSuccess('Friend request accepted!');

            // Remove from pending requests in global store
            globalAcceptRequest(friendRequestId);

            // Refresh conversations to show new conversation immediately
            await refreshConversations();
        } catch (error: any) {
            console.error('[Friend Actions] Failed to accept friend request:', error);
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
    }, [setSearchResults, showSuccess, showError, friendsLimit]);

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

            await socialService.handleFriendRequest(friendRequestId, 'REJECTED');
            showSuccess('Friend request rejected');

            // Remove from pending requests in global store
            globalRejectRequest(friendRequestId);
        } catch (error: any) {
            console.error('[Friend Actions] Failed to reject friend request:', error);
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
            await socialService.blockFriend(userId, 'BLOCKED');
            showSuccess('User blocked successfully!');

            setSearchResults(prev => prev.filter(user => user.id !== userId));
        } catch (error: any) {
            console.error('[Friend Actions] Failed to block user:', error);
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
