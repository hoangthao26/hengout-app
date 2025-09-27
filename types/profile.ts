// Profile Service Types
export interface UserProfile {
    displayName: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth: string;
    avatarUrl?: string;
    bio?: string;
    categoryTerms?: string[];
    purposeTerms?: string[];
    tagTerms?: string[];
}

export interface InitializeProfileRequest {
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    displayName: string;
    categoryTerms: string[];
    purposeTerms: string[];
    tagTerms: string[];
}

export interface UpdateProfileRequest {
    displayName?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string;
    bio?: string;
    avatarUrl?: string;
}

export interface ProfileResponse {
    status: string;
    data: UserProfile;
    message: string;
    errorCode: number;
}

export interface InitializeResponse {
    status: string;
    data: any;
    message: string;
    errorCode: number;
}
