import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { ChevronRight, Trash2, UserPen } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

interface CollectionActionsModalProps {
    isVisible: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDefault: boolean;
}

const CollectionActionsModal: React.FC<CollectionActionsModalProps> = ({
    isVisible,
    onClose,
    onEdit,
    onDelete,
    isDefault,
}) => {
    const isDark = useColorScheme() === 'dark';
    const bottomSheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.snapToIndex(0);
        } else {
            bottomSheetRef.current?.snapToIndex(-1);
        }
    }, [isVisible]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(-1);
    }, []);

    const handleEdit = useCallback(() => {
        onEdit();
    }, [onEdit]);

    const handleDelete = useCallback(() => {
        onDelete();
    }, [onDelete]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    if (!isVisible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={['25%', '50%']}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
        >
            <BottomSheetView style={[styles.content, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Quản lý Collection
                </Text>

                {/* Edit Action */}
                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}
                    onPress={handleEdit}
                    disabled={isDefault}
                    activeOpacity={isDefault ? 1 : 0.7}
                >
                    <View style={styles.menuItemContent}>
                        <UserPen
                            size={24}
                            color={isDefault ? (isDark ? '#4B5563' : '#9CA3AF') : (isDark ? '#FFFFFF' : '#000000')}
                        />
                        <Text style={[
                            styles.menuItemText,
                            { color: isDefault ? (isDark ? '#4B5563' : '#9CA3AF') : (isDark ? '#FFFFFF' : '#000000') }
                        ]}>
                            Chỉnh sửa
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDefault ? (isDark ? '#4B5563' : '#9CA3AF') : (isDark ? '#9CA3AF' : '#6B7280')}
                    />
                </TouchableOpacity>

                {/* Delete Action */}
                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}
                    onPress={handleDelete}
                    disabled={isDefault}
                    activeOpacity={isDefault ? 1 : 0.7}
                >
                    <View style={styles.menuItemContent}>
                        <Trash2
                            size={24}
                            color={isDefault ? (isDark ? '#4B5563' : '#9CA3AF') : '#EF4444'}
                        />
                        <Text style={[
                            styles.menuItemText,
                            { color: isDefault ? (isDark ? '#4B5563' : '#9CA3AF') : '#EF4444' }
                        ]}>
                            Xóa
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDefault ? (isDark ? '#4B5563' : '#9CA3AF') : (isDark ? '#9CA3AF' : '#6B7280')}
                    />
                </TouchableOpacity>
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#000000',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
});

export default CollectionActionsModal;