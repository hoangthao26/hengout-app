// Centralized payment-related configuration for MVP

export const PAYMENT_CONFIG = {
    AUTO_CANCEL_MS: 5 * 60 * 1000,
    DEEPLINKS: {
        SUCCESS: 'hengout://payment-success',
        CANCEL: 'hengout://payment-cancel',
        CALLBACK: 'hengout://payment-callback'
    },
    RETRY: {
        MAX_ATTEMPTS: 2, // total attempts (initial + 1 retry) for MVP
        BASE_DELAY_MS: 400 // backoff base delay
    }
} as const;

export type PaymentConfig = typeof PAYMENT_CONFIG;





