import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useError } from '../contexts/ErrorContext';
import { ErrorCategory, ErrorSeverity } from '../types/error';

// ============================================================================
// NETWORK STATUS HOOK
// ============================================================================

interface NetworkStatus {
    isOnline: boolean;
    isConnected: boolean;
    connectionType: string | null;
    isInternetReachable: boolean | null;
    lastChecked: number;
}

export const useNetworkStatus = () => {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: true,
        isConnected: true,
        connectionType: null,
        isInternetReachable: null,
        lastChecked: Date.now()
    });

    const { setOnlineStatus, addNetworkError } = useError();

    // ============================================================================
    // NETWORK STATUS HANDLERS
    // ============================================================================

    const handleNetworkChange = useCallback((state: NetInfoState) => {
        setNetworkStatus(prevStatus => {
            const newStatus: NetworkStatus = {
                isOnline: state.isConnected ?? false,
                isConnected: state.isConnected ?? false,
                connectionType: state.type,
                isInternetReachable: state.isInternetReachable,
                lastChecked: Date.now()
            };

            // Report network status changes
            if (prevStatus.isOnline !== newStatus.isOnline) {
                if (newStatus.isOnline) {
                    console.log('🌐 Network connection restored');
                } else {
                    console.log('🌐 Network connection lost');
                    addNetworkError(
                        'Network connection lost',
                        {
                            component: 'useNetworkStatus',
                            action: 'networkChange',
                            connectionType: newStatus.connectionType,
                            isInternetReachable: newStatus.isInternetReachable
                        }
                    );
                }
            }

            // Report internet reachability issues
            if (newStatus.isConnected && newStatus.isInternetReachable === false) {
                console.log('🌐 Connected but no internet access');
                addNetworkError(
                    'Connected but no internet access',
                    {
                        component: 'useNetworkStatus',
                        action: 'internetReachability',
                        connectionType: newStatus.connectionType
                    }
                );
            }

            // Update online status in error context (only if changed)
            if (prevStatus.isOnline !== newStatus.isOnline) {
                setOnlineStatus(newStatus.isOnline);
            }

            return newStatus;
        });
    }, [setOnlineStatus, addNetworkError]);

    // ============================================================================
    // NETWORK MONITORING
    // ============================================================================

    useEffect(() => {
        console.log('🌐 Starting network monitoring...');

        // Get initial network state
        NetInfo.fetch().then(handleNetworkChange);

        // Subscribe to network state changes
        const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

        return () => {
            console.log('🌐 Stopping network monitoring...');
            unsubscribe();
        };
    }, []); // Remove handleNetworkChange from dependencies

    // ============================================================================
    // NETWORK UTILITIES
    // ============================================================================

    const checkNetworkStatus = useCallback(async (): Promise<NetworkStatus> => {
        try {
            const state = await NetInfo.fetch();
            handleNetworkChange(state);
            // Return current status after update
            return {
                isOnline: state.isConnected ?? false,
                isConnected: state.isConnected ?? false,
                connectionType: state.type,
                isInternetReachable: state.isInternetReachable,
                lastChecked: Date.now()
            };
        } catch (error) {
            console.error('❌ Failed to check network status:', error);
            addNetworkError(
                error as Error,
                {
                    component: 'useNetworkStatus',
                    action: 'checkNetworkStatus'
                }
            );
            return networkStatus;
        }
    }, [handleNetworkChange, addNetworkError, networkStatus]);

    const waitForNetwork = useCallback(async (timeout: number = 30000): Promise<boolean> => {
        return new Promise((resolve) => {
            // Check current status first
            if (networkStatus.isOnline) {
                resolve(true);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(async () => {
                try {
                    // Get fresh network status
                    const state = await NetInfo.fetch();
                    if (state.isConnected) {
                        clearInterval(checkInterval);
                        resolve(true);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(checkInterval);
                        resolve(false);
                    }
                } catch (error) {
                    clearInterval(checkInterval);
                    resolve(false);
                }
            }, 1000);
        });
    }, [networkStatus.isOnline]);

    // ============================================================================
    // RETURN VALUES
    // ============================================================================

    return {
        ...networkStatus,
        checkNetworkStatus,
        waitForNetwork,
        isOffline: !networkStatus.isOnline,
        hasInternet: networkStatus.isOnline && networkStatus.isInternetReachable !== false
    };
};

// ============================================================================
// NETWORK ERROR HANDLER HOOK
// ============================================================================

export const useNetworkErrorHandler = () => {
    const { isOnline, addNetworkError } = useError();

    const handleNetworkError = useCallback((
        error: Error | string,
        context?: any
    ) => {
        addNetworkError(error, {
            component: 'useNetworkErrorHandler',
            action: 'handleNetworkError',
            isOnline,
            ...context
        });
    }, [addNetworkError, isOnline]);

    const withNetworkRetry = useCallback(async <T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        retryDelay: number = 1000
    ): Promise<T> => {
        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (!isOnline && attempt > 0) {
                    console.log(`🌐 Waiting for network connection (attempt ${attempt + 1}/${maxRetries + 1})...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                    continue;
                }

                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    handleNetworkError(lastError, {
                        maxRetries,
                        finalAttempt: true
                    });
                    throw lastError;
                }

                console.log(`🔄 Network operation failed, retrying... (${attempt + 1}/${maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            }
        }

        throw lastError!;
    }, [isOnline, handleNetworkError]);

    return {
        handleNetworkError,
        withNetworkRetry,
        isOnline
    };
};
