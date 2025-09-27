import { create } from 'zustand';
import { LocationFolder } from '../types/locationFolder';

interface CollectionState {
    // Collections list (for profile page)
    collections: LocationFolder[];
    loading: boolean;
    error: string | null;

    // Current collection details (for detail page)
    currentCollection: LocationFolder | null;
    currentCollectionLoading: boolean;
    currentCollectionError: string | null;

    // Actions for collections list
    setCollections: (collections: LocationFolder[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    addCollection: (collection: LocationFolder) => void;
    updateCollection: (id: string, updates: Partial<LocationFolder>) => void;
    removeCollection: (id: string) => void;

    // Actions for current collection
    setCurrentCollection: (collection: LocationFolder | null) => void;
    setCurrentCollectionLoading: (loading: boolean) => void;
    setCurrentCollectionError: (error: string | null) => void;
    updateCurrentCollection: (updates: Partial<LocationFolder>) => void;

    // Reset functions
    resetCollections: () => void;
    resetCurrentCollection: () => void;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
    // Initial state
    collections: [],
    loading: false,
    error: null,
    currentCollection: null,
    currentCollectionLoading: false,
    currentCollectionError: null,

    // Collections list actions
    setCollections: (collections) => set({ collections }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addCollection: (collection) => set((state) => ({
        collections: [collection, ...state.collections]
    })),

    updateCollection: (id, updates) => set((state) => ({
        collections: state.collections.map(collection =>
            collection.id === id ? { ...collection, ...updates } : collection
        )
    })),

    removeCollection: (id) => set((state) => ({
        collections: state.collections.filter(collection => collection.id !== id)
    })),

    // Current collection actions
    setCurrentCollection: (collection) => set({ currentCollection: collection }),
    setCurrentCollectionLoading: (loading) => set({ currentCollectionLoading: loading }),
    setCurrentCollectionError: (error) => set({ currentCollectionError: error }),

    updateCurrentCollection: (updates) => set((state) => ({
        currentCollection: state.currentCollection
            ? { ...state.currentCollection, ...updates }
            : null
    })),

    // Reset functions
    resetCollections: () => set({
        collections: [],
        loading: false,
        error: null
    }),

    resetCurrentCollection: () => set({
        currentCollection: null,
        currentCollectionLoading: false,
        currentCollectionError: null
    })
}));
