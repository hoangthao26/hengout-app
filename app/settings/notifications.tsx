import React from 'react';
import { StyleSheet, Text, View, Switch, useColorScheme, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Volume2, Vibrate, MessageCircle } from 'lucide-react-native';
import Header from '../../components/Header';
import { useNotificationStore } from '../../store/notificationStore';

export default function NotificationSettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const {
        isInAppNotificationEnabled,
        isSoundEnabled,
        isVibrationEnabled,
        toggleInAppNotification,
        toggleSound,
        toggleVibration,
        totalUnreadCount,
    } = useNotificationStore();

    const SettingItem = ({
        icon: Icon,
        title,
        description,
        value,
        onValueChange
    }: {
        icon: any;
        title: string;
        description: string;
        value: boolean;
        onValueChange: (value: boolean) => void;
    }) => (
        <View style={[styles.settingItem, {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderBottomColor: isDark ? '#374151' : '#E5E7EB'
        }]}>
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, {
                    backgroundColor: isDark ? '#374151' : '#F3F4F6'
                }]}>
                    <Icon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
                <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, {
                        color: isDark ? '#FFFFFF' : '#000000'
                    }]}>
                        {title}
                    </Text>
                    <Text style={[styles.settingDescription, {
                        color: isDark ? '#9CA3AF' : '#6B7280'
                    }]}>
                        {description}
                    </Text>
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{
                    false: isDark ? '#374151' : '#E5E7EB',
                    true: '#FAA307'
                }}
                thumbColor={value ? '#FFFFFF' : isDark ? '#9CA3AF' : '#FFFFFF'}
            />
        </View>
    );

    return (
        <View style={[styles.container, {
            backgroundColor: isDark ? '#000000' : '#FFFFFF'
        }]}>
            <Header
                title="Notifications"
                showBackButton={true}
            />

            {/* Badge count display */}
            <View style={[styles.badgeContainer, {
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderBottomColor: isDark ? '#374151' : '#E5E7EB'
            }]}>
                <MessageCircle size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.badgeText, {
                    color: isDark ? '#9CA3AF' : '#6B7280'
                }]}>
                    {totalUnreadCount} unread messages
                </Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={[styles.contentContainer, {
                    paddingBottom: insets.bottom + 20
                }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, {
                        color: isDark ? '#FFFFFF' : '#000000'
                    }]}>
                        In-App Notifications
                    </Text>

                    <SettingItem
                        icon={Bell}
                        title="Show Notifications"
                        description="Display toast notifications for new messages"
                        value={isInAppNotificationEnabled}
                        onValueChange={toggleInAppNotification}
                    />

                    <SettingItem
                        icon={Volume2}
                        title="Sound"
                        description="Play sound when receiving new messages"
                        value={isSoundEnabled}
                        onValueChange={toggleSound}
                    />

                    <SettingItem
                        icon={Vibrate}
                        title="Vibration"
                        description="Vibrate device when receiving new messages"
                        value={isVibrationEnabled}
                        onValueChange={toggleVibration}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, {
                        color: isDark ? '#FFFFFF' : '#000000'
                    }]}>
                        Badge Count
                    </Text>

                    <View style={[styles.infoCard, {
                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                        borderColor: isDark ? '#374151' : '#E5E7EB'
                    }]}>
                        <Text style={[styles.infoText, {
                            color: isDark ? '#9CA3AF' : '#6B7280'
                        }]}>
                            Badge counts are automatically managed. They show the number of unread messages for each conversation and the total unread count on the chat tab.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        gap: 6,
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
