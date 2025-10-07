import { AppError, ErrorCategory, ErrorSeverity } from '../types/error';

// ============================================================================
// SIMPLE ERROR RECOVERY FOR MVP
// ============================================================================

export class SimpleErrorRecovery {
    /**
     * Simple auto-recovery for common errors
     */
    static async attemptAutoRecovery(error: AppError): Promise<boolean> {
        try {
            switch (error.category) {
                case ErrorCategory.NETWORK:
                    // For network errors, just wait and return true (let retry handle it)
                    await this.sleep(1000);
                    return true;

                case ErrorCategory.AUTH:
                    // For auth errors, don't auto-recover (user needs to login)
                    return false;

                case ErrorCategory.VALIDATION:
                    // For validation errors, auto-recover by clearing the error
                    return true;

                case ErrorCategory.UI:
                case ErrorCategory.RENDERING:
                    // For UI errors, auto-recover
                    return true;

                case ErrorCategory.SYSTEM:
                    // For system errors, only auto-recover if not critical
                    return error.severity !== ErrorSeverity.CRITICAL;

                default:
                    return false;
            }
        } catch (recoveryError) {
            console.log('❌ Auto recovery failed:', recoveryError);
            return false;
        }
    }

    /**
     * Get simple recovery message for user
     */
    static getRecoveryMessage(error: AppError): string {
        switch (error.category) {
            case ErrorCategory.NETWORK:
                return 'Network connection issue. Please check your internet and try again.';

            case ErrorCategory.AUTH:
                return 'Authentication failed. Please sign in again.';

            case ErrorCategory.VALIDATION:
                return 'Please check your input and try again.';

            case ErrorCategory.UI:
            case ErrorCategory.RENDERING:
                return 'Display issue occurred. Please refresh the page.';

            case ErrorCategory.SYSTEM:
                if (error.severity === ErrorSeverity.CRITICAL) {
                    return 'Critical system error. Please restart the app.';
                }
                return 'System error occurred. Please try again.';

            default:
                return 'An error occurred. Please try again.';
        }
    }

    /**
     * Check if error can be recovered
     */
    static canRecover(error: AppError): boolean {
        // Most errors can be recovered except critical system errors
        return !(error.category === ErrorCategory.SYSTEM && error.severity === ErrorSeverity.CRITICAL);
    }

    /**
     * Simple sleep utility
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

