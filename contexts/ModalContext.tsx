import React, { createContext, ReactNode, useContext, useState } from 'react';
import { LocationFolder } from '../types/locationFolder';
import { LocationDetails } from '../types/location';

// Enhanced types for enterprise-level type safety
type ModalType = 'create-collection' | 'delete-collections' | 'create-group' | 'location-detail' | 'save-location' | 'filter-vibes';

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

    // Location Detail Modal
    showLocationDetailModal: boolean;
    setShowLocationDetailModal: (show: boolean) => void;
    locationDetailModalData: LocationDetails | null;
    setLocationDetailModalData: (location: LocationDetails | null) => void;
    openLocationDetailModal: (location: LocationDetails, onSuccess?: () => void) => void;
    closeLocationDetailModal: () => void;
    onLocationDetailSuccess?: () => void;
    setOnLocationDetailSuccess: (callback?: () => void) => void;

    // Save Location Modal
    showSaveLocationModal: boolean;
    setShowSaveLocationModal: (show: boolean) => void;
    saveLocationModalData: LocationDetails | null;
    setSaveLocationModalData: (location: LocationDetails | null) => void;
    openSaveLocationModal: (location: LocationDetails, onSuccess?: () => void) => void;
    closeSaveLocationModal: () => void;
    onSaveLocationSuccess?: () => void;
    setOnSaveLocationSuccess: (callback?: () => void) => void;

    // Filter Vibes Modal
    showFilterVibesModal: boolean;
    setShowFilterVibesModal: (show: boolean) => void;
    openFilterVibesModal: (onApply?: (filters: { categories?: string[]; purposes?: string[]; tags?: string[] }) => void) => void;
    closeFilterVibesModal: () => void;
    onFilterVibesApply?: (filters: { categories?: string[]; purposes?: string[]; tags?: string[] }) => void;
    setOnFilterVibesApply: (callback?: (filters: { categories?: string[]; purposes?: string[]; tags?: string[] }) => void) => void;
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
        'create-group': { isVisible: false },
        'location-detail': { isVisible: false, data: null },
        'save-location': { isVisible: false, data: null },
        'filter-vibes': { isVisible: false, data: null }
    });

    // Legacy state for backward compatibility
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showLocationDetailModal, setShowLocationDetailModal] = useState(false);
    const [showSaveLocationModal, setShowSaveLocationModal] = useState(false);
    const [showFilterVibesModal, setShowFilterVibesModal] = useState(false);
    const [deleteModalCollections, setDeleteModalCollections] = useState<LocationFolder[]>([]);
    const [locationDetailModalData, setLocationDetailModalData] = useState<LocationDetails | null>(null);
    const [saveLocationModalData, setSaveLocationModalData] = useState<LocationDetails | null>(null);
    const [onCreateSuccess, setOnCreateSuccess] = useState<(() => void) | undefined>();
    const [onDeleteSuccess, setOnDeleteSuccess] = useState<(() => void) | undefined>();
    const [onCreateGroupSuccess, setOnCreateGroupSuccess] = useState<(() => void) | undefined>();
    const [onLocationDetailSuccess, setOnLocationDetailSuccess] = useState<(() => void) | undefined>();
    const [onSaveLocationSuccess, setOnSaveLocationSuccess] = useState<(() => void) | undefined>();
    const [onFilterVibesApply, setOnFilterVibesApply] = useState<((filters: { categories?: string[]; purposes?: string[]; tags?: string[] }) => void) | undefined>();

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

    // Location Detail Modal helpers
    const openLocationDetailModal = (location: LocationDetails, onSuccess?: () => void) => {
        console.log('Opening LocationDetailModal for:', location.name);

        // Prevent opening if already visible
        if (showLocationDetailModal) {
            console.log('Modal already visible, closing first');
            closeLocationDetailModal();
            // Wait a bit longer before opening new one
            setTimeout(() => {
                setLocationDetailModalData(location);
                setOnLocationDetailSuccess(() => onSuccess);
                setShowLocationDetailModal(true);
            }, 300);
            return;
        }

        // Close first to ensure clean state
        setShowLocationDetailModal(false);
        setLocationDetailModalData(null);
        setOnLocationDetailSuccess(undefined);

        // Set data and open with minimal delay
        setTimeout(() => {
            setLocationDetailModalData(location);
            setOnLocationDetailSuccess(() => onSuccess);
            setShowLocationDetailModal(true);
        }, 100);
    };

    const closeLocationDetailModal = () => {
        console.log('Closing LocationDetailModal');
        setShowLocationDetailModal(false);
        // Clear data after a short delay to prevent flicker
        setTimeout(() => {
            setLocationDetailModalData(null);
            setOnLocationDetailSuccess(undefined);
        }, 200);
    };

    // Save Location Modal helpers
    const openSaveLocationModal = (location: LocationDetails, onSuccess?: () => void) => {
        console.log('[ModalContext] Opening SaveLocationModal for:', {
            locationId: location.id,
            locationName: location.name,
            locationAddress: location.address,
            hasOnSuccess: !!onSuccess,
            timestamp: new Date().toISOString()
        });

        // Prevent opening if already visible
        if (showSaveLocationModal) {
            console.log('[ModalContext] SaveLocationModal already visible, closing first');
            closeSaveLocationModal();
            // Wait a bit longer before opening new one
            setTimeout(() => {
                setSaveLocationModalData(location);
                setOnSaveLocationSuccess(() => onSuccess);
                setShowSaveLocationModal(true);
                console.log('[ModalContext] SaveLocationModal reopened after delay');
            }, 300);
            return;
        }

        // Close first to ensure clean state
        setShowSaveLocationModal(false);
        setSaveLocationModalData(null);
        setOnSaveLocationSuccess(undefined);

        // Set data and open with minimal delay
        setTimeout(() => {
            setSaveLocationModalData(location);
            setOnSaveLocationSuccess(() => onSuccess);
            setShowSaveLocationModal(true);
            console.log('[ModalContext] SaveLocationModal opened with data');
        }, 100);
    };

    const closeSaveLocationModal = () => {
        console.log('[ModalContext] Closing SaveLocationModal');
        setShowSaveLocationModal(false);
        // Clear data after a short delay to prevent flicker
        setTimeout(() => {
            setSaveLocationModalData(null);
            setOnSaveLocationSuccess(undefined);
            console.log('[ModalContext] SaveLocationModal data cleared');
        }, 200);
    };

    // Filter Vibes Modal helpers
    const openFilterVibesModal = (onApply?: (filters: { categories?: string[]; purposes?: string[]; tags?: string[] }) => void) => {
        // Prevent opening if already visible
        if (showFilterVibesModal) {
            setShowFilterVibesModal(false);
            setTimeout(() => {
                setOnFilterVibesApply(() => onApply);
                setShowFilterVibesModal(true);
            }, 300);
            return;
        }

        setShowFilterVibesModal(false);
        setOnFilterVibesApply(undefined);

        setTimeout(() => {
            setOnFilterVibesApply(() => onApply);
            setShowFilterVibesModal(true);
        }, 100);
    };

    const closeFilterVibesModal = () => {
        setShowFilterVibesModal(false);
        setTimeout(() => {
            setOnFilterVibesApply(undefined);
        }, 200);
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
        showLocationDetailModal,
        setShowLocationDetailModal,
        locationDetailModalData,
        setLocationDetailModalData,
        openLocationDetailModal,
        closeLocationDetailModal,
        onLocationDetailSuccess,
        setOnLocationDetailSuccess,
        showSaveLocationModal,
        setShowSaveLocationModal,
        saveLocationModalData,
        setSaveLocationModalData,
        openSaveLocationModal,
        closeSaveLocationModal,
        onSaveLocationSuccess,
        setOnSaveLocationSuccess,

        // Filter Vibes Modal
        showFilterVibesModal,
        setShowFilterVibesModal,
        openFilterVibesModal,
        closeFilterVibesModal,
        onFilterVibesApply,
        setOnFilterVibesApply,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};
