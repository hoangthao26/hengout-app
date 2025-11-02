import { useState, useEffect, useRef } from 'react';

interface UseCountdownOptions {
    endTime: string;
    onExpired?: () => void;
    updateInterval?: number; // milliseconds, default 1000 (1 second)
}

interface CountdownResult {
    timeRemaining: string;
    isExpired: boolean;
    totalSeconds: number;
}

export const useCountdown = ({
    endTime,
    onExpired,
    updateInterval = 1000
}: UseCountdownOptions): CountdownResult => {
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isExpired, setIsExpired] = useState<boolean>(false);
    const [totalSeconds, setTotalSeconds] = useState<number>(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Calculate remaining time until end time with formatted string output
     * 
     * Time calculation algorithm:
     * 1. Gets current time and target end time
     * 2. Calculates difference in milliseconds
     * 3. Converts to total seconds (for programmatic use)
     * 4. Extracts hours, minutes, seconds using modulo arithmetic
     * 
     * Time extraction (modulo-based):
     * - Hours: diff / (1000ms * 60s * 60m) = total hours
     * - Minutes: (diff % hourInMs) / (1000ms * 60s) = remaining minutes
     * - Seconds: (diff % minuteInMs) / 1000ms = remaining seconds
     * 
     * Formatting strategy (adaptive display):
     * - Hours > 0: "Xh Ym Zs" (shows all units)
     * - Minutes > 0: "Ym Zs" (hides hours)
     * - Seconds only: "Zs" (minimal display)
     * 
     * Adaptive formatting prevents cluttered display:
     * - For long durations: Shows all units
     * - For short durations: Shows only relevant units
     * 
     * Expiry detection:
     * - If diff <= 0: Time has expired
     * - Returns Vietnamese "Đã hết hạn" message
     * - Sets totalSeconds to 0 (prevents negative values)
     * 
     * @param endTime - ISO string or Date parseable string for target time
     * @returns Object with formatted time string, expiry status, and total seconds
     */
    const calculateTimeRemaining = (endTime: string): { timeString: string; isExpired: boolean; totalSeconds: number } => {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end.getTime() - now.getTime();
        const totalSeconds = Math.floor(diff / 1000);

        // Early return if expired (prevents negative time display)
        if (diff <= 0) {
            return { timeString: 'Đã hết hạn', isExpired: true, totalSeconds: 0 };
        }

        // Extract time components using modulo arithmetic
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Adaptive formatting: Show only relevant units
        let timeString = '';
        if (hours > 0) {
            timeString = `${hours}h ${minutes}m ${seconds}s`; // Full format
        } else if (minutes > 0) {
            timeString = `${minutes}m ${seconds}s`; // Hide hours
        } else {
            timeString = `${seconds}s`; // Minimal format
        }

        return { timeString, isExpired: false, totalSeconds };
    };

    useEffect(() => {
        if (!endTime) return;

        // Initial calculation
        const initialResult = calculateTimeRemaining(endTime);
        setTimeRemaining(initialResult.timeString);
        setIsExpired(initialResult.isExpired);
        setTotalSeconds(initialResult.totalSeconds);

        // If already expired, call onExpired immediately
        if (initialResult.isExpired && onExpired) {
            onExpired();
            return;
        }

        // Set up interval for updates
        intervalRef.current = setInterval(() => {
            const result = calculateTimeRemaining(endTime);
            setTimeRemaining(result.timeString);
            setIsExpired(result.isExpired);
            setTotalSeconds(result.totalSeconds);

            // Call onExpired when time expires
            if (result.isExpired && onExpired) {
                onExpired();
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            }
        }, updateInterval);

        // Cleanup interval on unmount or endTime change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [endTime, onExpired, updateInterval]);

    return {
        timeRemaining,
        isExpired,
        totalSeconds
    };
};


