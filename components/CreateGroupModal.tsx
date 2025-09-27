import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { UserPlus } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { chatService } from '../services/chatService';
import { socialService } from '../services/socialService';
import { Friend } from '../types/social';
import GradientButton from './GradientButton';

interface CreateGroupModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [groupName, setGroupName] = useState('');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Bottom sheet snap points
    const snapPoints = useMemo(() => ['70%', '90%'], []);

    // Handle sheet changes
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setTimeout(() => {
                onClose();
            }, 100);
        }
    }, [onClose]);

    // Open/close effect
    React.useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
            loadFriends();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    // Load friends
    const loadFriends = useCallback(async () => {
        try {
            setLoading(true);
            const friendsList = await socialService.getFriends();
            setFriends(friendsList);
        } catch (err: any) {
            console.error('Failed to load friends:', err);
            showError('Lỗi khi tải danh sách bạn bè');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    // Handle friend selection
    const handleFriendSelect = useCallback((friendId: string) => {
        setSelectedFriends(prev => {
            if (prev.includes(friendId)) {
                return prev.filter(id => id !== friendId);
            } else {
                return [...prev, friendId];
            }
        });
    }, []);

    // Handle create group
    const handleCreateGroup = useCallback(async () => {
        if (selectedFriends.length === 0) {
            showError('Vui lòng chọn ít nhất một người bạn');
            return;
        }

        setCreating(true);
        try {
            const response = await chatService.createGroupConversation({
                name: groupName.trim() || undefined, // Tên nhóm không bắt buộc
                memberIds: selectedFriends, // Gửi danh sách memberIds
            });

            if (response.status === 'success') {
                showSuccess('Tạo nhóm thành công');
                onSuccess();
                onClose();

                // Reset form
                setGroupName('');
                setSelectedFriends([]);
            } else {
                showError('Không thể tạo nhóm');
            }
        } catch (err: any) {
            console.error('Failed to create group:', err);
            showError('Lỗi khi tạo nhóm');
        } finally {
            setCreating(false);
        }
    }, [groupName, selectedFriends, showError, showSuccess, onSuccess, onClose]);

    // Render friend item
    const renderFriendItem = ({ item }: { item: Friend }) => {
        const isSelected = selectedFriends.includes(item.friendId);

        return (
            <TouchableOpacity
                style={styles.friendItem}
                onPress={() => handleFriendSelect(item.friendId)}
                activeOpacity={1}
            >
                <View style={styles.friendInfo}>
                    {item.avatarUrl ? (
                        <Image
                            source={{ uri: item.avatarUrl }}
                            style={styles.friendAvatar}
                        />
                    ) : (
                        <View style={[
                            styles.defaultFriendAvatar,
                            { backgroundColor: isDark ? '#374151' : '#E5E7EB' }
                        ]}>
                            <Text style={[
                                styles.avatarText,
                                { color: isDark ? '#9CA3AF' : '#6B7280' }
                            ]}>
                                {item.friendName?.charAt(0) || 'F'}
                            </Text>
                        </View>
                    )}
                    <Text style={[
                        styles.friendName,
                        { color: isDark ? '#FFFFFF' : '#000000' }
                    ]}>
                        {item.friendName}
                    </Text>
                </View>

                <View style={[
                    styles.selectionCircle,
                    { borderColor: isDark ? '#6B7280' : '#9CA3AF' },
                    isSelected && { borderColor: '#F48C06' }
                ]}>
                    {isSelected && <View style={styles.innerCircle} />}
                </View>
            </TouchableOpacity>
        );
    };

    // Render backdrop
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

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#6B7280' : '#D1D5DB',
                width: 40,
                height: 4,
            }}
        >
            <BottomSheetView style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={creating}
                        style={styles.headerButton}
                    >
                        <Text style={[
                            styles.cancelText,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            Hủy
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <Text style={[
                            styles.title,
                            { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}>
                            Tạo nhóm
                        </Text>
                        <Text style={[
                            styles.subtitle,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            Chọn ít nhất 1 bạn để tạo nhóm
                        </Text>
                    </View>

                    <GradientButton
                        title={creating ? "Đang tạo..." : "Tạo"}
                        onPress={handleCreateGroup}
                        disabled={creating || selectedFriends.length === 0}
                        size="medium"
                        fullWidth={false}
                        minWidth={70}
                    />
                </View>

                {/* Group Name Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.groupNameContainer}>
                        <TextInput
                            style={styles.groupNameInput}
                            placeholder="Tên nhóm (không bắt buộc)"
                            placeholderTextColor="#9CA3AF"
                            value={groupName}
                            onChangeText={setGroupName}
                            maxLength={50}
                        />
                    </View>
                </View>

                {/* Friends List */}
                <View style={styles.friendsContainer}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F48C06" />
                            <Text style={[
                                styles.loadingText,
                                { color: isDark ? '#9CA3AF' : '#6B7280' }
                            ]}>
                                Đang tải danh sách bạn bè...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={friends}
                            keyExtractor={(item) => item.friendId}
                            renderItem={renderFriendItem}
                            style={styles.friendsList}
                            contentContainerStyle={styles.friendsContent}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <UserPlus
                                        size={48}
                                        color={isDark ? '#4B5563' : '#9CA3AF'}
                                    />
                                    <Text style={[
                                        styles.emptyText,
                                        { color: isDark ? '#9CA3AF' : '#6B7280' }
                                    ]}>
                                        Chưa có bạn bè nào
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 8,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '500',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    inputContainer: {
        paddingVertical: 16,
    },
    groupNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    groupNameInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        color: '#000000',
    },
    friendsContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    friendsList: {
        flex: 1,
    },
    friendsContent: {
        paddingBottom: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    defaultFriendAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
    },
    friendName: {
        fontSize: 18,
        fontWeight: '500',
    },
    selectionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerCircle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F48C06',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});

export default CreateGroupModal;
