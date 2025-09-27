// Location Folder Types
export interface LocationFolder {
    id: string;
    name: string;
    description: string;
    visibility: 'PRIVATE' | 'PUBLIC';
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LocationInFolder {
    id: string;
    locationId: string;
    locationName: string;
    address: string;
    imageUrl: string;
    note: string;
    addedAt: string;
    updatedAt: string;
}

// API Request Types
export interface CreateFolderRequest {
    name: string;
    description: string;
    visibility: 'PRIVATE' | 'PUBLIC';
}

export interface UpdateFolderRequest {
    name: string;
    description: string;
    visibility: 'PRIVATE' | 'PUBLIC';
}

export interface AddLocationToFolderRequest {
    locationId: string;
}

export interface UpdateLocationInFolderRequest {
    note: string;
}

// API Response Types
export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    data: T;
    message: string;
    errorCode?: number;
}

export interface FolderListResponse {
    folders: LocationFolder[];
}

export interface LocationListResponse {
    locations: LocationInFolder[];
}

// Error Types
export interface LocationFolderApiError {
    status: 'error';
    message: string;
    errorCode: number;
    data?: any;
}
