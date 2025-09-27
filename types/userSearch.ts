// User Search Service Types
import { SearchUser } from './social';

export interface SearchResponse {
    status: string;
    data: {
        totalElements: number;
        totalPages: number;
        size: number;
        content: SearchUser[];
        number: number;
        numberOfElements: number;
        first: boolean;
        last: boolean;
        empty: boolean;
    };
    message: string;
    errorCode?: number;
}

export interface SearchParams {
    query: string;
    page?: number;
    size?: number;
}
