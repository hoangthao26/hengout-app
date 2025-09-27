import { useRouter } from 'expo-router';
import { XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { useProfileStore } from '../store';

export default function EditBioScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const router = useRouter();

    // Zustand store
    const { profile, isLoading, isUpdating, fetchProfile, updateProfile } = useProfileStore();

    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCurrentBio();
    }, []);

    const loadCurrentBio = async () => {
        try {
            setLoading(true);
            // Use Zustand store instead of direct API call
            if (!profile) {
                await fetchProfile();
            }
            setBio(profile?.bio || '');
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
                bio: bio.trim(),
            });
            showSuccess('Tiểu sử đã được cập nhật!',);
            router.back();
        } catch (error: any) {
            console.error('Failed to update bio:', error);
            showError('Không thể cập nhật tiểu sử',);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const clearText = () => {
        setBio('');
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
                    Tiểu sử
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
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Giới thiệu về bạn..."
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        maxLength={150}
                        multiline
                        textAlignVertical="top"
                        autoFocus
                    />
                    {bio.length > 0 && (
                        <TouchableOpacity onPress={clearText} style={styles.clearButton}>
                            <XCircle size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.characterCount}>
                    <Text style={[styles.characterCountText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {bio.length}/150
                    </Text>
                </View>

                <View style={styles.warningContainer}>
                    <Text style={[styles.warningText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Hãy viết một tiểu sử ngắn gọn để mọi người hiểu thêm về bạn.
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
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#F48C06',
        paddingBottom: 8,
        minHeight: 120,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
        minHeight: 100,
    },
    clearButton: {
        padding: 4,
        marginTop: 8,
    },
    characterCount: {
        alignItems: 'flex-end',
        marginTop: 8,
    },
    characterCountText: {
        fontSize: 14,
    },
    warningContainer: {
        marginTop: 24,
        paddingHorizontal: 4,
    },
    warningText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
