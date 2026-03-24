import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    useColorScheme,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from 'react-native';
import { X, Calendar, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { activityService, CreateActivityRequest, ActivityResponse } from '../services/activityService';
import * as Location from 'expo-location';

interface CreateActivityModalProps {
    visible: boolean;
    onClose: () => void;
    conversationId: string;
    onActivityCreated?: (activity: ActivityResponse) => void;
}

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
    visible,
    onClose,
    conversationId,
    onActivityCreated,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [formData, setFormData] = useState<CreateActivityRequest>({
        conversationId,
        name: '',
        purpose: '',
        latitude: 10.762622, // Default to Ho Chi Minh City
        longitude: 106.660172,
    });

    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // Auto get location when modal opens
    useEffect(() => {
        if (visible) {
            getCurrentLocation();
        }
    }, [visible]);

    const handleInputChange = (field: keyof CreateActivityRequest, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const getCurrentLocation = async () => {
        try {
            setLocationLoading(true);

            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return; // Use default TP.HCM location
            }

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;
            setCurrentLocation({ latitude, longitude });

            // Update form data with current location
            setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
            }));


        } catch (error) {
            // Silently fail, use default location (Ho Chi Minh City)
            console.error('[CreateActivityModal] Error getting location:', error);
        } finally {
            setLocationLoading(false);
        }
    };

    const validateForm = (): boolean => {
        if (!formData.name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên hoạt động');
            return false;
        }
        if (!formData.purpose.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập mục đích hoạt động');
            return false;
        }
        return true;
    };

    const handleCreateActivity = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const result = await activityService.createActivity(formData);

            if (result.status === 'success') {
                Alert.alert('Thành công', 'Hoạt động đã được tạo thành công!');
                onActivityCreated?.(result.data);
                handleClose();
            } else {
                Alert.alert('Lỗi', result.message || 'Có lỗi xảy ra khi tạo hoạt động');
            }
        } catch (error: any) {
            console.error('[CreateActivityModal] Failed to create activity:', error);
            Alert.alert('Lỗi', error.message || 'Không thể kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            conversationId,
            name: '',
            purpose: '',
            latitude: 10.762622, // Default to Ho Chi Minh City
            longitude: 106.660172,
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[
                        styles.modalContainer,
                        { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }
                    ]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[
                                styles.headerTitle,
                                { color: isDark ? '#FFFFFF' : '#000000' }
                            ]}>
                                Tạo Hoạt Động Mới
                            </Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                                disabled={loading}
                            >
                                <X size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                            </TouchableOpacity>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Activity Name */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabel}>
                                    <Calendar size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <Text style={[
                                        styles.labelText,
                                        { color: isDark ? '#E5E7EB' : '#374151' }
                                    ]}>
                                        Tên hoạt động
                                    </Text>
                                </View>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        {
                                            backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                            color: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? '#4B5563' : '#D1D5DB',
                                        }
                                    ]}
                                    placeholder="Ví dụ: Weekend Hangout"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                                    value={formData.name}
                                    onChangeText={(value) => handleInputChange('name', value)}
                                    maxLength={100}
                                />
                            </View>

                            {/* Purpose */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabel}>
                                    <MessageSquare size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <Text style={[
                                        styles.labelText,
                                        { color: isDark ? '#E5E7EB' : '#374151' }
                                    ]}>
                                        Mục đích
                                    </Text>
                                </View>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        styles.multilineInput,
                                        {
                                            backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                            color: isDark ? '#FFFFFF' : '#000000',
                                            borderColor: isDark ? '#4B5563' : '#D1D5DB',
                                        }
                                    ]}
                                    placeholder="Mô tả mục đích của hoạt động..."
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                                    value={formData.purpose}
                                    onChangeText={(value) => handleInputChange('purpose', value)}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={500}
                                    textAlignVertical="top"
                                />
                            </View>


                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleClose}
                                disabled={loading}
                            >
                                <Text style={[
                                    styles.cancelButtonText,
                                    { color: isDark ? '#9CA3AF' : '#6B7280' }
                                ]}>
                                    Hủy
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={handleCreateActivity}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <LinearGradient
                                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                        locations={[0, 0.31, 0.69, 1]}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={styles.createButtonText}>
                                            Tạo Hoạt Động
                                        </Text>
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        minWidth: 350, // Cố định chiều rộng tối thiểu
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    form: {
        marginBottom: 24,
        width: '100%', // Đảm bảo form chiếm toàn bộ chiều rộng
    },
    inputGroup: {
        marginBottom: 20,
        width: '100%', // Đảm bảo input group chiếm toàn bộ chiều rộng
    },
    inputLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    labelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 48,
        width: '100%',
    },
    multilineInput: {
        height: 80,
        minHeight: 80,
        textAlignVertical: 'top',
        width: '100%',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    createButton: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradientButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateActivityModal;
