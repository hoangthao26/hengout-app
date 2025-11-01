import { Search, Send, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import Header from '../../components/Header';
import SimpleAvatar from '../../components/SimpleAvatar';
import { FeatureErrorBoundary } from '../../components/FeatureErrorBoundary';
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';
import { socialService } from '../../services/socialService';
import { SentFriendRequest } from '../../types/social';

export default function SentRequestsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError } = useToast();

    // States
    const [sentRequests, setSentRequests] = useState<SentFriendRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [processingRequest, setProcessingRequest] = useState<string | null>(null);

    useEffect(() => {
        loadSentRequests();
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch(searchQuery);
            } else {
                setSentRequests(prev => prev);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    const loadSentRequests = async () => {
        try {
            setLoading(true);
            const response = await socialService.getSentFriendRequests();
            setSentRequests(response);
        } catch (error: any) {
            console.error('Failed to load sent requests:', error);
            showError(`Failed to load sent requests: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            return;
        }

        try {
            setSearchLoading(true);
            // Filter local data since API doesn't support search for sent requests
            const filtered = sentRequests.filter(request =>
                request.name.toLowerCase().includes(query.toLowerCase())
            );
            // In a real app, you might want to call a search API here
        } catch (error: any) {
            console.error('Failed to search sent requests:', error);
            showError(`Failed to search sent requests: ${error.message}`);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleCancelRequest = async (requestId: string) => {
        try {
            setProcessingRequest(requestId);
            await socialService.cancelSentFriendRequest(requestId);
            showSuccess('Friend request cancelled!');

            // Remove from sent requests
            setSentRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (error: any) {
            console.error('Failed to cancel friend request:', error);
            showError(`Failed to cancel friend request: ${error.message}`);
        } finally {
            setProcessingRequest(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return '#F59E0B';
            case 'ACCEPTED':
                return '#10B981';
            case 'REJECTED':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Đang chờ';
            case 'ACCEPTED':
                return 'Đã chấp nhận';
            case 'REJECTED':
                return 'Đã từ chối';
            default:
                return 'Không xác định';
        }
    };

    const renderSentRequest = ({ item }: { item: SentFriendRequest }) => (
        <View style={[styles.friendItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
            <View style={styles.friendInfo}>
                <SimpleAvatar
                    size={55}
                    avatarUrl={item.avatarUrl}
                />
                <View style={styles.friendDetails}>
                    <Text style={[styles.friendName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {item.name}
                    </Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusText(item.status)}
                        </Text>
                        <Text style={[styles.dateText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            • {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                    </View>
                </View>
            </View>

            {item.status === 'PENDING' && (
                <TouchableOpacity
                    style={[styles.cancelButton, { opacity: processingRequest === item.id ? 0.6 : 1 }]}
                    onPress={() => handleCancelRequest(item.id)}
                    disabled={processingRequest === item.id}
                >
                    {processingRequest === item.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                        <Text style={styles.cancelButtonText}>Hủy</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    const filteredRequests = searchQuery.trim()
        ? sentRequests.filter(request =>
            request.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : sentRequests;

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <FeatureErrorBoundary feature="Friends">
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header */}
                <Header
                    title="Lời mời đã gửi"
                    onBackPress={() => NavigationService.goBack()}
                />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm lời mời đã gửi"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchLoading ? (
                        <ActivityIndicator size="small" color="#F48C06" style={styles.searchButton} />
                    ) : (
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={searchQuery ? clearSearch : undefined}
                        >
                            {searchQuery ? (
                                <X
                                    size={20}
                                    color="#9CA3AF"
                                />
                            ) : (
                                <Search
                                    size={20}
                                    color="#9CA3AF"
                                />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Content */}
                <FlatList
                    data={filteredRequests}
                    renderItem={renderSentRequest}
                    keyExtractor={(item) => item.id}
                    style={styles.friendsList}
                    contentContainerStyle={styles.friendsListContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Send
                                size={64}
                                color={isDark ? '#4B5563' : '#9CA3AF'}
                            />
                            <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                {searchQuery ? 'Không tìm thấy lời mời nào' : 'Chưa gửi lời mời kết bạn nào'}
                            </Text>
                        </View>
                    }
                />
            </View>
        </FeatureErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        color: '#000000',
    },
    searchButton: {
        marginLeft: 8,
    },
    friendsList: {
        flex: 1,
    },
    friendsListContent: {
        paddingBottom: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        marginBottom: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    friendInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    friendDetails: {
        marginLeft: 12,
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dateText: {
        fontSize: 14,
        marginLeft: 4,
    },
    cancelButton: {
        backgroundColor: '#374151',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});
