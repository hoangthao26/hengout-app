// ============================================================================
// ONBOARDING TERMS DATA
// ============================================================================

export interface Term {
    id: string;
    label: string;
    description?: string;
}

// Category Terms - What users are interested in (Simplified)
export const CATEGORY_TERMS: Term[] = [
    { id: 'cafe', label: 'Cafe', description: 'Quán cafe, coffee shop' },
    { id: 'restaurant', label: 'Nhà hàng', description: 'Nhà hàng ăn uống' },
    { id: 'fast_food', label: 'Đồ ăn nhanh', description: 'Thức ăn nhanh, tiện lợi' },
    { id: 'street_food', label: 'Đồ ăn đường phố', description: 'Món ăn vặt, quán vỉa hè' },
    { id: 'seafood', label: 'Hải sản', description: 'Nhà hàng hải sản' },
    { id: 'dessert', label: 'Tráng miệng', description: 'Bánh ngọt, kem, chè' }
];

// Purpose Terms - What users want to achieve (Simplified)
export const PURPOSE_TERMS: Term[] = [
    { id: 'meet_friends', label: 'Gặp gỡ bạn bè', description: 'Hẹn hò, tụ tập bạn bè' },
    { id: 'family_gathering', label: 'Họp gia đình', description: 'Tụ tập gia đình, sinh nhật' },
    { id: 'team_work', label: 'Làm việc nhóm', description: 'Họp hành, làm việc cùng nhau' },
    { id: 'relax', label: 'Thư giãn', description: 'Nghỉ ngơi, thư giãn tinh thần' },
    { id: 'date', label: 'Hẹn hò', description: 'Hẹn hò lãng mạn' },
    { id: 'celebration', label: 'Tổ chức tiệc', description: 'Sinh nhật, kỷ niệm' }
];

// Tag Terms - User preferences and characteristics (Simplified)
export const TAG_TERMS: Term[] = [
    { id: 'parking_lot', label: 'Bãi đỗ xe rộng', description: 'Có chỗ đậu xe thoải mái' },
    { id: 'good_coffee', label: 'Cà phê ngon', description: 'Cà phê chất lượng cao' },
    { id: 'chill', label: 'Chill', description: 'Không gian thoải mái, thư giãn' },
    { id: 'comfortable_seating', label: 'Chỗ ngồi thoải mái', description: 'Ghế ngồi êm ái, rộng rãi' },
    { id: 'affordable', label: 'Giá hợp lý', description: 'Giá cả phải chăng' },
    { id: 'spacious', label: 'Không gian rộng', description: 'Không gian rộng rãi' },
    { id: 'wifi', label: 'WiFi miễn phí', description: 'Có WiFi tốt' },
    { id: 'air_conditioning', label: 'Máy lạnh', description: 'Có điều hòa nhiệt độ' }
];

// Helper functions
export const getTermById = (terms: Term[], id: string): Term | undefined => {
    return terms.find(term => term.id === id);
};

export const getTermsByIds = (terms: Term[], ids: string[]): Term[] => {
    return terms.filter(term => ids.includes(term.id));
};

export const getTermLabels = (terms: Term[]): string[] => {
    return terms.map(term => term.label);
};

export const getTermIds = (terms: Term[]): string[] => {
    return terms.map(term => term.id);
};
