/**
 * Auth Monitoring Service
 * Logging, metrics, and security monitoring for authentication
 */


export interface AuthEvent {
    id: string;
    timestamp: number;
    eventType: 'LOGIN' | 'LOGOUT' | 'REFRESH' | 'ROTATION' | 'ERROR' | 'SECURITY' | 'PERFORMANCE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userId?: string;
    sessionId?: string;
    details: string;
    metadata?: Record<string, any>;
    success: boolean;
}

export interface PerformanceMetrics {
    averageRefreshTime: number;
    refreshSuccessRate: number;
    errorRate: number;
    circuitBreakerTrips: number;
    lastRefreshTime: number;
    totalRefreshes: number;
    totalErrors: number;
}

export interface SecurityAlert {
    id: string;
    timestamp: number;
    alertType: 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED' | 'TOKEN_THEFT' | 'UNAUTHORIZED_ACCESS';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    resolved: boolean;
}

export class AuthMonitoringService {
    private static instance: AuthMonitoringService;
    private events: AuthEvent[] = [];
    private securityAlerts: SecurityAlert[] = [];
    private performanceMetrics: PerformanceMetrics = {
        averageRefreshTime: 0,
        refreshSuccessRate: 0,
        errorRate: 0,
        circuitBreakerTrips: 0,
        lastRefreshTime: 0,
        totalRefreshes: 0,
        totalErrors: 0
    };

    private refreshTimes: number[] = [];
    private maxEvents = 1000;
    private maxAlerts = 100;

    private constructor() { }

    static getInstance(): AuthMonitoringService {
        if (!AuthMonitoringService.instance) {
            AuthMonitoringService.instance = new AuthMonitoringService();
        }
        return AuthMonitoringService.instance;
    }

    logEvent(
        eventType: AuthEvent['eventType'],
        severity: AuthEvent['severity'],
        details: string,
        success: boolean,
        metadata?: Record<string, any>
    ): void {
        const event: AuthEvent = {
            id: this.generateEventId(),
            timestamp: Date.now(),
            eventType,
            severity,
            details,
            metadata,
            success,
            userId: this.getCurrentUserId(),
            sessionId: this.getCurrentSessionId()
        };

        this.events.push(event);

        // Keep only recent events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }

        // Update performance metrics
        this.updatePerformanceMetrics(event);

        // Check for security alerts
        this.checkSecurityAlerts(event);

        // Log to console with appropriate level
        this.logToConsole(event);

    }

    trackRefreshPerformance(startTime: number, success: boolean): void {
        const duration = Date.now() - startTime;
        this.refreshTimes.push(duration);

        // Keep only last 100 refresh times
        if (this.refreshTimes.length > 100) {
            this.refreshTimes = this.refreshTimes.slice(-100);
        }

        // Update metrics
        this.performanceMetrics.totalRefreshes++;
        this.performanceMetrics.lastRefreshTime = Date.now();

        if (!success) {
            this.performanceMetrics.totalErrors++;
        }

        // Calculate averages
        this.performanceMetrics.averageRefreshTime =
            this.refreshTimes.reduce((sum, time) => sum + time, 0) / this.refreshTimes.length;

        this.performanceMetrics.refreshSuccessRate =
            (this.performanceMetrics.totalRefreshes - this.performanceMetrics.totalErrors) /
            this.performanceMetrics.totalRefreshes * 100;

        this.performanceMetrics.errorRate =
            this.performanceMetrics.totalErrors / this.performanceMetrics.totalRefreshes * 100;

    }

    createSecurityAlert(
        alertType: SecurityAlert['alertType'],
        severity: SecurityAlert['severity'],
        description: string,
        metadata?: Record<string, any>
    ): void {
        const alert: SecurityAlert = {
            id: this.generateAlertId(),
            timestamp: Date.now(),
            alertType,
            severity,
            description,
            userId: this.getCurrentUserId(),
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
            resolved: false
        };

        this.securityAlerts.push(alert);

        // Keep only recent alerts
        if (this.securityAlerts.length > this.maxAlerts) {
            this.securityAlerts = this.securityAlerts.slice(-this.maxAlerts);
        }

        // Log critical alerts immediately
        if (severity === 'CRITICAL') {
            console.error(`🚨 [AuthMonitoring] CRITICAL SECURITY ALERT: ${alertType} - ${description}`);
        } else {
            console.warn(`⚠️ [AuthMonitoring] Security Alert: ${alertType} - ${description}`);
        }
    }

    /**
     * Update performance metrics based on events
     */
    private updatePerformanceMetrics(event: AuthEvent): void {
        if (event.eventType === 'REFRESH') {
            if (event.metadata?.duration) {
                this.refreshTimes.push(event.metadata.duration);
                if (this.refreshTimes.length > 100) {
                    this.refreshTimes = this.refreshTimes.slice(-100);
                }
            }
        }

        if (event.eventType === 'ERROR') {
            this.performanceMetrics.totalErrors++;
        }
    }

