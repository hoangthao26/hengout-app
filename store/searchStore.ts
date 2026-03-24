import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { userSearchService } from '../services/userSearchService';
import { SearchUser } from '../types/social';

// Types
export interface SearchFilters {
    query?: string;
    ageRange?: {
        min: number;
        max: number;
    };
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    location?: {
        latitude: number;
        longitude: number;
        radius: number; // in km
    };
    interests?: string[];
    sortBy?: 'distance' | 'age' | 'recent';
    sortOrder?: 'asc' | 'desc';
}

export interface SearchState {
    // State
    searchResults: SearchUser[];
    searchFilters: SearchFilters;
    isLoading: boolean;
    isSearching: boolean;
    error: string | null;
    hasMore: boolean;
    currentPage: number;
    totalResults: number;

    // Actions
    searchUsers: (query: string, page?: number, size?: number) => Promise<void>;
    loadMoreResults: () => Promise<void>;
    clearSearch: () => void;
    updateFilters: (filters: Partial<SearchFilters>) => void;
    setLoading: (loading: boolean) => void;
    clearError: () => void;
}

export const useSearchStore = create<SearchState>()(
    persist(
        (set, get) => ({
            // Initial state
            searchResults: [],
            searchFilters: {
                sortBy: 'distance',
                sortOrder: 'asc',
            },
            isLoading: false,
            isSearching: false,
            error: null,
            hasMore: false,
            currentPage: 0,
            totalResults: 0,

            /**
             * Search users with pagination support
             * 
             * Search flow:
             * 1. Sets loading state (isSearching = true) before API call
             * 2. Calls search API with query, page, and size parameters
             * 3. Updates results based on response structure:
             *    - content: Array of search results
             *    - last: Boolean indicating if last page (hasMore = !last)
             *    - totalElements: Total count of results
             * 4. Handles pagination state for infinite scroll
             * 
             * Pagination logic:
             * - page=0: Initial search (replaces all results)
             * - page>0: Load more (should append to existing results, but current impl replaces)
             * - hasMore: Calculated from response.data.last flag
             * 
             * Error handling:
             * - Sets error state on failure
             * - Preserves previous results on error (doesn't clear)
             * - Throws error for caller to handle
             * 
             * @param query - Search query string
             * @param page - Page number (0-indexed), default 0
             * @param size - Page size, default 20
             */
            searchUsers: async (query: string, page = 0, size = 20) => {
                try {
                    set({
                        isSearching: true,
                        error: null,
                        currentPage: page,
                    });

                    const response = await userSearchService.searchUsers({
                        query,
                        page,
                        size,
                    });

                    set({
                        searchResults: response.data.content || [],
                        hasMore: !response.data.last, // Pagination: more pages if not last
                        totalResults: response.data.totalElements || 0,
                        isSearching: false,
                    });
                } catch (error: any) {
                    set({
                        error: error.message || 'Search failed',
                        isSearching: false,
                    });
                    throw error;
                }
            },

            loadMoreResults: async () => {
                try {
                    const { currentPage, hasMore, searchResults } = get();

                    if (!hasMore || get().isSearching) return;

                    set({ isSearching: true, error: null });

                    const nextPage = currentPage + 1;
                    // Note: This would need the current query to work properly
                    // For now, we'll just return as this needs to be implemented
                    set({ isSearching: false });
                } catch (error: any) {
                    set({
                        error: error.message || 'Failed to load more results',
                        isSearching: false,
                    });
                    throw error;
                }
            },

            clearSearch: () => {
                set({
                    searchResults: [],
                    currentPage: 0,
                    hasMore: false,
                    totalResults: 0,
                    error: null,
                });
            },

            updateFilters: (filters) => {
                set({
                    searchFilters: { ...get().searchFilters, ...filters },
                });
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            clearError: () => {
                set({ error: null });
            },

        }),
        {
            name: 'search-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                searchFilters: state.searchFilters,
            }),
        }
    )
);
