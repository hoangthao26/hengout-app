import { create } from 'zustand';

/**
 * Global App State Management
 * 
 * Enterprise Features:
 * - Centralized initialization state
 * - Service readiness tracking
 * - App lifecycle management
 * - Error state handling
 */
interface AppState {
    // Initialization states
    isDatabaseReady: boolean;
    isAuthReady: boolean;
    isLocationReady: boolean;
    isServicesReady: boolean;
    isAppReady: boolean;
    
    // Error states
    initializationError: string | null;
    
    // Actions
    setDatabaseReady: (ready: boolean) => void;
    setAuthReady: (ready: boolean) => void;
    setLocationReady: (ready: boolean) => void;
    setServicesReady: (ready: boolean) => void;
    setAppReady: (ready: boolean) => void;
    setInitializationError: (error: string | null) => void;
    
    // Computed getters
    getInitializationProgress: () => number;
    getInitializationStatus: () => string;
}

export const useAppStore = create<AppState>((set, get) => ({
    // Initial states
    isDatabaseReady: false,
    isAuthReady: false,
    isLocationReady: false,
    isServicesReady: false,
    isAppReady: false,
    initializationError: null,
    
    // Actions
    setDatabaseReady: (ready) => set({ isDatabaseReady: ready }),
    setAuthReady: (ready) => set({ isAuthReady: ready }),
    setLocationReady: (ready) => set({ isLocationReady: ready }),
    setServicesReady: (ready) => set({ isServicesReady: ready }),
    setAppReady: (ready) => set({ isAppReady: ready }),
    setInitializationError: (error) => set({ initializationError: error }),
    
    // Computed getters
    getInitializationProgress: () => {
        const state = get();
        const total = 4; // Database, Auth, Location, Services
        let completed = 0;
        
        if (state.isDatabaseReady) completed++;
        if (state.isAuthReady) completed++;
        if (state.isLocationReady) completed++;
        if (state.isServicesReady) completed++;
        
        return (completed / total) * 100;
    },
    
    getInitializationStatus: () => {
        const state = get();
        
        if (state.initializationError) {
            return `Error: ${state.initializationError}`;
        }
        
        if (state.isAppReady) {
            return 'Ready';
        }
        
        const progress = state.getInitializationProgress();
        return `Initializing... ${Math.round(progress)}%`;
    }
}));
