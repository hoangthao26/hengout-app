import { Tabs } from 'expo-router';
import { Map, MessageCircle, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateCollectionModal from '../../components/CreateCollectionModal';
import CreateGroupModal from '../../components/CreateGroupModal';
import DeleteCollectionsModal from '../../components/DeleteCollectionsModal';
import LocationDetailModal from '../../components/LocationDetailModal';
import FilterVibesModal from '../../components/FilterVibesModal';
import SaveLocationModal from '../../components/SaveLocationModal';
import { ModalProvider, useModal } from '../../contexts/ModalContext';
import Badge from '../../components/Badge';

function TabLayoutContent() {

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const {
        showCreateModal,
        showDeleteModal,
        showCreateGroupModal,
        showLocationDetailModal,
        showSaveLocationModal,
        deleteModalCollections,
        locationDetailModalData,
        saveLocationModalData,
        closeCreateModal,
        closeDeleteModal,
        closeCreateGroupModal,
        closeLocationDetailModal,
        closeSaveLocationModal,
        closeFilterVibesModal,
        onCreateSuccess,
        onDeleteSuccess,
        onCreateGroupSuccess,
        onLocationDetailSuccess,
        onSaveLocationSuccess,
        showFilterVibesModal,
        onFilterVibesApply
    } = useModal();

    // State for native modules
    const [LinearGradient, setLinearGradient] = useState<any>(null);
    const [MaskedView, setMaskedView] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load native modules
    useEffect(() => {
        const loadNativeModules = async () => {
            try {
                // Skip loading on web platform
                if (Platform.OS === 'web') {
                    setIsLoading(false);
                    return;
                }

                const [LinearGradientModule, MaskedViewModule] = await Promise.all([
                    import('expo-linear-gradient'),
                    import('@react-native-masked-view/masked-view')
                ]);

                setLinearGradient(() => LinearGradientModule.LinearGradient);
                setMaskedView(() => MaskedViewModule.default);
            } catch (error) {
                // Native modules not available, fallback to regular icons
            } finally {
                setIsLoading(false);
            }
        };

        loadNativeModules();
    }, []);

    // Gradient colors for active tab
    const GRADIENT_COLORS = ["#FAA307", "#F48C06", "#DC2F02", "#9D0208"];
    const GRADIENT_LOCATIONS = [0, 0.31, 0.69, 1];
    const GRADIENT_START = { x: 0, y: 1 };
    const GRADIENT_END = { x: 1, y: 0 };

    // Custom Gradient Icon Component
    const GradientIcon = ({ name, size, focused }: { name: "map" | "chatbubble" | "person", size: number, focused: boolean }) => {
        const getIconComponent = () => {
            switch (name) {
                case "map":
                    return Map;
                case "chatbubble":
                    return MessageCircle;
                case "person":
                    return User;
                default:
                    return Map;
            }
        };

        const IconComponent = getIconComponent();

        if (!focused) {
            return <IconComponent size={size} color={isDark ? '#9CA3AF' : '#6B7280'} />;
        }

        // Fallback for web or when native modules are not available
        if (Platform.OS === 'web' || isLoading || !LinearGradient || !MaskedView) {
            return <IconComponent size={size} color="#FAA307" />;
        }

        // Native gradient implementation
        try {
            return (
                <MaskedView
                    style={{ width: size, height: size }}
                    maskElement={
                        <IconComponent
                            size={size}
                            color="white"
                        />
                    }
                >
                    <LinearGradient
                        colors={GRADIENT_COLORS}
                        locations={GRADIENT_LOCATIONS}
                        start={GRADIENT_START}
                        end={GRADIENT_END}
                        style={{ flex: 1 }}
                    />
                </MaskedView>
            );
        } catch (error) {
            // Error rendering gradient, fallback to regular icon
            return <IconComponent size={size} color="#FAA307" />;
        }
    };

    return (
        <>
            <Tabs
                initialRouteName="discover"
                screenOptions={{
                    tabBarActiveTintColor: 'transparent', // Disable default active color
                    tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
                    tabBarStyle: {
                        backgroundColor: isDark ? '#000000' : '#FFFFFF',
                        borderTopColor: isDark ? '#374151' : '#E5E7EB',
                        height: 50 + insets.bottom,
                        paddingBottom: insets.bottom,
                        paddingTop: 8,
                    },
                    headerShown: false, // Bỏ header của tất cả tabs
                    tabBarShowLabel: false, // Bỏ title bên dưới icons
                }}
            >
                <Tabs.Screen
                    name="discover"
                    options={{
                        title: 'Discover',
                        tabBarIcon: ({ color, size, focused }) => (
                            <GradientIcon name="map" size={28} focused={focused} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="chat"
                    options={{
                        title: 'Chat',
                        tabBarIcon: ({ color, size, focused }) => (
                            <View style={{ position: 'relative' }}>
                                <GradientIcon name="chatbubble" size={28} focused={focused} />
                                <Badge size="small" />
                            </View>
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size, focused }) => (
                            <GradientIcon name="person" size={28} focused={focused} />
                        ),
                    }}
                />
            </Tabs>

            {/* Global Modals - Render above tabs */}
            <CreateCollectionModal
                isVisible={showCreateModal}
                onClose={closeCreateModal}
                onSuccess={() => {
                    onCreateSuccess?.();
                    closeCreateModal();
                }}
            />

            <DeleteCollectionsModal
                isVisible={showDeleteModal}
                onClose={closeDeleteModal}
                onSuccess={() => {
                    onDeleteSuccess?.();
                    closeDeleteModal();
                }}
                collections={deleteModalCollections}
            />

            <CreateGroupModal
                isVisible={showCreateGroupModal}
                onClose={closeCreateGroupModal}
                onSuccess={() => {
                    onCreateGroupSuccess?.();
                    closeCreateGroupModal();
                }}
            />

            <LocationDetailModal
                isVisible={showLocationDetailModal}
                onClose={closeLocationDetailModal}
                location={locationDetailModalData}
                onSuccess={() => {
                    onLocationDetailSuccess?.();
                    // Không tự động đóng LocationDetailModal khi onSuccess được gọi
                    // closeLocationDetailModal();
                }}
            />

            <SaveLocationModal
                isVisible={showSaveLocationModal}
                onClose={closeSaveLocationModal}
                location={saveLocationModalData}
                onSuccess={() => {
                    onSaveLocationSuccess?.();
                    closeSaveLocationModal();
                }}
            />

            <FilterVibesModal
                isVisible={showFilterVibesModal}
                onClose={closeFilterVibesModal}
                onApply={(filters) => {
                    onFilterVibesApply?.(filters);
                    closeFilterVibesModal();
                }}
            />
        </>
    );
}

export default function TabLayout() {
    return (
        <ModalProvider>
            <TabLayoutContent />
        </ModalProvider>
    );
}
