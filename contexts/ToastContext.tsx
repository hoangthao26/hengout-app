import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Toast, ToastContextType, ToastOptions } from '../types/toast';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
    children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const generateId = useCallback(() => {
        return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));

        // Clear timeout if exists
        const timeout = timeoutRefs.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            timeoutRefs.current.delete(id);
        }
    }, []);

    const showToast = useCallback((toastData: Omit<Toast, 'id'> & { id?: string }): string => {
        const id = toastData.id || generateId();
        const toast: Toast = {
            id,
            duration: 4000, // Default 4 seconds
            position: 'top',
            persistent: false,
            ...toastData,
        };

        // Check if toast with this ID already exists
        const existingIndex = toasts.findIndex(t => t.id === id);
        const isExistingToast = existingIndex >= 0;

        console.log('[ToastContext] showToast - ID:', id, 'isExisting:', isExistingToast);
        console.log('[ToastContext] showToast - Current toasts count:', toasts.length);
        console.log('[ToastContext] showToast - Existing index:', existingIndex);

        if (isExistingToast) {
            // Update existing toast - clear old timeout first
            const existingTimeout = timeoutRefs.current.get(id);
            if (existingTimeout) {
                console.log('[ToastContext] Clearing existing timeout for toast:', id);
                clearTimeout(existingTimeout);
                timeoutRefs.current.delete(id);
            }
        }

        // Update toast state
        setToasts(prev => {
            const existingIndex = prev.findIndex(t => t.id === id);
            console.log('[ToastContext] setToasts - ID:', id, 'existingIndex:', existingIndex);
            console.log('[ToastContext] setToasts - Previous toasts count:', prev.length);

            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = toast;
                console.log('[ToastContext] Updated existing toast:', id);
                console.log('[ToastContext] Updated toast data:', toast);
                return updated;
            } else {
                console.log('[ToastContext] Adding new toast:', id);
                console.log('[ToastContext] New toast data:', toast);
                return [...prev, toast];
            }
        });

        // Auto hide after duration (unless persistent)
        if (!toast.persistent && toast.duration && toast.duration > 0) {
            const timeout = setTimeout(() => {
                console.log('[ToastContext] Auto-hiding toast after timeout:', id);

                // Clear active notification for message toasts
                if (toast.type === 'message' && toast.conversationData) {
                    try {
                        const { useNotificationStore } = require('../store/notificationStore');
                        const notificationStore = useNotificationStore.getState();
                        notificationStore.removeActiveNotification(toast.conversationData.id);
                        console.log('[ToastContext] Cleared active notification for conversation:', toast.conversationData.id);
                    } catch (error) {
                        console.error('[ToastContext] Failed to clear active notification:', error);
                    }
                }

                hideToast(id);
            }, toast.duration);

            timeoutRefs.current.set(id, timeout);
            console.log('[ToastContext] Set timeout for toast:', id, 'duration:', toast.duration, 'isExisting:', isExistingToast);
        }

        return id;
    }, [generateId, hideToast, toasts]);

    const hideAllToasts = useCallback(() => {
        // Clear all timeouts
        timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
        timeoutRefs.current.clear();

        setToasts([]);
    }, []);

    const hideLoading = useCallback(() => {
        setToasts(prev => prev.filter(toast => toast.type !== 'loading'));

        // Clear loading toast timeouts
        timeoutRefs.current.forEach((timeout, id) => {
            const toast = toasts.find(t => t.id === id);
            if (toast?.type === 'loading') {
                clearTimeout(timeout);
                timeoutRefs.current.delete(id);
            }
        });
    }, [toasts]);

    const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
        console.log('[ToastContext] updateToast called for ID:', id, 'updates:', updates);
        console.log('[ToastContext] updateToast - Current toasts count:', toasts.length);

        setToasts(prev => {
            console.log('[ToastContext] updateToast - Previous toasts:', prev.map(t => ({ id: t.id, type: t.type })));

            const existingToast = prev.find(t => t.id === id);
            if (!existingToast) {
                console.log('[ToastContext] updateToast - Toast not found, clearing active notification for message toasts');

                // Clear active notification for message toasts when toast doesn't exist
                if (updates.conversationData) {
                    try {
                        const { useNotificationStore } = require('../store/notificationStore');
                        const notificationStore = useNotificationStore.getState();
                        notificationStore.removeActiveNotification(updates.conversationData.id);
                        console.log('[ToastContext] Cleared active notification for conversation:', updates.conversationData.id);
                    } catch (error) {
                        console.error('[ToastContext] Failed to clear active notification:', error);
                    }
                }

                return prev; // Return unchanged state
            }

            return prev.map(toast => {
                if (toast.id === id) {
                    console.log('[ToastContext] updateToast - Found toast to update:', toast.id);

                    // Clear existing timeout
                    const existingTimeout = timeoutRefs.current.get(id);
                    if (existingTimeout) {
                        console.log('[ToastContext] Clearing existing timeout for toast:', id);
                        clearTimeout(existingTimeout);
                        timeoutRefs.current.delete(id);
                    }

                    // Update toast
                    const updatedToast = { ...toast, ...updates };
                    console.log('[ToastContext] Updated toast:', updatedToast);

                    // Set new timeout if duration is provided
                    if (updates.duration && updates.duration > 0 && !updatedToast.persistent) {
                        console.log('[ToastContext] Setting new timeout for toast:', id, 'duration:', updates.duration);
                        const timeout = setTimeout(() => {
                            console.log('[ToastContext] Auto-hiding toast after timeout:', id);

                            // Clear active notification for message toasts
                            if (updatedToast.type === 'message' && updatedToast.conversationData) {
                                try {
                                    const { useNotificationStore } = require('../store/notificationStore');
                                    const notificationStore = useNotificationStore.getState();
                                    notificationStore.removeActiveNotification(updatedToast.conversationData.id);
                                    console.log('[ToastContext] Cleared active notification for conversation:', updatedToast.conversationData.id);
                                } catch (error) {
                                    console.error('[ToastContext] Failed to clear active notification:', error);
                                }
                            }

                            hideToast(id);
                        }, updates.duration);
                        timeoutRefs.current.set(id, timeout);
                    }

                    return updatedToast;
                }
                return toast;
            });
        });
    }, [hideToast, toasts]);

    // Convenience methods
    const success = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'success',
            title,
            message,
            duration: 2500,
            ...options
        });
    }, [showToast]);

    const error = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'error',
            title,
            message,
            duration: 4000,
            ...options
        });
    }, [showToast]);

    const warning = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'warning',
            title,
            message,
            duration: 3500,
            ...options
        });
    }, [showToast]);

    const info = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'info',
            title,
            message,
            duration: 2500,
            ...options
        });
    }, [showToast]);

    const loading = useCallback((title: string, message?: string): string => {
        return showToast({
            type: 'loading',
            title,
            message,
            persistent: true,
            duration: 0
        });
    }, [showToast]);

    const contextValue: ToastContextType = {
        toasts,
        showToast,
        hideToast,
        updateToast,
        hideAllToasts,
        success,
        error,
        warning,
        info,
        loading,
        hideLoading,
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

