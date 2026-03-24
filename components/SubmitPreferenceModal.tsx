import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    useColorScheme,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    Platform
} from 'react-native';
import { X, Send, MessageSquare } from 'lucide-react-native';
import { activityService } from '../services/activityService';
import { useToast } from '../contexts/ToastContext';

interface SubmitPreferenceModalProps {
    visible: boolean;
    onClose: () => void;
    activityId: string;
    activityName: string;
    onSubmitSuccess?: () => void; // Callback when submit is successful
}

export default function SubmitPreferenceModal({
    visible,
    onClose,
    activityId,
    activityName,
    onSubmitSuccess
}: SubmitPreferenceModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success, error } = useToast();

    const [preferenceText, setPreferenceText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!preferenceText.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập sở thích của bạn');
            return;
        }

        setSubmitting(true);
        try {
            await activityService.submitActivityPreference({
                activityId,
                contentType: 'NLP',
                nlpText: preferenceText.trim()
            });

            success('Đã gửi sở thích thành công!');
            setPreferenceText('');
            onSubmitSuccess?.(); // Call callback to update parent component
            onClose();
        } catch (err: any) {
            console.error('[SubmitPreferenceModal] Failed to submit preference:', err);
            error(err.message || 'Không thể gửi sở thích');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setPreferenceText('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <View style={styles.headerContent}>
                        <MessageSquare size={24} color="#F48C06" />
                        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Gửi sở thích
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={submitting}>
                        <X size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Activity Info - Compact */}
                        <View style={[styles.activityInfo, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                            <Text style={[styles.activityName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                {activityName}
                            </Text>
                        </View>

                        {/* Preference Input - Compact */}
                        <View style={styles.inputSection}>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                        color: isDark ? '#FFFFFF' : '#000000',
                                        borderColor: isDark ? '#374151' : '#E5E7EB'
                                    }
                                ]}
                                placeholder="Chia sẻ sở thích của bạn..."
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                value={preferenceText}
                                onChangeText={setPreferenceText}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={500}
                                editable={!submitting}
                                returnKeyType="done"
                                blurOnSubmit={true}
                            />
                            <Text style={[styles.characterCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {preferenceText.length}/500
                            </Text>
                        </View>

                        {/* Examples - Compact */}
                        <View style={styles.examplesSection}>
                            <Text style={[styles.examplesTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Ví dụ:
                            </Text>
                            <View style={styles.examplesList}>
                                <Text style={[styles.exampleItem, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                    • "Quán cà phê yên tĩnh để làm việc"
                                </Text>
                                <Text style={[styles.exampleItem, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                    • "Nơi có view đẹp để chụp ảnh"
                                </Text>
                                <Text style={[styles.exampleItem, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                                    • "Đồ ăn Việt Nam ngon"
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer */}
                <View style={[styles.footer, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || !preferenceText.trim()}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Send size={20} color="#FFFFFF" />
                                <Text style={styles.submitButtonText}>Gửi sở thích</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 8,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    activityInfo: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    activityName: {
        fontSize: 18,
        fontWeight: '600',
    },
    inputSection: {
        marginBottom: 16,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 17,
        lineHeight: 22,
        minHeight: 80,
        maxHeight: 120,
    },
    characterCount: {
        fontSize: 13,
        textAlign: 'right',
        marginTop: 8,
    },
    examplesSection: {
        marginBottom: 16,
    },
    examplesTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    examplesList: {
        gap: 4,
    },
    exampleItem: {
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 34, // Thêm padding bottom để tránh home indicator
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    submitButton: {
        backgroundColor: '#F48C06',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    submitButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
