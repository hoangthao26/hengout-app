// ============================================================================
// ERROR TYPES & INTERFACES
// ============================================================================

export enum ErrorCategory {
    NETWORK = 'network',
    API = 'api',
    AUTH = 'auth',
    TOKEN = 'token',
    VALIDATION = 'validation',
    UI = 'ui',
    RENDERING = 'rendering',
    SYSTEM = 'system',
    WORKFLOW = 'workflow',
    UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ErrorRecoveryStrategy {
    RETRY = 'retry',
    FALLBACK = 'fallback',
    IGNORE = 'ignore',
    RESTART = 'restart',
    LOGOUT = 'logout',
    CRASH = 'crash'
}

export interface AppError {
    id: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    recoveryStrategy: ErrorRecoveryStrategy;
    timestamp: number;
    context?: { [key: string]: any };
    originalError?: Error;
    stack?: string;
}

// Error messages for user-friendly display
export const ERROR_MESSAGES = {
    [ErrorCategory.NETWORK]: {
        [ErrorSeverity.LOW]: 'Kết nối mạng không ổn định',
        [ErrorSeverity.MEDIUM]: 'Mất kết nối mạng tạm thời',
        [ErrorSeverity.HIGH]: 'Không thể kết nối mạng',
        [ErrorSeverity.CRITICAL]: 'Lỗi kết nối nghiêm trọng'
    },
    [ErrorCategory.API]: {
        [ErrorSeverity.LOW]: 'Dịch vụ tạm thời không khả dụng',
        [ErrorSeverity.MEDIUM]: 'Lỗi kết nối đến máy chủ',
        [ErrorSeverity.HIGH]: 'Không thể tải dữ liệu',
        [ErrorSeverity.CRITICAL]: 'Lỗi hệ thống nghiêm trọng'
    },
    [ErrorCategory.AUTH]: {
        [ErrorSeverity.LOW]: 'Phiên đăng nhập sắp hết hạn',
        [ErrorSeverity.MEDIUM]: 'Cần đăng nhập lại',
        [ErrorSeverity.HIGH]: 'Phiên đăng nhập đã hết hạn',
        [ErrorSeverity.CRITICAL]: 'Lỗi xác thực nghiêm trọng'
    },
    [ErrorCategory.TOKEN]: {
        [ErrorSeverity.LOW]: 'Token sắp hết hạn',
        [ErrorSeverity.MEDIUM]: 'Token không hợp lệ',
        [ErrorSeverity.HIGH]: 'Token đã hết hạn',
        [ErrorSeverity.CRITICAL]: 'Lỗi token nghiêm trọng'
    },
    [ErrorCategory.VALIDATION]: {
        [ErrorSeverity.LOW]: 'Dữ liệu không hợp lệ',
        [ErrorSeverity.MEDIUM]: 'Vui lòng kiểm tra thông tin',
        [ErrorSeverity.HIGH]: 'Dữ liệu đầu vào không đúng',
        [ErrorSeverity.CRITICAL]: 'Lỗi dữ liệu nghiêm trọng'
    },
    [ErrorCategory.UI]: {
        [ErrorSeverity.LOW]: 'Giao diện tạm thời không ổn định',
        [ErrorSeverity.MEDIUM]: 'Lỗi hiển thị giao diện',
        [ErrorSeverity.HIGH]: 'Không thể tải giao diện',
        [ErrorSeverity.CRITICAL]: 'Lỗi giao diện nghiêm trọng'
    },
    [ErrorCategory.RENDERING]: {
        [ErrorSeverity.LOW]: 'Hiển thị tạm thời không ổn định',
        [ErrorSeverity.MEDIUM]: 'Lỗi hiển thị nội dung',
        [ErrorSeverity.HIGH]: 'Không thể hiển thị nội dung',
        [ErrorSeverity.CRITICAL]: 'Lỗi hiển thị nghiêm trọng'
    },
    [ErrorCategory.SYSTEM]: {
        [ErrorSeverity.LOW]: 'Hệ thống tạm thời không ổn định',
        [ErrorSeverity.MEDIUM]: 'Lỗi hệ thống',
        [ErrorSeverity.HIGH]: 'Không thể truy cập hệ thống',
        [ErrorSeverity.CRITICAL]: 'Lỗi hệ thống nghiêm trọng'
    },
    [ErrorCategory.WORKFLOW]: {
        [ErrorSeverity.LOW]: 'Quy trình tạm thời bị gián đoạn',
        [ErrorSeverity.MEDIUM]: 'Lỗi trong quy trình',
        [ErrorSeverity.HIGH]: 'Không thể hoàn thành quy trình',
        [ErrorSeverity.CRITICAL]: 'Lỗi quy trình nghiêm trọng'
    },
    [ErrorCategory.UNKNOWN]: {
        [ErrorSeverity.LOW]: 'Đã xảy ra lỗi nhỏ',
        [ErrorSeverity.MEDIUM]: 'Đã xảy ra lỗi',
        [ErrorSeverity.HIGH]: 'Đã xảy ra lỗi nghiêm trọng',
        [ErrorSeverity.CRITICAL]: 'Đã xảy ra lỗi cực kỳ nghiêm trọng'
    }
};

// Error recovery configuration
export const ERROR_RECOVERY_CONFIG = {
    [ErrorCategory.NETWORK]: {
        strategy: ErrorRecoveryStrategy.RETRY,
        maxRetries: 3,
        retryDelay: 1000
    },
    [ErrorCategory.API]: {
        strategy: ErrorRecoveryStrategy.RETRY,
        maxRetries: 2,
        retryDelay: 2000
    },
    [ErrorCategory.AUTH]: {
        strategy: ErrorRecoveryStrategy.LOGOUT,
        maxRetries: 0,
        retryDelay: 0
    },
    [ErrorCategory.TOKEN]: {
        strategy: ErrorRecoveryStrategy.RETRY,
        maxRetries: 1,
        retryDelay: 500
    },
    [ErrorCategory.VALIDATION]: {
        strategy: ErrorRecoveryStrategy.IGNORE,
        maxRetries: 0,
        retryDelay: 0
    },
    [ErrorCategory.UI]: {
        strategy: ErrorRecoveryStrategy.FALLBACK,
        maxRetries: 1,
        retryDelay: 1000
    },
    [ErrorCategory.RENDERING]: {
        strategy: ErrorRecoveryStrategy.FALLBACK,
        maxRetries: 1,
        retryDelay: 1000
    },
    [ErrorCategory.SYSTEM]: {
        strategy: ErrorRecoveryStrategy.RESTART,
        maxRetries: 0,
        retryDelay: 0
    },
    [ErrorCategory.WORKFLOW]: {
        strategy: ErrorRecoveryStrategy.IGNORE,
        maxRetries: 0,
        retryDelay: 0
    },
    [ErrorCategory.UNKNOWN]: {
        strategy: ErrorRecoveryStrategy.IGNORE,
        maxRetries: 0,
        retryDelay: 0
    }
};

// Context type for error management
export interface ErrorContextType {
    errors: AppError[];
    addError: (error: AppError) => void;
    clearError: (errorId: string) => void;
    clearAllErrors: () => void;
    getErrorsByCategory: (category: ErrorCategory) => AppError[];
    getErrorsBySeverity: (severity: ErrorSeverity) => AppError[];
    getRecentErrors: (limit?: number) => AppError[];
    isOnline: boolean;
    lastErrorTime: number;
}

// Utility functions
export const generateErrorId = (): string => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createAppError = (
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: AppError['context']
): AppError => {
    const originalError = error instanceof Error ? error : new Error(error);
    const message = typeof error === 'string' ? error : error.message;

    return {
        id: generateErrorId(),
        message,
        category,
        severity,
        recoveryStrategy: (ERROR_RECOVERY_CONFIG as any)[category]?.strategy || ErrorRecoveryStrategy.IGNORE,
        timestamp: Date.now(),
        context,
        originalError,
        stack: originalError?.stack
    };
};

export const getUserFriendlyMessage = (error: AppError): string => {
    return ERROR_MESSAGES[error.category]?.[error.severity] || ERROR_MESSAGES[ErrorCategory.UNKNOWN][error.severity];
};

export const isRecoverableError = (error: AppError): boolean => {
    return error.recoveryStrategy !== ErrorRecoveryStrategy.CRASH &&
        error.recoveryStrategy !== ErrorRecoveryStrategy.LOGOUT;
};

export const shouldRetryError = (error: AppError): boolean => {
    return error.recoveryStrategy === ErrorRecoveryStrategy.RETRY;
};

export const getRetryDelay = (error: AppError, attempt: number): number => {
    const config = ERROR_RECOVERY_CONFIG[error.category];
    if (!config || !shouldRetryError(error)) return 0;

    // Exponential backoff with jitter
    const baseDelay = config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, 10000); // Max 10 seconds
};