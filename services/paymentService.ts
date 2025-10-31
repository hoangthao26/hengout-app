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
            console.log(`[PaymentService] Starting payment for plan ${planId}`);

            // 1. Create payment with PayOS
            const payment = await subscriptionService.createPaymentWithPayOS(planId);

            if (payment.status !== 'success') {
                throw new Error(payment.message || 'Failed to create payment');
            }

            console.log(`[PaymentService] Payment created successfully:`, {
                orderCode: payment.data.orderCode,
                amount: payment.data.amount,
                status: payment.data.status
            });

            // 2. Return payment data
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
            console.log('[PaymentService] Opening PayOS checkout:', checkoutUrl);

            const supported = await Linking.canOpenURL(checkoutUrl);
            if (supported) {
                await Linking.openURL(checkoutUrl);
                console.log('[PaymentService] PayOS checkout opened successfully');
            } else {
                throw new Error('Cannot open PayOS checkout URL');
            }
        } catch (error: any) {
            console.error('[PaymentService] Failed to open PayOS checkout:', error);
            throw error;
        }
    }

    /**
     * Poll payment status until completion
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
                    console.log(`[PaymentService] Polling attempt ${attempts}/${maxAttempts} for order ${orderCode}`);

                    const status = await subscriptionService.checkPaymentStatusDetailed(orderCode);

                    console.log(`[PaymentService] Payment status:`, status);

                    if (status.status === 'SUCCESS') {
                        console.log('[PaymentService] Payment successful!');
                        resolve('SUCCESS');
                        return;
                    }

                    if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                        console.log('[PaymentService] Payment failed or cancelled');
                        resolve('FAILED');
                        return;
                    }

                    // Continue polling if still pending with exponential backoff + jitter
                    if (attempts < maxAttempts) {
                        const backoff = Math.min(15000, intervalMs * Math.pow(1.5, attempts));
                        const jitter = Math.floor(Math.random() * 500);
                        this.pollingInterval = setTimeout(poll, backoff + jitter);
                    } else {
                        console.log('[PaymentService] Polling timeout reached');
                        resolve('TIMEOUT');
                    }
                } catch (error) {
                    console.error(`[PaymentService] Polling error (attempt ${attempts}):`, error);

                    if (attempts < maxAttempts) {
                        const backoff = Math.min(15000, intervalMs * Math.pow(1.5, attempts));
                        const jitter = Math.floor(Math.random() * 500);
                        this.pollingInterval = setTimeout(poll, backoff + jitter);
                    } else {
                        console.log('[PaymentService] Polling failed after max attempts');
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
            console.log('[PaymentService] Polling stopped');
        }
    }

    /**
     * Complete payment process
     */
    async completePayment(planId: number): Promise<void> {
        try {
            console.log(`[PaymentService] Completing payment for plan ${planId}`);

            // Activate subscription
            await subscriptionService.activateSubscription(planId);

            console.log('[PaymentService] Payment completed successfully');
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
            console.log(`[PaymentService] Cancelling payment for order ${orderCode}`);

            await subscriptionService.cancelPayment(orderCode);

            console.log('[PaymentService] Payment cancelled successfully');
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

