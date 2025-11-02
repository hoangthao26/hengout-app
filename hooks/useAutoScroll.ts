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

    /**
     * Handle scroll events with intelligent auto-scroll detection and user behavior tracking
     * 
     * Scroll position calculation:
     * - contentOffset.y: Current scroll position (pixels from top)
     * - layoutMeasurement.height: Visible viewport height
     * - contentSize.height: Total content height
     * - Threshold: Tolerance zone for "at bottom" detection (default 100px)
     * 
     * At-bottom detection:
     * - Formula: contentOffset.y + viewportHeight >= contentHeight - threshold
     * - Uses threshold to allow small gaps without disabling auto-scroll
     * - Prevents false negatives from floating-point precision
     * 
     * Auto-scroll behavior tracking:
     * 1. If at bottom: Enable auto-scroll (user wants to see new messages)
     * 2. If scrolled up significantly (2x threshold): Disable auto-scroll (user reading history)
     * 3. Small scrolls (< 2x threshold): Preserves current auto-scroll state
     * 
     * Scroll button visibility:
     * - Shows button if NOT at bottom AND content is taller than viewport
     * - Hides button if at bottom (no need to scroll) or content fits in viewport
     * 
     * @param event - React Native scroll event with position and size data
     */
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        
        // Calculate if user is at bottom (with threshold tolerance)
        const isAtBottomNow = contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold;

        setIsAtBottom(isAtBottomNow);
        
        // Show scroll button only if not at bottom and content is scrollable
        setShowScrollButton(!isAtBottomNow && contentSize.height > layoutMeasurement.height);

        // Smart auto-scroll behavior: Track user intent based on scroll position
        if (isAtBottomNow) {
            // User scrolled to bottom: Re-enable auto-scroll (wants to see new messages)
            setShouldAutoScroll(true);
        } else if (contentOffset.y < contentSize.height - layoutMeasurement.height - threshold * 2) {
            // User scrolled up significantly (2x threshold): Disable auto-scroll (reading history)
            setShouldAutoScroll(false);
        }
        // Small scrolls (< 2x threshold): Preserve current auto-scroll state
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
