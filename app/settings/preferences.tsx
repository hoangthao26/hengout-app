import { useRouter } from 'expo-router';
import { Flag, Grid3X3, Tag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Header from '../../components/Header';
import { useToast } from '../../contexts/ToastContext';
import { usePreferencesStore } from '../../store';

export default function PreferencesScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { success: showSuccess, error: showError, info: showInfo, warning: showWarning } = useToast();
    const router = useRouter();

    // Zustand store
    const { preferences, isLoading, fetchPreferences } = usePreferencesStore();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            // Use Zustand store instead of direct API call
            if (!preferences) {
                await fetchPreferences();
            }
        } catch (error: any) {
            console.error('[Preferences] Failed to load preferences:', error);
            showError('Failed to load preferences',);
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
                    <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Loading preferences...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
            {/* Header */}
            <Header
                title="Preferences"
                onBackPress={() => router.back()}
                variant="settings"
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Category Terms */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Grid3X3
                                size={20}
                                color={isDark ? '#FAA307' : '#F48C06'}
                            />
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Category Terms
                            </Text>
                            <View style={[styles.countBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <Text style={[styles.countText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {preferences?.categoryTerms?.length || 0}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.termsContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                            {preferences?.categoryTerms && preferences.categoryTerms.length > 0 ? (
                                preferences.categoryTerms.map((term, index) => (
                                    <View key={index} style={[styles.termItem, { backgroundColor: isDark ? '#374151' : '#FFFFFF' }]}>
                                        <Tag
                                            size={16}
                                            color={isDark ? '#FAA307' : '#F48C06'}
                                        />
                                        <Text style={[styles.termText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            {term}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Grid3X3
                                        size={32}
                                        color={isDark ? '#6B7280' : '#9CA3AF'}
                                    />
                                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        No category terms set
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Purpose Terms */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Flag
                                size={20}
                                color={isDark ? '#FAA307' : '#F48C06'}
                            />
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Purpose Terms
                            </Text>
                            <View style={[styles.countBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <Text style={[styles.countText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {preferences?.purposeTerms?.length || 0}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.termsContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                            {preferences?.purposeTerms && preferences.purposeTerms.length > 0 ? (
                                preferences.purposeTerms.map((term, index) => (
                                    <View key={index} style={[styles.termItem, { backgroundColor: isDark ? '#374151' : '#FFFFFF' }]}>
                                        <Flag
                                            size={16}
                                            color={isDark ? '#FAA307' : '#F48C06'}
                                        />
                                        <Text style={[styles.termText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            {term}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Flag
                                        size={32}
                                        color={isDark ? '#6B7280' : '#9CA3AF'}
                                    />
                                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        No purpose terms set
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Tag Terms */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Tag
                                size={20}
                                color={isDark ? '#FAA307' : '#F48C06'}
                            />
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                Tag Terms
                            </Text>
                            <View style={[styles.countBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <Text style={[styles.countText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                    {preferences?.tagTerms?.length || 0}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.termsContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                            {preferences?.tagTerms && preferences.tagTerms.length > 0 ? (
                                preferences.tagTerms.map((term, index) => (
                                    <View key={index} style={[styles.termItem, { backgroundColor: isDark ? '#374151' : '#FFFFFF' }]}>
                                        <Tag
                                            size={16}
                                            color={isDark ? '#FAA307' : '#F48C06'}
                                        />
                                        <Text style={[styles.termText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                                            {term}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <Tag
                                        size={32}
                                        color={isDark ? '#6B7280' : '#9CA3AF'}
                                    />
                                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                                        No tag terms set
                                    </Text>
                                </View>
                            )}
                        </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 20,
    },
    // Header styles removed - now using Header component
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
        flex: 1,
    },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
    },
    termsContainer: {
        borderRadius: 12,
        padding: 16,
        minHeight: 80,
    },
    termItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    termText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
});
