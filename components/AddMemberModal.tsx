import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Search, UserPlus } from 'lucide-react-native';
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

interface AddMemberModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conversationId: string;
    conversationName: string;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
    isVisible,
    onClose,
    onSuccess,
    conversationId,
    conversationName,
}) => {
    const isDark = useColorScheme() === 'dark';
    const { success: showSuccess, error: showError } = useToast();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [friends, setFriends] = useState<Friend[]>([]);
    const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [existingMembers, setExistingMembers] = useState<string[]>([]);

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

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isVisible) {
            setSelectedFriends([]);
            setSearchQuery('');
        }
    }, [isVisible]);

    // Custom backdrop
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    // Load friends and existing members
    const loadFriends = useCallback(async () => {
        try {
            setLoading(true);

            // Load friends and existing members in parallel
            const [friendsList, membersResponse] = await Promise.all([
                socialService.getFriends(),
                chatService.getGroupMembers(conversationId)
            ]);

            // Extract member IDs from the response
            const memberIds = membersResponse.data.map(member => member.userId);
            setExistingMembers(memberIds);

            // Filter out existing members from friends list
            const availableFriends = friendsList.filter(friend => !memberIds.includes(friend.friendId));
            setFriends(availableFriends);
            setFilteredFriends(availableFriends);
        } catch (err: any) {
            console.error('Failed to load friends:', err);
            showError('Lỗi khi tải danh sách bạn bè');
        } finally {
            setLoading(false);
        }
    }, [showError, conversationId]);

    // Handle search
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredFriends(friends);
        } else {
            const filtered = friends.filter(friend =>
                friend.friendName.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredFriends(filtered);
        }
    }, [friends]);

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

    // Handle add members
    const handleAddMembers = useCallback(async () => {
        if (selectedFriends.length === 0) {
            showError('Vui lòng chọn ít nhất một người bạn');
            return;
        }

        setAdding(true);
        try {
            // Add each selected friend to the group
            for (const friendId of selectedFriends) {
                try {
                    await chatService.addMember(conversationId, friendId);
                } catch (err) {
                    console.error(`Failed to add friend ${friendId}:`, err);
                }
            }

            showSuccess(`Đã thêm ${selectedFriends.length} thành viên vào nhóm`);
            onSuccess();
            onClose();

            // Reset form
            setSelectedFriends([]);
            setSearchQuery('');
        } catch (err: any) {
            console.error('Failed to add members:', err);
            showError('Lỗi khi thêm thành viên');
        } finally {
            setAdding(false);
        }
    }, [selectedFriends, conversationId, showError, showSuccess, onSuccess, onClose]);

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
                        <View style={[styles.defaultFriendAvatar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.avatarText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {item.friendName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.friendName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {item.friendName}
                    </Text>
                </View>
                <View style={[
                    styles.selectionCircle,
                    { borderColor: isSelected ? '#F48C06' : (isDark ? '#4B5563' : '#D1D5DB') }
                ]}>
                    {isSelected && <View style={styles.innerCircle} />}
                </View>
            </TouchableOpacity>
        );
    };

    if (!isVisible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            }}
            handleIndicatorStyle={{
                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
        >
            <BottomSheetView style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={adding}
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
                            Thêm thành viên
                        </Text>
                        <Text style={[
                            styles.subtitle,
                            { color: isDark ? '#9CA3AF' : '#6B7280' }
                        ]}>
                            {conversationName}
                        </Text>
                    </View>

                    <GradientButton
                        title={adding ? "Đang thêm..." : "Thêm"}
                        onPress={handleAddMembers}
                        disabled={adding || selectedFriends.length === 0}
                        size="medium"
                        fullWidth={false}
                        minWidth={70}
                    />
                </View>

                {/* Search Bar */}
                <View style={styles.inputContainer}>
                    <View style={styles.searchContainer}>
                        <Search
                            size={20}
                            color="#6B7280"
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm bạn bè..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                </View>

                {/* Friends List */}
                <View style={styles.friendsContainer}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#F48C06" />
                            <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                Đang tải danh sách bạn bè...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredFriends}
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
                                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        {searchQuery ? 'Không tìm thấy bạn bè nào' : 'Chưa có bạn bè nào để thêm'}
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
    searchContainer: {
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
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
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

export default AddMemberModal;
