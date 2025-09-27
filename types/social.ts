// Social Service Types
export interface FriendRequest {
    id: string;
    name: string;
    avatarUrl: string;
    createdAt: string;
}

export interface SearchUser {
    id: string;
    name: string;
    avatarUrl: string;
    relationshipStatus: "REQUEST_PENDING" | "FRIEND" | "NONE" | "REQUEST_SENT";
    friendRequestId?: string; // For canceling sent requests
    friendshipId?: string; // For friendship relationship
}

export interface Friend {
    friendId: string;
    friendName: string;
    avatarUrl: string | null;
    friendsSince: string;
}

export interface PendingRequestsResponse {
    status: string;
    data: FriendRequest[];
    message: string;
    errorCode?: number;
}


export interface HandleRequestResponse {
    status: string;
    data: string;
    message: string;
    errorCode?: number;
}

export interface GetFriendsResponse {
    status: string;
    data: Friend[];
    message: string;
    errorCode?: number;
}

export interface RemoveFriendResponse {
    status: string;
    data: string;
    message: string;
    errorCode?: number;
}

export interface SentFriendRequest {
    id: string;
    name: string;
    avatarUrl: string;
    createdAt: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface GetSentRequestsResponse {
    status: string;
    data: SentFriendRequest[];
    message: string;
    errorCode?: number;
}

export interface BlockFriendResponse {
    status: string;
    data: string;
    message: string;
    errorCode?: number;
}
