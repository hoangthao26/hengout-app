import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Friend, FriendRequest, SearchUser, SentFriendRequest } from '../types/social';

interface FriendState {
    // Data
    pendingRequests: FriendRequest[];
    sentRequests: SentFriendRequest[];
    friends: Friend[];
    searchResults: SearchUser[];

    // Loading states
    isLoadingPending: boolean;
    isLoadingSent: boolean;
    isLoadingFriends: boolean;
    isLoadingSearch: boolean;

    // Error states
    error: string | null;
}

interface FriendActions {
    // Data setters
    setPendingRequests: (requests: FriendRequest[]) => void;
    setSentRequests: (requests: SentFriendRequest[]) => void;
    setFriends: (friends: Friend[]) => void;
    setSearchResults: (results: SearchUser[]) => void;

    // Friend actions
    acceptRequest: (requestId: string) => void;
    rejectRequest: (requestId: string) => void;
    removeFriend: (friendshipId: string) => void;
    blockFriend: (friendshipId: string) => void;
    cancelSentRequest: (requestId: string) => void;
    sendFriendRequest: (userId: string, friendRequestId: string) => void;

    // Search actions
    updateSearchUser: (userId: string, updates: Partial<SearchUser>) => void;
    removeFromSearch: (userId: string) => void;

    // Loading setters
    setLoadingPending: (loading: boolean) => void;
    setLoadingSent: (loading: boolean) => void;
    setLoadingFriends: (loading: boolean) => void;
    setLoadingSearch: (loading: boolean) => void;

    // Error handling
    setError: (error: string | null) => void;
    clearError: () => void;

    // Reset
    reset: () => void;
}

type FriendStore = FriendState & FriendActions;

const initialState: FriendState = {
    pendingRequests: [],
    sentRequests: [],
    friends: [],
    searchResults: [],
    isLoadingPending: false,
    isLoadingSent: false,
    isLoadingFriends: false,
    isLoadingSearch: false,
    error: null,
};

export const useFriendStore = create<FriendStore>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Data setters
            setPendingRequests: (requests) => set({ pendingRequests: requests }),
            setSentRequests: (requests) => set({ sentRequests: requests }),
            setFriends: (friends) => set({ friends }),
            setSearchResults: (results) => set({ searchResults: results }),

            // Friend actions
            acceptRequest: (requestId) => set((state) => ({
                pendingRequests: state.pendingRequests.filter(req => req.id !== requestId),
                // Note: The accepted friend will be added to friends list when API call completes
            })),

            rejectRequest: (requestId) => set((state) => ({
                pendingRequests: state.pendingRequests.filter(req => req.id !== requestId),
            })),

            removeFriend: (friendId) => set((state) => ({
                friends: state.friends.filter(friend => friend.friendId !== friendId),
            })),

            /**
             * Block friend with multi-state cleanup
             * 
             * Blocking logic:
             * 1. Removes friend from friends list (relationship terminated)
             * 2. Removes from search results if present (hides from user discovery)
             * 
             * State synchronization:
             * - Friends list: Removed immediately (optimistic update)
             * - Search results: Removed to prevent re-friending blocked users
             * 
             * Note: Blocked user remains in database but is hidden from UI.
             * This allows unblocking in the future if needed.
             * 
             * @param friendId - Friendship ID to block
             */
            blockFriend: (friendId) => set((state) => ({
                friends: state.friends.filter(friend => friend.friendId !== friendId),
                // Also remove from search results if present (prevent re-friending)
                searchResults: state.searchResults.filter(user => user.friendshipId !== friendId),
            })),

            cancelSentRequest: (requestId) => set((state) => ({
                sentRequests: state.sentRequests.filter(req => req.id !== requestId),
            })),

            /**
             * Update search result after sending friend request with optimistic UI update
             * 
             * State update strategy:
             * 1. Finds user in search results by userId
             * 2. Updates relationshipStatus to "REQUEST_SENT" (optimistic UI update)
             * 3. Stores friendRequestId for cancellation support
             * 4. Preserves all other user data unchanged
             * 
             * Optimistic update pattern:
             * - UI updates immediately (shows "Request Sent" button)
             * - If API fails, caller should rollback this change
             * - friendRequestId enables cancel request functionality
             * 
             * @param userId - ID of user to update
             * @param friendRequestId - Friend request ID from server for cancellation
             */
            sendFriendRequest: (userId, friendRequestId) => set((state) => ({
                searchResults: state.searchResults.map(user =>
                    user.id === userId
                        ? {
                            ...user,
                            relationshipStatus: "REQUEST_SENT" as const,
                            friendRequestId
                        }
                        : user
                ),
            })),

            // Search actions
            updateSearchUser: (userId, updates) => set((state) => ({
                searchResults: state.searchResults.map(user =>
                    user.id === userId ? { ...user, ...updates } : user
                ),
            })),

            removeFromSearch: (userId) => set((state) => ({
                searchResults: state.searchResults.filter(user => user.id !== userId),
            })),

            // Loading setters
            setLoadingPending: (loading) => set({ isLoadingPending: loading }),
            setLoadingSent: (loading) => set({ isLoadingSent: loading }),
            setLoadingFriends: (loading) => set({ isLoadingFriends: loading }),
            setLoadingSearch: (loading) => set({ isLoadingSearch: loading }),

            // Error handling
            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            // Reset
            reset: () => set(initialState),
        }),
        {
            name: 'friend-store',
        }
    )
);

// Selectors for better performance
export const usePendingRequests = () => useFriendStore(state => state.pendingRequests);
export const useSentRequests = () => useFriendStore(state => state.sentRequests);
export const useFriends = () => useFriendStore(state => state.friends);
export const useSearchResults = () => useFriendStore(state => state.searchResults);

export const useFriendActions = () => useFriendStore(state => ({
    acceptRequest: state.acceptRequest,
    rejectRequest: state.rejectRequest,
    removeFriend: state.removeFriend,
    blockFriend: state.blockFriend,
    cancelSentRequest: state.cancelSentRequest,
    sendFriendRequest: state.sendFriendRequest,
    updateSearchUser: state.updateSearchUser,
    removeFromSearch: state.removeFromSearch,
}));

export const useFriendLoading = () => useFriendStore(state => ({
    isLoadingPending: state.isLoadingPending,
    isLoadingSent: state.isLoadingSent,
    isLoadingFriends: state.isLoadingFriends,
    isLoadingSearch: state.isLoadingSearch,
}));
