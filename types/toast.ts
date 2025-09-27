export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastPosition = 'top' | 'bottom';

export interface ToastAction {
    label: string;
    onPress: () => void;
}

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    position?: ToastPosition;
    action?: ToastAction;
    persistent?: boolean; // For loading toasts
}

export interface ToastOptions {
    duration?: number;
    position?: ToastPosition;
    action?: ToastAction;
    persistent?: boolean;
}

export interface ToastContextType {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'>) => string;
    hideToast: (id: string) => void;
    hideAllToasts: () => void;
    success: (title: string, message?: string, options?: ToastOptions) => string;
    error: (title: string, message?: string, options?: ToastOptions) => string;
    warning: (title: string, message?: string, options?: ToastOptions) => string;
    info: (title: string, message?: string, options?: ToastOptions) => string;
    loading: (title: string, message?: string) => string;
    hideLoading: () => void;
}

