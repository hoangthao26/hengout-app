import React from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../contexts/ToastContext';
import SimpleToast from './SimpleToast';

const ToastContainer: React.FC = () => {
    const { toasts, hideToast } = useToast();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: 'transparent', // Transparent background để toast nổi bật
                    paddingTop: insets.top, // Safe area + extra padding
                },
            ]}
            pointerEvents="box-none"
        >
            {toasts.map((toast) => (
                <SimpleToast
                    key={toast.id}
                    toast={toast}
                    onHide={hideToast}
                    onActionPress={(action) => {
                        action?.onPress();
                        hideToast(toast.id);
                    }}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, // Start from very top
        left: 0,
        right: 0,
        zIndex: 99999, // Much higher z-index
        elevation: 1000, // Android elevation
    },
});

export default ToastContainer;

