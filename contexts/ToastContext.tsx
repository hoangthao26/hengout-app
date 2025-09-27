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

    const showToast = useCallback((toastData: Omit<Toast, 'id'>): string => {
        const id = generateId();
        const toast: Toast = {
            id,
            duration: 4000, // Default 4 seconds
            position: 'top',
            persistent: false,
            ...toastData,
        };

        setToasts(prev => [...prev, toast]);

        // Auto hide after duration (unless persistent)
        if (!toast.persistent && toast.duration && toast.duration > 0) {
            const timeout = setTimeout(() => {
                hideToast(id);
            }, toast.duration);

            timeoutRefs.current.set(id, timeout);
        }

        return id;
    }, [generateId, hideToast]);

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

    // Convenience methods
    const success = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'success',
            title,
            message,
            duration: 2000, // Giảm từ 3s xuống 2s
            ...options
        });
    }, [showToast]);

    const error = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'error',
            title,
            message,
            duration: 3000, // Giảm từ 5s xuống 3s
            ...options
        });
    }, [showToast]);

    const warning = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'warning',
            title,
            message,
            duration: 2500, // Giảm từ 4s xuống 2.5s
            ...options
        });
    }, [showToast]);

    const info = useCallback((title: string, message?: string, options?: ToastOptions): string => {
        return showToast({
            type: 'info',
            title,
            message,
            duration: 2000, // Giảm từ 3s xuống 2s
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

