import React, { createContext, ReactNode, useContext, useState } from 'react';
import { LocationFolder } from '../types/locationFolder';

// Enhanced types for enterprise-level type safety
type ModalType = 'create-collection' | 'delete-collections' | 'create-group';

interface ModalState {
    isVisible: boolean;
    data?: any;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

interface ModalContextType {
    // Generic modal management
    modals: Record<ModalType, ModalState>;

    // Modal actions
    openModal: (type: ModalType, data?: any, callbacks?: { onSuccess?: () => void; onError?: (error: Error) => void }) => void;
    closeModal: (type: ModalType) => void;
    closeAllModals: () => void;

    // Specific modal helpers (for backward compatibility)
    showCreateModal: boolean;
    setShowCreateModal: (show: boolean) => void;
    showDeleteModal: boolean;
    setShowDeleteModal: (show: boolean) => void;
    showCreateGroupModal: boolean;
    setShowCreateGroupModal: (show: boolean) => void;
    deleteModalCollections: LocationFolder[];
    setDeleteModalCollections: (collections: LocationFolder[]) => void;
    openCreateModal: () => void;
    closeCreateModal: () => void;
    openDeleteModal: (collections: LocationFolder[]) => void;
    closeDeleteModal: () => void;
    openCreateGroupModal: () => void;
    closeCreateGroupModal: () => void;

    // Success callbacks
    onCreateSuccess?: () => void;
    setOnCreateSuccess: (callback?: () => void) => void;
    onDeleteSuccess?: () => void;
    setOnDeleteSuccess: (callback?: () => void) => void;
    onCreateGroupSuccess?: () => void;
    setOnCreateGroupSuccess: (callback?: () => void) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

interface ModalProviderProps {
    children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    // Enhanced state management with proper typing
    const [modals, setModals] = useState<Record<ModalType, ModalState>>({
        'create-collection': { isVisible: false },
        'delete-collections': { isVisible: false, data: [] },
        'create-group': { isVisible: false }
    });

    // Legacy state for backward compatibility
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [deleteModalCollections, setDeleteModalCollections] = useState<LocationFolder[]>([]);
    const [onCreateSuccess, setOnCreateSuccess] = useState<(() => void) | undefined>();
    const [onDeleteSuccess, setOnDeleteSuccess] = useState<(() => void) | undefined>();
    const [onCreateGroupSuccess, setOnCreateGroupSuccess] = useState<(() => void) | undefined>();

    // Generic modal management (Enterprise approach)
    const openModal = (type: ModalType, data?: any, callbacks?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
        setModals(prev => ({
            ...prev,
            [type]: {
                isVisible: false, // Close first
                data,
                onSuccess: callbacks?.onSuccess,
                onError: callbacks?.onError
            }
        }));

        // Delayed open for smooth animation
        setTimeout(() => {
            setModals(prev => ({
                ...prev,
                [type]: { ...prev[type], isVisible: true }
            }));
        }, 150);
    };

    const closeModal = (type: ModalType) => {
        setModals(prev => ({
            ...prev,
            [type]: { isVisible: false, data: undefined, onSuccess: undefined, onError: undefined }
        }));
    };

    const closeAllModals = () => {
        setModals(prev => {
            const newModals = { ...prev };
            Object.keys(newModals).forEach(key => {
                newModals[key as ModalType] = { isVisible: false, data: undefined, onSuccess: undefined, onError: undefined };
            });
            return newModals;
        });
    };

    // Legacy methods for backward compatibility
    const openCreateModal = () => {
        setShowCreateModal(false);
        setTimeout(() => {
            setShowCreateModal(true);
        }, 150);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
    };

    const openDeleteModal = (collections: LocationFolder[]) => {
        setDeleteModalCollections(collections);
        setShowDeleteModal(false);
        setTimeout(() => {
            setShowDeleteModal(true);
        }, 150);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeleteModalCollections([]);
    };

    const openCreateGroupModal = () => {
        setShowCreateGroupModal(false);
        setTimeout(() => {
            setShowCreateGroupModal(true);
        }, 150);
    };

    const closeCreateGroupModal = () => {
        setShowCreateGroupModal(false);
    };

    const value: ModalContextType = {
        // Generic modal management
        modals,
        openModal,
        closeModal,
        closeAllModals,

        // Legacy properties for backward compatibility
        showCreateModal,
        setShowCreateModal,
        showDeleteModal,
        setShowDeleteModal,
        showCreateGroupModal,
        setShowCreateGroupModal,
        deleteModalCollections,
        setDeleteModalCollections,
        openCreateModal,
        closeCreateModal,
        openDeleteModal,
        closeDeleteModal,
        openCreateGroupModal,
        closeCreateGroupModal,
        onCreateSuccess,
        setOnCreateSuccess,
        onDeleteSuccess,
        setOnDeleteSuccess,
        onCreateGroupSuccess,
        setOnCreateGroupSuccess,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};