    /**
     * Check for security alerts based on events
     */
    private checkSecurityAlerts(event: AuthEvent): void {
        // Check for suspicious patterns
        if (event.eventType === 'ERROR' && event.severity === 'HIGH') {
            const recentErrors = this.events.filter(e =>
                e.eventType === 'ERROR' &&
                e.timestamp > Date.now() - 5 * 60 * 1000 // Last 5 minutes
            );

            if (recentErrors.length > 5) {
                this.createSecurityAlert(
                    'SUSPICIOUS_ACTIVITY',
                    'HIGH',
                    `Multiple authentication errors detected: ${recentErrors.length} errors in 5 minutes`,
                    { errorCount: recentErrors.length }
                );
            }
        }

        // Check for rate limiting
        if (event.details.includes('rate limit') || event.details.includes('Rate limit')) {
            this.createSecurityAlert(
                'RATE_LIMIT_EXCEEDED',
                'MEDIUM',
                'Rate limit exceeded for authentication requests',
                { details: event.details }
            );
        }

        // Check for token-related issues
        if (event.details.includes('invalid token') || event.details.includes('token expired')) {
            this.createSecurityAlert(
                'TOKEN_THEFT',
                'HIGH',
                'Potential token security issue detected',
                { details: event.details }
            );
        }
    }

    /**
     * Log events to console with appropriate formatting
     */
    private logToConsole(event: AuthEvent): void {
        const timestamp = new Date(event.timestamp).toISOString();
        const level = event.success ? '✅' : '❌';
        const severity = this.getSeverityEmoji(event.severity);

        const message = `${level} ${severity} [${timestamp}] ${event.eventType}: ${event.details}`;

        switch (event.severity) {
            case 'CRITICAL':
                console.error(message);
                break;
            case 'HIGH':
                console.warn(message);
                break;
            case 'MEDIUM':
                console.log(message);
                break;
            case 'LOW':
                console.log(message);
                break;
        }
    }

    /**
     * Get emoji for severity level
     */
    private getSeverityEmoji(severity: AuthEvent['severity']): string {
        switch (severity) {
            case 'CRITICAL': return '🚨';
            case 'HIGH': return '⚠️';
            case 'MEDIUM': return '📊';
            case 'LOW': return 'ℹ️';
            default: return '📝';
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique alert ID
     */
    private generateAlertId(): string {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current user ID (placeholder)
     */
    private getCurrentUserId(): string | undefined {
        // This would typically come from the auth context
        return 'current_user_id';
    }

    /**
     * Get current session ID (placeholder)
     */
    private getCurrentSessionId(): string | undefined {
        // This would typically be generated per session
        return 'current_session_id';
    }

    /**
     * Get recent events
     */
    getRecentEvents(limit: number = 50): AuthEvent[] {
        return this.events.slice(-limit);
    }

    /**
     * Get events by type
     */
    getEventsByType(eventType: AuthEvent['eventType']): AuthEvent[] {
        return this.events.filter(event => event.eventType === eventType);
    }

    /**
     * Get security alerts
     */
    getSecurityAlerts(resolved: boolean | null = null): SecurityAlert[] {
        if (resolved === null) {
            return [...this.securityAlerts];
        }
        return this.securityAlerts.filter(alert => alert.resolved === resolved);
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Resolve security alert
     */
    resolveSecurityAlert(alertId: string): boolean {
        const alert = this.securityAlerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            console.log(`✅ [AuthMonitoring] Security alert resolved: ${alertId}`);
            return true;
        }
        return false;
    }

    /**
     * Clear old events and alerts
     */
    clearOldData(olderThanHours: number = 24): void {
        const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

        this.events = this.events.filter(event => event.timestamp > cutoffTime);
        this.securityAlerts = this.securityAlerts.filter(alert => alert.timestamp > cutoffTime);

        console.log(`🧹 [AuthMonitoring] Cleared data older than ${olderThanHours} hours`);
    }

    /**
     * Export monitoring data for analysis
     */
    exportMonitoringData(): {
        events: AuthEvent[];
        alerts: SecurityAlert[];
        metrics: PerformanceMetrics;
        exportTime: number;
    } {
        return {
            events: [...this.events],
            alerts: [...this.securityAlerts],
            metrics: { ...this.performanceMetrics },
            exportTime: Date.now()
        };
    }

    /**
     * Get system health status
     */
    getSystemHealth(): {
        status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check error rate
        if (this.performanceMetrics.errorRate > 20) {
            issues.push(`High error rate: ${this.performanceMetrics.errorRate.toFixed(1)}%`);
            recommendations.push('Investigate authentication service issues');
        }

        // Check refresh success rate
        if (this.performanceMetrics.refreshSuccessRate < 80) {
            issues.push(`Low refresh success rate: ${this.performanceMetrics.refreshSuccessRate.toFixed(1)}%`);
            recommendations.push('Check network connectivity and token validity');
        }

        // Check for unresolved critical alerts
        const criticalAlerts = this.securityAlerts.filter(
            alert => alert.severity === 'CRITICAL' && !alert.resolved
        );
        if (criticalAlerts.length > 0) {
            issues.push(`${criticalAlerts.length} unresolved critical security alerts`);
            recommendations.push('Review and resolve critical security alerts immediately');
        }

        // Determine overall status
        let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (issues.length > 0) {
            status = criticalAlerts.length > 0 ? 'CRITICAL' : 'WARNING';
        }

        return { status, issues, recommendations };
    }
}

// Export singleton instance
export const authMonitoringService = AuthMonitoringService.getInstance();
