// Auth Service Types
import { BaseApiResponse } from './api';

export interface AuthData {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    role: string;
    onboardingComplete: boolean;
}

export interface AuthResponse extends BaseApiResponse<AuthData> { }

export interface OTPData {
    sessionToken: string;
    message: string;
    expiresIn: number;
}

export interface OTPResponse extends BaseApiResponse<OTPData> { }

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface OTPVerificationRequest {
    sessionToken: string;
    otp: string;
}

export interface OTPResendRequest {
    sessionToken: string;
}

export interface GoogleOAuthRequest {
    idToken: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface LogoutRequest {
    refreshToken: string;
}

export interface LogoutResponse extends BaseApiResponse<string> { }
