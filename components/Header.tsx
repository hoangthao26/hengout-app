import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import BackButton from './BackButton';

interface HeaderProps {
    title: string;
    onBackPress?: () => void;
    rightIcon?: {
        icon: LucideIcon;
        size?: number;
        onPress?: () => void;
        disabled?: boolean;
    };
    // NEW: Support multiple right icons
    rightIcons?: Array<{
        icon: LucideIcon;
        size?: number;
        onPress?: () => void;
        disabled?: boolean;
    }>;
    showBackButton?: boolean;
    // NEW: Custom header content
    customContent?: React.ReactNode;
    // NEW: Right-side custom content next to title
    rightContent?: React.ReactNode;
    // NEW: Variants
    variant?: 'default' | 'profile' | 'settings';
}

const Header: React.FC<HeaderProps> = ({
    title,
    onBackPress,
    rightIcon,
    rightIcons,
    showBackButton = true,
    customContent,
    rightContent,
    variant = 'default',
}) => {
    const isDark = useColorScheme() === 'dark';

    // If custom content is provided, render it instead of default header
    if (customContent) {
        return (
            <View style={[styles.header, styles[variant]]}>
                {customContent}
            </View>
        );
    }

    // Determine which right icons to use
    const iconsToRender = rightIcons || (rightIcon ? [rightIcon] : []);

    return (
        <View style={[styles.header, styles[variant]]}>
            {/* Left: Back Button */}
            <View style={styles.leftSection}>
                {showBackButton ? (
                    <BackButton onPress={onBackPress || (() => { })} />
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {/* Center: Title */}
            <View style={styles.centerSection}>
                <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {title}
                </Text>
            </View>

            {/* Right: Custom content or Icons or Spacer */}
            <View style={styles.rightSection}>
                {rightContent ? (
                    rightContent
                ) : iconsToRender.length > 0 ? (
                    <View style={styles.rightIconsContainer}>
                        {iconsToRender.map((icon, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.headerIcon}
                                onPress={icon.onPress}
                                disabled={icon.disabled}
                                activeOpacity={icon.disabled ? 1 : 0.7}
                            >
                                <icon.icon
                                    size={icon.size || 28}
                                    color={icon.disabled
                                        ? (isDark ? '#4B5563' : '#9CA3AF')
                                        : (isDark ? '#FFFFFF' : '#000000')
                                    }
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 8,
        minHeight: 40,
    },
    // Variants
    default: {
        // Default header style
    },
    profile: {
        paddingHorizontal: 20,
    },
    settings: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    leftSection: {
        width: 60,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    rightSection: {
        width: 60,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 22,
    },
    headerIcon: {
        padding: 8,
    },
    headerSpacer: {
        width: 44,
        height: 44,
    },
    // NEW: Container for multiple right icons
    rightIconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});

export default Header;
