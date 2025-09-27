// Export all stores
export { useAuthStore } from './authStore';
export { usePreferencesStore } from './preferencesStore';
export { useProfileStore } from './profileStore';
export { useSearchStore } from './searchStore';
export { useUIStore } from './uiStore';

// Export types
export type { AuthState, User } from './authStore';
export type { PreferencesState } from './preferencesStore';
export type { ProfileState } from './profileStore';
export type { SearchFilters, SearchState } from './searchStore';
export type { LoadingState, ModalState, UIState } from './uiStore';

