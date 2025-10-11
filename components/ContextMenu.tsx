import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { MoreHorizontal, LucideIcon } from 'lucide-react-native';

export interface MenuAction {
    id: string;
    title: string;
    icon: LucideIcon;
    onPress: () => void;
    destructive?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    actions: MenuAction[];
    disabled?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ actions, disabled = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const isDark = useColorScheme() === 'dark';

    const handlePress = (event: any) => {
        if (disabled) return;

        // Get the position of the touch
        const { pageX, pageY } = event.nativeEvent;
        setMenuPosition({ x: pageX, y: pageY });
        setIsVisible(true);
    };

    const handleActionPress = (action: MenuAction) => {
        setIsVisible(false);
        action.onPress();
    };

    const handleBackdropPress = () => {
        setIsVisible(false);
    };

    const getMenuStyle = () => {
        const screenWidth = 400; // Approximate screen width
        const menuWidth = 200;
        const menuHeight = actions.length * 50 + 16; // 50px per item + padding

        let left = menuPosition.x - menuWidth + 20; // Offset to align with 3-dots
        let top = menuPosition.y - 10; // Small offset from touch point

        // Ensure menu stays within screen bounds
        if (left < 10) left = 10;
        if (left + menuWidth > screenWidth - 10) {
            left = screenWidth - menuWidth - 10;
        }
        if (top < 50) top = 50; // Below status bar
        if (top + menuHeight > 700) { // Approximate screen height
            top = menuPosition.y - menuHeight - 10;
        }

        return {
            position: 'absolute' as const,
            left,
            top,
            width: menuWidth,
        };
    };

    return (
        <>
            <TouchableOpacity
                onPress={handlePress}
                style={styles.triggerButton}
                disabled={disabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <MoreHorizontal
                    size={26}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                />
            </TouchableOpacity>

            <Modal
                visible={isVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleBackdropPress}
            >
                <Pressable
                    style={styles.backdrop}
                    onPress={handleBackdropPress}
                >
                    <View
                        style={[
                            styles.menu,
                            getMenuStyle(),
                            {
                                backgroundColor: isDark ? '#374151' : '#FFFFFF',
                                shadowColor: isDark ? '#000000' : '#000000',
                            },
                        ]}
                    >
                        {actions.map((action, index) => (
                            <TouchableOpacity
                                key={action.id}
                                style={[
                                    styles.menuItem,
                                    index === actions.length - 1 && styles.lastMenuItem,
                                    action.disabled && styles.disabledMenuItem,
                                ]}
                                onPress={() => !action.disabled && handleActionPress(action)}
                                disabled={action.disabled}
                            >
                                <View style={styles.menuItemContent}>
                                    <action.icon
                                        size={20}
                                        color={
                                            action.disabled
                                                ? isDark ? '#4B5563' : '#9CA3AF'
                                                : action.destructive
                                                    ? '#EF4444'
                                                    : isDark ? '#FFFFFF' : '#1F2937'
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.menuItemText,
                                            {
                                                color: action.disabled
                                                    ? isDark ? '#4B5563' : '#9CA3AF'
                                                    : action.destructive
                                                        ? '#EF4444'
                                                        : isDark ? '#FFFFFF' : '#1F2937',
                                            },
                                        ]}
                                    >
                                        {action.title}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    triggerButton: {
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        minWidth: 36,
        minHeight: 36,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    menu: {
        borderRadius: 12,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    menuItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    lastMenuItem: {
        borderBottomWidth: 0,
    },
    disabledMenuItem: {
        opacity: 0.5,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
});

export default ContextMenu;
