import React from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../contexts/ToastContext';
import SimpleToast from './SimpleToast';
import MessageToast from './MessageToast';
import { ChatMessage, ChatConversation } from '../types/chat';

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
            {toasts.map((toast) => {
                // Check if this is a message notification toast
                const isMessageToast = (toast as any).type === 'message' &&
                    (toast as any).conversationData &&
                    (toast as any).messageData;

                if (isMessageToast) {
                    return (
                        <MessageToast
                            key={toast.id}
                            conversation={(toast as any).conversationData}
                            message={(toast as any).messageData}
                            onPress={() => {
                                toast.onPress?.();
                                hideToast(toast.id);
                            }}
                            onDismiss={() => hideToast(toast.id)}
                            duration={toast.duration || 5000}
                        />
                    );
                }

                // Regular toast
                return (
                    <SimpleToast
                        key={toast.id}
                        toast={toast}
                        onHide={hideToast}
                        onPress={() => {
                            // Call the original onPress
                            toast.onPress?.();
                            // Hide the toast after press
                            hideToast(toast.id);
                        }}
                        onActionPress={(action) => {
                            action?.onPress();
                            hideToast(toast.id);
                        }}
                    />
                );
            })}
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

