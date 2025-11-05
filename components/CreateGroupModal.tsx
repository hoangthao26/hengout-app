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
import { useChatStore } from '../store/chatStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { Friend } from '../types/social';
import GradientButton from './GradientButton';
import useLimits from '../hooks/useLimits';
import { SubscriptionModal, PaymentScreen } from '../components/subscription';
import { paymentFlowManager } from '../services/paymentFlowManager';
import { Plan } from '../types/subscription';
import { useChatSync } from '../hooks/useChatSync';

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
    const { addConversation } = useChatStore();
    const { isInitialized: chatSyncInitialized, syncConversations: syncConversationsToDB } = useChatSync();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [groupName, setGroupName] = useState('');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    // Sync with global payment flow like ProfileScreen
    React.useEffect(() => {
        const unsubscribe = paymentFlowManager.subscribe(() => {
            const current = paymentFlowManager.getCurrentPayment();
            if (current) {
                setSelectedPlan(current.plan);
                setShowPaymentScreen(true);
            } else {
                setShowPaymentScreen(false);
                setSelectedPlan(null);
            }
        });
        return unsubscribe;
    }, []);

    const handlePlanSelect = useCallback((plan: Plan) => {
        setShowSubscriptionModal(false);
        // Start payment via manager (will trigger subscription above)
        paymentFlowManager.startPayment(plan).catch(() => { /* show error is handled where needed */ });
    }, []);

    const handlePaymentBack = useCallback(() => {
        setShowPaymentScreen(false);
        setSelectedPlan(null);
    }, []);

    // Ensure limits are available when modal opens
    const { activeSubscription, fetchActiveSubscription } = useSubscriptionStore();
    React.useEffect(() => {
        if (isVisible && !activeSubscription) {
            fetchActiveSubscription().catch(() => { });
        }
    }, [isVisible, activeSubscription, fetchActiveSubscription]);

    // Limits for groups and group members
    const currentGroupsCount = useChatStore(state => (state.conversations || []).filter((c: any) => c?.type === 'GROUP').length) || 0;
    const { label: groupsLabel, guard: guardGroups } = useLimits('groups', currentGroupsCount, () => setShowSubscriptionModal(true));

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
            console.error('[CreateGroupModal] Failed to load friends:', err);
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
        if (!guardGroups()) return;
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
                // Thêm conversation mới vào store ngay lập tức
                addConversation(response.data);

                // Save conversation vào database ngay để hiển thị trong list
                if (chatSyncInitialized) {
                    try {
                        // Import databaseService to save directly
                        const { databaseService } = await import('../services/databaseService');
                        await databaseService.initialize();
                        await databaseService.saveConversation(response.data);
                    } catch (dbError) {
                        console.error('[CreateGroupModal] Failed to save conversation to database:', dbError);
                        // Don't block user, just log error - sync will handle it later
                    }
                }

                // Subscribe WebSocket ngay sau khi tạo group
                try {
                    const { chatWebSocketManager } = await import('../services/chatWebSocketManager');
                    if (chatWebSocketManager.isConnected()) {
                        chatWebSocketManager.subscribeToConversation(response.data.id);
                    }
                } catch (wsError) {
                    console.error('[CreateGroupModal] Failed to subscribe WebSocket:', wsError);
                    // Don't block user, just log error
                }

                showSuccess(response.message || 'Tạo nhóm thành công');
                onSuccess();
                onClose();

                // Reset form
                setGroupName('');
                setSelectedFriends([]);
            } else {
                showError(response.message || 'Không thể tạo nhóm');
            }
        } catch (err: any) {
            console.error('[CreateGroupModal] Failed to create group:', err);
            const apiMsg = err?.response?.data?.message || err?.message;
            showError(apiMsg || 'Lỗi khi tạo nhóm');
        } finally {
            setCreating(false);
        }
    }, [groupName, selectedFriends, showError, showSuccess, onSuccess, onClose, addConversation, chatSyncInitialized]);

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
        <>
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetChanges}
                backdropComponent={renderBackdrop}
                enablePanDownToClose
                backgroundStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                }}
                handleIndicatorStyle={{
                    backgroundColor: isDark ? '#6B7280' : '#D1D5DB',
                    width: 40,
                    height: 4,
                }}
            >
                <BottomSheetView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
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
                            <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Nhóm: {groupsLabel}</Text>
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

            {/* Subscription Modal */}
            <SubscriptionModal
                isVisible={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                onPlanSelect={handlePlanSelect}
            />

            {/* Payment Screen */}
            {showPaymentScreen && selectedPlan && (
                <PaymentScreen
                    plan={selectedPlan}
                    onBack={handlePaymentBack}
                    onSuccess={handlePaymentBack}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        position: 'relative',
    },
    headerButton: {
        padding: 8,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '500',
    },
    titleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
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
