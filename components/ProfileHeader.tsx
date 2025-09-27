import { User, UserPen } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

interface ProfileHeaderProps {
    profile: {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
    } | null;
    onEdit: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onEdit }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Profile Info Section - Avatar Left, Name/Bio Below, Edit Icon Right */}
            <View style={styles.profileInfoSection}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    {profile?.avatarUrl ? (
                        <Image
                            source={{ uri: profile.avatarUrl }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <User
                            size={90}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                    )}
                </View>

                {/* Name and Bio - Centered below avatar */}
                <View style={styles.nameBioSection}>
                    <Text style={[styles.displayName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {profile?.displayName || 'User'}
                    </Text>
                    {profile?.bio && (
                        <Text style={[styles.bio, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                            {profile.bio}
                        </Text>
                    )}
                </View>

                {/* Edit Icon - Right side */}
                <View style={styles.editIconContainer}>
                    <TouchableOpacity
                        style={[styles.editIconButton, { backgroundColor: isDark ? '#262626' : '#F5F5F5' }]}
                        onPress={onEdit}
                    >
                        <UserPen
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    profileInfoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatarContainer: {
        // Avatar stays on the left
    },
    avatarImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    nameBioSection: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    displayName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'left',
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'left',
    },
    editIconContainer: {
        // Edit icon stays on the right
    },
    editIconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});
