import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    Image,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FolderPlus } from 'lucide-react-native';
import { LocationDetails } from '../types/location';
import { LocationFolder } from '../types/locationFolder';
import { FeatureErrorBoundary } from './FeatureErrorBoundary';
import { locationFolderService } from '../services/locationFolderService';
import { useToast } from '../contexts/ToastContext';

interface SaveLocationModalProps {
    isVisible: boolean;
    onClose: () => void;
    location: LocationDetails | null;
    onSuccess?: () => void;
}

const SaveLocationModal: React.FC<SaveLocationModalProps> = ({
    isVisible,
    onClose,
    location,
    onSuccess,
}) => {
    const isDark = useColorScheme() === 'dark';
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { success: showSuccess, error: showError } = useToast();

    // State for folders
    const [folders, setFolders] = useState<LocationFolder[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    // Bottom sheet snap points - fixed height
    const snapPoints = useMemo(() => ['66%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1 && isVisible) {
            onClose();
        }
    }, [onClose, isVisible]);

    // Open/close effect
    React.useEffect(() => {
        if (isVisible) {
            setTimeout(() => {
                bottomSheetRef.current?.expand();
            }, 50);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    // Load folders when modal opens
    useEffect(() => {
        if (isVisible) {
            loadFolders();
        }
    }, [isVisible, location]);

    const loadFolders = async () => {
        setLoading(true);
        try {
            const response = await locationFolderService.getAllFolders();

            if (response.status === 'success') {
                setFolders(response.data);
            } else {
                showError('Không thể tải danh sách collections');
            }
        } catch (error) {
            showError('Lỗi khi tải danh sách collections');
            setFolders([]);
        } finally {
            setLoading(false);
        }
    };

    // Custom backdrop
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.7}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0)',
                }}
                pressBehavior="close"
            />
        ),
        []
    );

    const handleClose = () => {
        bottomSheetRef.current?.close();
        onClose();
    };

    const handleSaveToFolder = async (folder: LocationFolder) => {
        if (!location) return;

        setSaving(folder.id);
        try {
            const requestData = {
                locationId: location.id
            };

            const response = await locationFolderService.addLocationToFolder(folder.id, requestData);

            if (response.status === 'success') {
                showSuccess(`Đã lưu "${location.name}" vào "${folder.name}"`);
                onSuccess?.();
                handleClose();
            } else {
                showError(response.message || 'Không thể lưu địa điểm');
            }
        } catch (error: any) {
            // Handle specific error cases
            if (error.response?.status === 409) {
                showError(`"${location.name}" đã có trong "${folder.name}"`);
            } else if (error.response?.status === 404) {
                showError('Không tìm thấy collection hoặc địa điểm');
            } else if (error.response?.status === 401) {
                showError('Phiên đăng nhập đã hết hạn');
            } else {
                showError('Lỗi khi lưu địa điểm');
            }
        } finally {
            setSaving(null);
        }
    };


    if (!isVisible || !location) return null;

    const renderFolder = ({ item }: { item: LocationFolder }) => (
        <TouchableOpacity
            style={[styles.folderItem, { backgroundColor: isDark ? '#232024' : '#FFFFFF' }]}
            onPress={() => handleSaveToFolder(item)}
            disabled={saving === item.id}
            activeOpacity={0.7}
        >
            <View style={styles.folderIcon}>
                <Ionicons
                    name="folder-outline"
                    size={24}
                    color={isDark ? '#FFFFFF' : '#000000'}
                />
            </View>
            <View style={styles.folderInfo}>
                <Text style={[styles.folderName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {item.name}
                </Text>
                <Text style={[styles.folderDescription, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    {item.description || 'Không có mô tả'}
                </Text>
                <View style={styles.folderMeta}>
                    <Text style={[styles.folderVisibility, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {item.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                    </Text>
                </View>
            </View>
            <View style={styles.folderAction}>
                {saving === item.id ? (
                    <ActivityIndicator size="small" color="#F48C06" />
                ) : (
                    <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <FolderPlus
                size={64}
                color={isDark ? '#4B5563' : '#9CA3AF'}
            />
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Chưa có collection nào
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Tạo collection đầu tiên để lưu địa điểm
            </Text>
        </View>
    );

    return (
        <FeatureErrorBoundary feature="SaveLocationModal">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetChanges}
                backdropComponent={renderBackdrop}
                enablePanDownToClose={true}
                backgroundStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                }}
                handleIndicatorStyle={{
                    backgroundColor: 'transparent',
                    width: 0,
                    height: 0,
                }}
            >
                <BottomSheetView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Chọn collection để lưu
                        </Text>
                    </View>

                    {/* Content - Fixed height with scroll */}
                    <View style={styles.content}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#F48C06" />
                                <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    Đang tải collections...
                                </Text>
                            </View>
                        ) : folders.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            <FlatList
                                data={folders}
                                keyExtractor={(item) => item.id}
                                renderItem={renderFolder}
                                contentContainerStyle={styles.foldersList}
                                showsVerticalScrollIndicator={false}
                                style={styles.foldersScrollView}
                            />
                        )}
                    </View>

                </BottomSheetView>
            </BottomSheet>
        </FeatureErrorBoundary>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        paddingHorizontal: 4,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 14,
        marginLeft: 8,
    },
    foldersList: {
        paddingBottom: 20,
    },
    foldersScrollView: {
        maxHeight: 480, // Giới hạn chiều cao để chỉ hiển thị ~4-5 items
    },
    folderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    folderIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    folderInfo: {
        flex: 1,
    },
    folderName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    folderDescription: {
        fontSize: 14,
        marginBottom: 8,
        lineHeight: 18,
    },
    folderMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    folderVisibility: {
        fontSize: 12,
        marginRight: 8,
    },
    folderAction: {
        paddingLeft: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        minHeight: 200,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
});

export default SaveLocationModal;
