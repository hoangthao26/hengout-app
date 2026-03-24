import { Linking } from 'react-native';
import { subscriptionService } from './subscriptionService';
import { PayOSPaymentResponse, PaymentStatusResponse } from '../types/subscription';

// ============================================================================
// PAYMENT SERVICE - PayOS Integration
// ============================================================================

class PaymentService {
    private pollingInterval: NodeJS.Timeout | null = null;

    /**
     * Start payment process with PayOS
     */
    async startPayment(planId: number): Promise<{
        orderCode: number;
        checkoutUrl: string;
        qrCode: string;
        amount: number;
        currency: string;
        description: string;
    }> {
        try {
            const payment = await subscriptionService.createPaymentWithPayOS(planId);

            if (payment.status !== 'success') {
                throw new Error(payment.message || 'Failed to create payment');
            }

            // Return payment data
            return {
                orderCode: payment.data.orderCode,
                checkoutUrl: payment.data.checkoutUrl,
                qrCode: payment.data.qrCode,
                amount: payment.data.amount,
                currency: payment.data.currency,
                description: payment.data.description
            };
        } catch (error: any) {
            console.error('[PaymentService] Payment start failed:', error);
            throw error;
        }
    }

    /**
     * Open PayOS checkout in browser
     */
    async openPayOSCheckout(checkoutUrl: string): Promise<void> {
        try {
            const supported = await Linking.canOpenURL(checkoutUrl);
            if (supported) {
                await Linking.openURL(checkoutUrl);
            } else {
                throw new Error('Cannot open PayOS checkout URL');
            }
        } catch (error: any) {
            console.error('[PaymentService] Failed to open PayOS checkout:', error);
            throw error;
        }
    }

    /**
     * Poll payment status with exponential backoff and jitter until completion
     * 
     * Polling strategy:
     * 1. Checks payment status from server every poll cycle
     * 2. Uses exponential backoff with jitter for delay calculation
     * 3. Stops on SUCCESS, FAILED, or CANCELLED status (immediate resolution)
     * 4. Continues polling for PENDING status until maxAttempts reached
     * 5. Returns TIMEOUT if maxAttempts exceeded
     * 
     * Exponential backoff formula:
     * - Base delay: intervalMs (default 3000ms)
     * - Backoff: intervalMs * 1.5^attempt (exponential growth)
     * - Capped at: 15000ms (15 seconds max delay)
     * - Jitter: Random 0-500ms added to prevent thundering herd
     * 
     * Backoff examples (intervalMs=3000ms):
     * - Attempt 1: 3000ms * 1.5^1 = 4500ms + jitter
     * - Attempt 2: 3000ms * 1.5^2 = 6750ms + jitter
     * - Attempt 3: 3000ms * 1.5^3 = 10125ms + jitter (capped at 15000ms)
     * 
     * Jitter rationale:
     * - Random 0-500ms prevents synchronized polling from multiple clients
     * - Reduces server load spikes (distributes requests over time window)
     * - Common pattern for distributed systems
     * 
     * Status resolution:
     * - SUCCESS: Payment completed, resolves immediately
     * - FAILED/CANCELLED: Payment failed, resolves immediately
     * - PENDING: Continues polling with exponential backoff
     * - TIMEOUT: Max attempts reached, payment still pending
     * 
     * Error handling:
     * - Logs errors but continues polling (network errors are transient)
     * - Uses same backoff strategy for errors as for pending status
     * - Prevents polling loop from breaking on temporary failures
     * 
     * @param orderCode - PayOS order code to check status for
     * @param maxAttempts - Maximum polling attempts (default 12, ~36 seconds total)
     * @param intervalMs - Base interval between polls (default 3000ms)
     * @returns Promise resolving to 'SUCCESS', 'FAILED', or 'TIMEOUT'
     */
    async pollPaymentStatus(
        orderCode: number,
        maxAttempts: number = 12,
        intervalMs: number = 3000
    ): Promise<'SUCCESS' | 'FAILED' | 'TIMEOUT'> {
        return new Promise((resolve) => {
            let attempts = 0;

            const poll = async () => {
                try {
                    attempts++;
                    const status = await subscriptionService.checkPaymentStatusDetailed(orderCode);

                    if (status.status === 'SUCCESS') {
                        resolve('SUCCESS');
                        return;
                    }

                    if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                        resolve('FAILED');
                        return;
                    }

                    // Continue polling if still pending with exponential backoff + jitter
                    if (attempts < maxAttempts) {
                        const backoff = Math.min(15000, intervalMs * Math.pow(1.5, attempts));
                        const jitter = Math.floor(Math.random() * 500);
                        this.pollingInterval = setTimeout(poll, backoff + jitter);
                    } else {
                        resolve('TIMEOUT');
                    }
                } catch (error) {
                    console.error(`[PaymentService] Polling error (attempt ${attempts}):`, error);

                    if (attempts < maxAttempts) {
                        const backoff = Math.min(15000, intervalMs * Math.pow(1.5, attempts));
                        const jitter = Math.floor(Math.random() * 500);
                        this.pollingInterval = setTimeout(poll, backoff + jitter);
                    } else {
                        resolve('TIMEOUT');
                    }
                }
            };

            // Start polling
            poll();
        });
    }

    /**
     * Stop polling
     */
    stopPolling(): void {
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Complete payment process
     */
    async completePayment(planId: number): Promise<void> {
        try {
            await subscriptionService.activateSubscription(planId);
        } catch (error: any) {
            console.error('[PaymentService] Failed to complete payment:', error);
            throw error;
        }
    }

    /**
     * Cancel payment
     */
    async cancelPayment(orderCode: number): Promise<void> {
        try {
            await subscriptionService.cancelPayment(orderCode);
        } catch (error: any) {
            console.error('[PaymentService] Failed to cancel payment:', error);
            throw error;
        }
    }

    /**
     * Get payment status once
     */
    async getPaymentStatus(orderCode: number): Promise<PaymentStatusResponse> {
        try {
            return await subscriptionService.checkPaymentStatusDetailed(orderCode);
        } catch (error: any) {
            console.error('[PaymentService] Failed to get payment status:', error);
            throw error;
        }
    }

    /**
     * Format payment amount for display
     */
    formatPaymentAmount(amount: number, currency: string = 'VND'): string {
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: currency
        });
        return formatter.format(amount);
    }

    /**
     * Validate payment data
     */
    validatePaymentData(data: any): boolean {
        return !!(
            data &&
            data.orderCode &&
            data.checkoutUrl &&
            data.amount &&
            data.currency
        );
    }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;

