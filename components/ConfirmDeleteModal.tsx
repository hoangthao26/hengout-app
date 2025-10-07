import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface ConfirmDeleteModalProps {
    isVisible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    collectionName: string;
}

export default function ConfirmDeleteModal({
    isVisible,
    onClose,
    onConfirm,
    collectionName
}: ConfirmDeleteModalProps) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['40%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            // Add small delay to ensure proper cleanup
            setTimeout(() => {
                onClose();
            }, 100);
        }
    }, [onClose]);

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(-1);
        setTimeout(() => {
            onClose();
        }, 100);
    }, [onClose]);

    const handleConfirm = useCallback(() => {
        onConfirm();
    }, [onConfirm]);

    const handleCancel = useCallback(() => {
        handleClose();
    }, [handleClose]);

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

    useEffect(() => {
        console.log('🔍 ConfirmDeleteModal useEffect - isVisible:', isVisible);
        if (isVisible) {
            console.log('🔍 Opening ConfirmDeleteModal, calling snapToIndex(0)');
            bottomSheetRef.current?.snapToIndex(0);
        } else {
            console.log('🔍 Closing ConfirmDeleteModal, calling snapToIndex(-1)');
            bottomSheetRef.current?.snapToIndex(-1);
        }
    }, [isVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose={false}
            backdropComponent={renderBackdrop}
            backgroundStyle={{
                backgroundColor: isDark ? '#000000' : '#FFFFFF',
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
        >
            <BottomSheetView style={[styles.content, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Warning Icon */}
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#FEE2E2' : '#FEF2F2' }]}>
                    <AlertTriangle size={32} color="#EF4444" />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                    Xóa Collection
                </Text>

                {/* Message */}
                <Text style={[styles.message, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                    Bạn có chắc chắn muốn xóa collection "{collectionName}"? Tất cả địa điểm trong collection này sẽ bị xóa.
                </Text>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelButtonText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                            Hủy
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleConfirm}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.deleteButtonText}>
                            Xóa
                        </Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#EF4444',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
