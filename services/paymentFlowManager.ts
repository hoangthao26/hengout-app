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
     * Start payment flow
     */
    async startPayment(plan: Plan): Promise<PaymentData | null> {
        if (this.currentPayment) {
            return this.currentPayment.paymentData;
        }

        if (this.isProcessing) {
            return null;
        }

        this.isProcessing = true;
        try {
            const paymentData = await this.withRetry(() => paymentService.startPayment(plan.id));

            const prevHas = !!this.currentPayment;
            this.currentPayment = {
                plan,
                paymentData
            };

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
     * Complete payment from deep link
     */
    async completePaymentFromDeepLink(): Promise<void> {
        // If no current payment, skip to prevent deeplink reload
        if (!this.currentPayment) {
            return;
        }

        try {
            // Verify payment status
            const order = this.currentPayment.paymentData.orderCode;
            if (this.processedOrders.has(order)) {
                this.clearPayment();
                return;
            }
            const statusResponse = await paymentService.getPaymentStatus(order);

            if (statusResponse.status === 'SUCCESS') {
                // Activate subscription
                await paymentService.completePayment(this.currentPayment.plan.id);

                // Mark order as processed and clear payment data to prevent deeplink reload
                this.processedOrders.add(order);
                this.clearPayment();
                return;
            }
        } catch (error: any) {
            console.error('[PaymentFlowManager] Failed to complete payment:', error);
        } finally {
            // Only clear if payment wasn't successful (already cleared above)
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
     * Small retry helper with linear backoff (MVP)
     */
    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        const max = PAYMENT_CONFIG.RETRY.MAX_ATTEMPTS;
        let lastError: any;
        for (let attempt = 1; attempt <= max; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
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

