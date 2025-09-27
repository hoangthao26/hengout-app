

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
    return password.length >= 8;
}

export function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password should have at least 8 characters');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export function validateConfirmPassword(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
} 