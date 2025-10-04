import axiosInstance from '../config/axios';
import { buildEndpointUrl, SERVICES_CONFIG } from '../config/services';
import { AddLocationToFolderRequest, ApiResponse, CreateFolderRequest, LocationFolder, LocationInFolder, PaginatedLocationInFolder, UpdateFolderRequest, UpdateLocationInFolderRequest } from '../types/locationFolder';

class LocationFolderService {
    private readonly baseUrl = SERVICES_CONFIG.USER_SERVICE.BASE_URL;

    /**
     * Get all folders for a user
     * GET /api/v1/folder
     */
    async getAllFolders(): Promise<ApiResponse<LocationFolder[]>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'GET_ALL_FOLDERS');
            const response = await axiosInstance.get<ApiResponse<LocationFolder[]>>(endpoint);
            return response.data;
        } catch (error: any) {
            // 🚀 DEFENSIVE: Check if error is due to user logout
            if (error.message?.includes('User logged out')) {
                console.log('ℹ️ [LocationFolderService] User logged out, skipping folder fetch');
                return { status: 'success', data: [], message: 'User logged out' };
            }
            console.error('Failed to get all folders:', error);
            throw error;
        }
    }

    /**
     * Get folder details by ID
     * GET /api/v1/folder/{folderId}
     */
    async getFolderById(folderId: string): Promise<ApiResponse<LocationFolder>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'GET_FOLDER_BY_ID').replace(':folderId', folderId);
            const response = await axiosInstance.get<ApiResponse<LocationFolder>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new location folder
     * POST /api/v1/folder
     */
    async createFolder(folderData: CreateFolderRequest): Promise<ApiResponse<LocationFolder>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'CREATE_FOLDER');
            const response = await axiosInstance.post<ApiResponse<LocationFolder>>(endpoint, folderData);
            return response.data;
        } catch (error: any) {
            console.error('Failed to create folder:', error);
            throw error;
        }
    }

    /**
     * Update an existing location folder
     * PUT /api/v1/folder/{folderId}
     */
    async updateFolder(folderId: string, folderData: UpdateFolderRequest): Promise<ApiResponse<LocationFolder>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'UPDATE_FOLDER').replace(':folderId', folderId);
            const response = await axiosInstance.put<ApiResponse<LocationFolder>>(endpoint, folderData);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to update folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Delete a location folder
     * DELETE /api/v1/folder/{folderId}
     */
    async deleteFolder(folderId: string): Promise<ApiResponse<{}>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'DELETE_FOLDER').replace(':folderId', folderId);
            const response = await axiosInstance.delete<ApiResponse<{}>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to delete folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Get all locations in a folder with pagination
     * GET /api/v1/folder/{folderId}/locations
     */
    async getLocationsInFolder(
        folderId: string,
        page: number = 0,
        size: number = 20,
        sort: string = 'createdAt',
        direction: string = 'desc'
    ): Promise<ApiResponse<PaginatedLocationInFolder>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'GET_LOCATIONS_IN_FOLDER').replace(':folderId', folderId);
            const response = await axiosInstance.get<ApiResponse<PaginatedLocationInFolder>>(endpoint, {
                params: { page, size, sort, direction }
            });
            return response.data;
        } catch (error: any) {
            console.error(`Failed to get locations in folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Add a location to folder
     * POST /api/v1/folder/{folderId}/locations
     */
    async addLocationToFolder(folderId: string, locationData: AddLocationToFolderRequest): Promise<ApiResponse<{}>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'ADD_LOCATION_TO_FOLDER').replace(':folderId', folderId);
            const response = await axiosInstance.post<ApiResponse<{}>>(endpoint, locationData);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to add location to folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Update a location in folder
     * PUT /api/v1/folder/{folderId}/locations/{locationId}
     */
    async updateLocationInFolder(folderId: string, locationId: string, locationData: UpdateLocationInFolderRequest): Promise<ApiResponse<{}>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'UPDATE_LOCATION_IN_FOLDER')
                .replace(':folderId', folderId)
                .replace(':locationId', locationId);
            const response = await axiosInstance.put<ApiResponse<{}>>(endpoint, locationData);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to update location ${locationId} in folder ${folderId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a location from folder
     * DELETE /api/v1/folder/{folderId}/locations/{locationId}
     */
    async removeLocationFromFolder(folderId: string, locationId: string): Promise<ApiResponse<{}>> {
        try {
            const endpoint = buildEndpointUrl('USER_SERVICE', 'REMOVE_LOCATION_FROM_FOLDER')
                .replace(':folderId', folderId)
                .replace(':locationId', locationId);
            const response = await axiosInstance.delete<ApiResponse<{}>>(endpoint);
            return response.data;
        } catch (error: any) {
            console.error(`Failed to remove location ${locationId} from folder ${folderId}:`, error);
            throw error;
        }
    }

    // Utility methods for common operations

    /**
     * Get folders with their location counts
     */
    async getFoldersWithLocationCounts(): Promise<Array<LocationFolder & { locationCount: number }>> {
        try {
            const foldersResponse = await this.getAllFolders();
            const folders = foldersResponse.data;

            // Get location count for each folder
            const foldersWithCounts = await Promise.all(
                folders.map(async (folder) => {
                    try {
                        const locationsResponse = await this.getLocationsInFolder(folder.id);
                        return {
                            ...folder,
                            locationCount: locationsResponse.data.totalElements
                        };
                    } catch (error) {
                        console.warn(`Failed to get location count for folder ${folder.id}:`, error);
                        return {
                            ...folder,
                            locationCount: 0
                        };
                    }
                })
            );

            return foldersWithCounts;
        } catch (error: any) {
            console.error('Failed to get folders with location counts:', error);
            throw error;
        }
    }

    /**
     * Check if a location exists in a folder
     */
    async isLocationInFolder(folderId: string, locationId: string): Promise<boolean> {
        try {
            const locationsResponse = await this.getLocationsInFolder(folderId);
            return locationsResponse.data.content.some(location => location.locationId === locationId);
        } catch (error: any) {
            console.error(`Failed to check if location ${locationId} is in folder ${folderId}:`, error);
            return false;
        }
    }

    /**
     * Get default folder (if exists)
     */
    async getDefaultFolder(): Promise<LocationFolder | null> {
        try {
            const foldersResponse = await this.getAllFolders();
            const defaultFolder = foldersResponse.data.find(folder => folder.isDefault);
            return defaultFolder || null;
        } catch (error: any) {
            console.error('Failed to get default folder:', error);
            return null;
        }
    }
}

export const locationFolderService = new LocationFolderService();
export default locationFolderService;
