import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseModalStateOptions {
    onOpen?: () => void;
    onClose?: () => void;
    autoCloseOnUnfocus?: boolean;
    autoCloseOnUnmount?: boolean;
}

export const useModalState = (
    initialValue: boolean = false,
    options: UseModalStateOptions = {}
) => {
    const [isVisible, setIsVisible] = useState(initialValue);
    const isMountedRef = useRef(true);
    const navigation = useNavigation();
    const { onOpen, onClose, autoCloseOnUnfocus = true, autoCloseOnUnmount = true } = options;

    // Ensure component is mounted
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Auto close on unmount
    useEffect(() => {
        if (autoCloseOnUnmount) {
            return () => {
                if (isMountedRef.current) {
                    setIsVisible(false);
                }
            };
        }
    }, [autoCloseOnUnmount]);

    // Auto close when screen loses focus
    useFocusEffect(
        useCallback(() => {
            if (autoCloseOnUnfocus) {
                return () => {
                    if (isMountedRef.current) {
                        setIsVisible(false);
                    }
                };
            }
        }, [autoCloseOnUnfocus, isVisible])
    );

    // Handle navigation events to close modal before leaving
    useEffect(() => {
        if (autoCloseOnUnfocus) {
            const unsubscribe = navigation.addListener('beforeRemove', () => {
                if (isMountedRef.current) {
                    setIsVisible(false);
                }
            });

            return unsubscribe;
        }
    }, [navigation, autoCloseOnUnfocus]);

    const openModal = useCallback(() => {
        if (isMountedRef.current) {
            setIsVisible(true);
            onOpen?.();
        }
    }, [onOpen]);

    const closeModal = useCallback(() => {
        if (isMountedRef.current) {
            setIsVisible(false);
            onClose?.();
        }
    }, [onClose]);

    const toggleModal = useCallback(() => {
        if (isVisible) {
            closeModal();
        } else {
            openModal();
        }
    }, [isVisible, openModal, closeModal]);

    const resetModal = useCallback(() => {
        if (isMountedRef.current) {
            setIsVisible(false);
        }
    }, []);

    return {
        isVisible,
        openModal,
        closeModal,
        toggleModal,
        resetModal,
        setIsVisible,
    };
};
