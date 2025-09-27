import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Send, ChevronRight, Users } from 'lucide-react-native';

interface BottomSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSentRequests: () => void;
    onFriendsList: () => void;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
    isOpen,
    onClose,
    onSentRequests,
    onFriendsList,
}) => {
    const isDark = useColorScheme() === 'dark';

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['25%', '50%'], []);

    // Handle backdrop press
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                onPress={onClose}
            />
        ),
        [onClose]
    );

    const handleSentRequests = () => {
        onClose();
        onSentRequests();
    };

    const handleFriendsList = () => {
        onClose();
        onFriendsList();
    };

    if (!isOpen) return null;

    return (
        <BottomSheet
            index={0}
            snapPoints={snapPoints}
            onClose={onClose}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
        >
            <BottomSheetView style={styles.content}>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Quản lý bạn bè
                </Text>

                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}
                    onPress={handleSentRequests}
                >
                    <View style={styles.menuItemContent}>
                        <Send
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.menuItemText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Lời mời đã gửi
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: isDark ? '#374151' : '#F9FAFB' }]}
                    onPress={handleFriendsList}
                >
                    <View style={styles.menuItemContent}>
                        <Users
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                        <Text style={[styles.menuItemText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            Bạn bè của bạn
                        </Text>
                    </View>
                    <ChevronRight
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
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

export default BottomSheetModal;