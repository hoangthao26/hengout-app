import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ImageIcon } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';

export default function ViewAvatarScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { avatarUrl } = useLocalSearchParams<{ avatarUrl: string }>();

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Header */}
            <Header
                title="Ảnh đại diện"
                onBackPress={() => router.back()}
            />

            {/* Image Container */}
            <View style={styles.imageContainer}>
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatarImage}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.noImageContainer}>
                        <ImageIcon
                            size={80}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                        <Text style={[styles.noImageText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            Không có ảnh
                        </Text>
                    </View>
                )}
            </View>

            {/* Bottom Info */}
            <View style={styles.bottomInfo}>
                <Text style={[styles.infoText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
                    Ảnh đại diện của bạn
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Header styles removed - now using Header component
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        maxWidth: 400,
        maxHeight: 400,
    },
    noImageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    noImageText: {
        fontSize: 16,
        marginTop: 16,
    },
    bottomInfo: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
