import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface UseAutoScrollOptions {
    messages: any[];
    threshold?: number;
    autoScrollDelay?: number;
}

interface UseAutoScrollReturn {
    // Refs
    flatListRef: React.RefObject<FlatList | null>;

    // State
    isAtBottom: boolean;
    showScrollButton: boolean;

    // Actions
    scrollToBottom: () => void;
    handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

    // Auto scroll effect
    autoScrollToBottom: () => void;
}

export const useAutoScroll = ({
    messages,
    threshold = 100,
    autoScrollDelay = 100
}: UseAutoScrollOptions): UseAutoScrollReturn => {
    const flatListRef = useRef<FlatList>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Handle scroll events
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const isAtBottomNow = contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold;

        setIsAtBottom(isAtBottomNow);
        setShowScrollButton(!isAtBottomNow && contentSize.height > layoutMeasurement.height);

        // Update auto scroll preference based on user scroll behavior
        if (isAtBottomNow) {
            setShouldAutoScroll(true);
        } else if (contentOffset.y < contentSize.height - layoutMeasurement.height - threshold * 2) {
            // User scrolled up significantly, disable auto scroll
            setShouldAutoScroll(false);
        }
    }, [threshold]);

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setShouldAutoScroll(true);
    }, []);

    // Auto scroll to bottom when new messages arrive
    const autoScrollToBottom = useCallback(() => {
        if (shouldAutoScroll && isAtBottom) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, autoScrollDelay);
        }
    }, [shouldAutoScroll, isAtBottom, autoScrollDelay]);

    // Auto scroll when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            autoScrollToBottom();
        }
    }, [messages.length, autoScrollToBottom]);

    // Reset auto scroll when messages are cleared
    useEffect(() => {
        if (messages.length === 0) {
            setShouldAutoScroll(true);
            setIsAtBottom(true);
            setShowScrollButton(false);
        }
    }, [messages.length]);

    return {
        flatListRef,
        isAtBottom,
        showScrollButton,
        handleScroll,
        scrollToBottom,
        autoScrollToBottom
    };
};
