// Preference Service Types
export interface UserPreferences {
    categoryTerms: string[];
    purposeTerms: string[];
    tagTerms: string[];
}

export interface PreferenceResponse {
    status: string;
    data: UserPreferences;
    message: string;
}
