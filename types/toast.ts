export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'message';

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
    onPress?: () => void; // Click handler for entire toast
    persistent?: boolean; // For loading toasts
    conversationData?: any; // For message toasts
    messageData?: any; // For message toasts
}

export interface ToastOptions {
    duration?: number;
    position?: ToastPosition;
    action?: ToastAction;
    onPress?: () => void; // Click handler for entire toast
    persistent?: boolean;
    conversationData?: any; // For message toasts
    messageData?: any; // For message toasts
}

export interface ToastContextType {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
    hideToast: (id: string) => void;
    updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
    hideAllToasts: () => void;
    success: (title: string, message?: string, options?: ToastOptions) => string;
    error: (title: string, message?: string, options?: ToastOptions) => string;
    warning: (title: string, message?: string, options?: ToastOptions) => string;
    info: (title: string, message?: string, options?: ToastOptions) => string;
    loading: (title: string, message?: string) => string;
    hideLoading: () => void;
}

