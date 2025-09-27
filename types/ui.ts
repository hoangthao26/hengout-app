// ============================================================================
// UI TYPES
// ============================================================================

// Navigation types
export interface NavigationParams {
    sessionToken?: string;
    email?: string;
    isRegistration?: string;
}

// Form validation types
export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export interface FormErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
    otp?: string;
    general?: string;
}

// Theme types
export type ColorScheme = 'light' | 'dark' | 'system';

export interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
}

// Localization types
export type SupportedLanguage = 'en' | 'vi';

export interface LocalizationConfig {
    language: SupportedLanguage;
    fallbackLanguage: SupportedLanguage;
}
