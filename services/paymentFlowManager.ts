import { paymentService } from './paymentService';
import { Plan } from '../types/subscription';
import { PAYMENT_CONFIG } from '../config/paymentConfig';

// ============================================================================
// SIMPLE PAYMENT FLOW MANAGER - Deep Link Based
// ============================================================================

export interface PaymentData {
    orderCode: number;
    checkoutUrl: string;
    qrCode: string;
    amount: number;
    currency: string;
    description: string;
}

class PaymentFlowManager {
    private static instance: PaymentFlowManager;
    private currentPayment: {
        plan: Plan;
        paymentData: PaymentData;
    } | null = null;
    private listeners: (() => void)[] = [];
    private isProcessing: boolean = false;
    private processedOrders = new Set<number>();

    static getInstance(): PaymentFlowManager {
        if (!PaymentFlowManager.instance) {
            PaymentFlowManager.instance = new PaymentFlowManager();
        }
        return PaymentFlowManager.instance;
    }

    /**
     * Subscribe to payment flow changes
     */
    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners
     */
    private notify(): void {
        this.listeners.forEach(listener => listener());
    }

    private notifyIfChanged(prevHasPayment: boolean): void {
        const nowHasPayment = !!this.currentPayment;
        if (prevHasPayment !== nowHasPayment) {
            this.notify();
        }
    }

    /**
     * Start payment flow for a subscription plan
     * 
     * Implements singleton pattern per payment session:
     * - If payment already exists, returns existing payment data (prevents duplicate payments)
     * - Uses retry mechanism with exponential backoff for network resilience
     * - Notifies listeners of payment state changes for UI updates
     * - Prevents concurrent payment processing with isProcessing flag
     * 
     * @param plan - Subscription plan to create payment for
     * @returns Payment data (orderCode, checkoutUrl, qrCode) or null if processing
     * @throws Error if payment creation fails after retries
     */
    async startPayment(plan: Plan): Promise<PaymentData | null> {
        // Return existing payment if already in progress (prevents duplicate payment creation)
        if (this.currentPayment) {
            return this.currentPayment.paymentData;
        }

        // Prevent concurrent payment processing
        if (this.isProcessing) {
            return null;
        }

        this.isProcessing = true;
        try {
            // Retry payment creation with exponential backoff
            const paymentData = await this.withRetry(() => paymentService.startPayment(plan.id));

            // Store payment state and notify listeners
            const prevHas = !!this.currentPayment;
            this.currentPayment = {
                plan,
                paymentData
            };

            // Notify listeners only if state changed (was null, now has payment)
            this.notifyIfChanged(prevHas);
            return paymentData;
        } catch (error: any) {
            console.error('[PaymentFlowManager] Failed to start payment:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get current payment data
     */
    getCurrentPayment(): { plan: Plan; paymentData: PaymentData } | null {
        return this.currentPayment;
    }

    /**
     * Clear current payment
     */
    clearPayment(): void {
        const prevHas = !!this.currentPayment;
        this.currentPayment = null;
        this.isProcessing = false;
        this.notifyIfChanged(prevHas);
    }

    /**
     * Clear all payment data including processed orders (for logout or full reset)
     */
    clearAllPaymentData(): void {
        const prevHas = !!this.currentPayment;
        this.currentPayment = null;
        this.isProcessing = false;
        this.processedOrders.clear();
        this.notifyIfChanged(prevHas);
    }

    /**
     * Cancel current payment
     */
    async cancelPayment(): Promise<void> {
        if (this.currentPayment) {
            try {
                const order = this.currentPayment.paymentData.orderCode;
                if (!this.processedOrders.has(order)) {
                    await this.withRetry(() => paymentService.cancelPayment(order));
                    this.processedOrders.add(order);
                }
            } catch (error) {
                console.error('[PaymentFlowManager] Failed to cancel payment:', error);
            }
        }
        this.clearPayment();
    }

    /**
     * Complete payment flow triggered by deep link callback
     * 
     * Handles payment completion from PayOS redirect:
     * 1. Verifies order hasn't been processed (prevents duplicate processing)
     * 2. Checks payment status from server
     * 3. Activates subscription on success
     * 4. Marks order as processed to prevent re-processing on deep link reload
     * 5. Clears payment state to prevent stuck UI state
     * 
     * Idempotent: Safe to call multiple times for same order (processed orders are skipped)
     */
    async completePaymentFromDeepLink(): Promise<void> {
        // Early exit if no payment in progress (prevents processing on deeplink reload)
        if (!this.currentPayment) {
            return;
        }

        try {
            const order = this.currentPayment.paymentData.orderCode;

            // Idempotency check: Skip if already processed (prevents duplicate subscription activation)
            if (this.processedOrders.has(order)) {
                this.clearPayment();
                return;
            }

            // Verify payment status with server
            const statusResponse = await paymentService.getPaymentStatus(order);

            if (statusResponse.status === 'SUCCESS') {
                // Activate subscription on successful payment
                await paymentService.completePayment(this.currentPayment.plan.id);

                // Mark order as processed and clear payment to prevent re-processing on deeplink reload
                this.processedOrders.add(order);
                this.clearPayment();
                return;
            }
        } catch (error: any) {
            console.error('[PaymentFlowManager] Failed to complete payment:', error);
        } finally {
            // Clear payment state on error or non-success status to prevent stuck state
            // (Already cleared above on success, so this handles error cases)
            if (this.currentPayment) {
                this.clearPayment();
            }
        }
    }

    /**
     * Reset payment flow from deep link
     */
    async resetPaymentFlowFromDeepLink(): Promise<void> {
        // If no current payment, skip to prevent deeplink reload
        if (!this.currentPayment) {
            return;
        }

        try {
            const order = this.currentPayment.paymentData.orderCode;
            if (this.processedOrders.has(order)) {
                this.clearPayment();
                return;
            }

            await paymentService.cancelPayment(order);

            // Mark order as processed and clear payment data to prevent deeplink reload
            this.processedOrders.add(order);
            this.clearPayment();
        } catch (error) {
            console.error('[PaymentFlowManager] Failed to cancel payment:', error);
            // Clear payment even on error to prevent stuck state
            this.clearPayment();
        }
    }

    /**
     * Reset payment flow (alias for clearPayment)
     */
    resetPaymentFlow(): void {
        this.clearPayment();
    }

    /**
     * Read-only selectors for UI
     */
    getIsProcessing(): boolean {
        return this.isProcessing;
    }

    hasActivePayment(): boolean {
        return !!this.currentPayment;
    }

    /**
     * Retry wrapper with linear backoff strategy
     * 
     * Implements retry logic for payment operations:
     * - Linear backoff: delay = baseDelay * attemptNumber
     * - Maximum retry attempts from config
     * - Throws last error if all attempts fail
     * 
     * Example: With baseDelay=1000ms and maxAttempts=3:
     * - Attempt 1: immediate
     * - Attempt 2: wait 2000ms
     * - Attempt 3: wait 3000ms
     * 
     * @template T - Return type of the function
     * @param fn - Async function to retry
     * @returns Result from successful attempt
     * @throws Last error if all attempts fail
     */
    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        const max = PAYMENT_CONFIG.RETRY.MAX_ATTEMPTS;
        let lastError: any;
        for (let attempt = 1; attempt <= max; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                // Wait with linear backoff before retry (except on last attempt)
                if (attempt < max) {
                    const delay = PAYMENT_CONFIG.RETRY.BASE_DELAY_MS * attempt;
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }
        throw lastError;
    }
}

// Export singleton instance
export const paymentFlowManager = PaymentFlowManager.getInstance();
export default paymentFlowManager;

