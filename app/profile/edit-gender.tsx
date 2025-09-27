import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { useProfileStore } from '../../store';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export default function EditGenderScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const router = useRouter();

    // Zustand store
    const { profile, isLoading, isUpdating, fetchProfile, updateProfile } = useProfileStore();

    const [selectedGender, setSelectedGender] = useState<Gender>('MALE');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCurrentGender();
    }, []);

    const loadCurrentGender = async () => {
        try {
            setLoading(true);
            // Use Zustand store instead of direct API call
            if (!profile) {
                await fetchProfile();
            }
            setSelectedGender(profile?.gender || 'MALE');
        } catch (error: any) {
            console.error('Failed to load profile:', error);
            showError('Failed to load profile',);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Use Zustand store instead of direct API call
            await updateProfile({
                gender: selectedGender,
            });
            showSuccess('Giới tính đã được cập nhật!',);
            router.back();
        } catch (error: any) {
            console.error('Failed to update gender:', error);
            showError('Không thể cập nhật giới tính',);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const genderOptions = [
        { value: 'MALE' as Gender, label: 'Nam' },
        { value: 'FEMALE' as Gender, label: 'Nữ' },
        { value: 'OTHER' as Gender, label: 'Khác' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                    <Text style={[styles.headerButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Hủy
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Giới tính
                </Text>

                <TouchableOpacity
                    onPress={handleSave}
                    style={styles.headerButton}
                    disabled={saving}
                >
                    <Text style={[
                        styles.headerButtonText,
                        {
                            color: saving
                                ? (isDark ? '#6B7280' : '#9CA3AF')
                                : '#F48C06',
                            fontWeight: '600'
                        }
                    ]}>
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.optionsContainer}>
                    {genderOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.optionRow,
                                { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }
                            ]}
                            onPress={() => setSelectedGender(option.value)}
                        >
                            <Text style={[styles.optionLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {option.label}
                            </Text>
                            {selectedGender === option.value && (
                                <Check
                                    size={20}
                                    color="#F48C06"
                                />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.warningContainer}>
                    <Text style={[styles.warningText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Thông tin giới tính giúp chúng tôi cung cấp trải nghiệm tốt hơn cho bạn.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        minWidth: 60,
    },
    headerButtonText: {
        fontSize: 16,
        textAlign: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingTop: 24,
    },
    optionsContainer: {
        paddingHorizontal: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    warningContainer: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    warningText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
