import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { useProfileStore, useUIStore } from '../../store';

export default function EditDateOfBirthScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const router = useRouter();

    // Zustand stores
    const { profile, isLoading, isUpdating, fetchProfile, updateProfile } = useProfileStore();
    const { showModal, hideModal, modal } = useUIStore();

    const [dateOfBirth, setDateOfBirth] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCurrentDateOfBirth();
    }, []);

    useEffect(() => {
        console.log('📅 Modal visibility changed:', modal.isVisible);
    }, [modal.isVisible]);

    const loadCurrentDateOfBirth = async () => {
        try {
            setLoading(true);
            // Use Zustand store instead of direct API call
            if (!profile) {
                await fetchProfile();
            }
            setDateOfBirth(profile?.dateOfBirth || '');
        } catch (error: any) {
            console.error('Failed to load profile:', error);
            showError('Failed to load profile',);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!dateOfBirth) {
            showError('Vui lòng chọn ngày sinh',);
            return;
        }

        try {
            setSaving(true);
            // Use Zustand store instead of direct API call
            await updateProfile({ dateOfBirth });
            showSuccess('Ngày sinh đã được cập nhật!',);
            router.back();
        } catch (error: any) {
            console.error('Failed to update date of birth:', error);
            showError('Không thể cập nhật ngày sinh',);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const showDatePicker = () => {
        console.log('📅 Showing date picker...');
        showModal('datePicker');
    };

    const hideDatePicker = () => {
        console.log('📅 Hiding date picker...');
        hideModal();
    };

    const handleConfirm = (date: Date) => {
        console.log('📅 Date confirmed:', date);
        setDateOfBirth(date.toISOString().split('T')[0]);
        hideDatePicker();
    };

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
                    Ngày sinh
                </Text>

                <TouchableOpacity
                    onPress={handleSave}
                    style={styles.headerButton}
                    disabled={saving || !dateOfBirth}
                >
                    <Text style={[
                        styles.headerButtonText,
                        {
                            color: (saving || !dateOfBirth)
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
                <View style={styles.dateContainer}>
                    <Text style={[styles.dateLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Ngày sinh hiện tại:
                    </Text>
                    <Text style={[styles.currentDate, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {dateOfBirth ? formatDate(dateOfBirth) : 'Chưa được thiết lập'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.selectButton, { backgroundColor: '#F48C06' }]}
                    onPress={showDatePicker}
                >
                    <Text style={styles.selectButtonText}>
                        Chọn ngày sinh
                    </Text>
                </TouchableOpacity>

                <View style={styles.warningContainer}>
                    <Text style={[styles.warningText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Ngày sinh giúp chúng tôi cung cấp nội dung phù hợp với độ tuổi của bạn.
                    </Text>
                </View>
            </View>

            {/* Date Picker Modal */}
            <Modal
                visible={modal.isVisible && modal.type === 'datePicker'}
                transparent={true}
                animationType="slide"
                onRequestClose={hideDatePicker}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <TouchableOpacity onPress={hideDatePicker}>
                                <Text style={[styles.modalButton, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Hủy
                                </Text>
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Chọn ngày sinh
                            </Text>
                            <TouchableOpacity onPress={() => {
                                const selectedDate = dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1);
                                handleConfirm(selectedDate);
                            }}>
                                <Text style={[styles.modalButton, { color: '#F48C06' }]}>
                                    Xong
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.pickerContainer}>
                            <DateTimePicker
                                value={dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1)}
                                mode="date"
                                display="spinner"
                                locale="vi-VN"
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) {
                                        setDateOfBirth(selectedDate.toISOString().split('T')[0]);
                                    }
                                }}
                                maximumDate={new Date()}
                                minimumDate={new Date(1900, 0, 1)}
                                style={styles.datePicker}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    dateContainer: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(244, 140, 6, 0.1)',
    },
    dateLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    currentDate: {
        fontSize: 18,
        fontWeight: '600',
    },
    selectButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    selectButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    warningContainer: {
        paddingHorizontal: 4,
    },
    warningText: {
        fontSize: 14,
        lineHeight: 20,
    },
    datePickerModal: {
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
        padding: 0,
    },
    pickerStyle: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34, // Safe area
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalButton: {
        fontSize: 16,
        fontWeight: '500',
    },
    pickerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    datePicker: {
        height: 200,
        width: '100%',
    },
});
