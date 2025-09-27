// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    role: string;
    onboardingComplete: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ============================================================================
// GOOGLE OAUTH TYPES
// ============================================================================

export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
}

export interface GoogleTokens {
    idToken: string;
    accessToken?: string;
    refreshToken?: string;
}

export interface GoogleSignInResult {
    userInfo: GoogleUserInfo;
    idToken: string;
}

// ============================================================================
// AUTH STATE TYPES
// ============================================================================

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    tokens: {
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
        role: string;
        onboardingComplete: boolean;
    } | null;
    loading: LoadingState;
}

export interface LoadingState {
    isLoading: boolean;
    message?: string;
}
