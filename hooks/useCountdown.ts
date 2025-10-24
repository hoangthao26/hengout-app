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

    const calculateTimeRemaining = (endTime: string): { timeString: string; isExpired: boolean; totalSeconds: number } => {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end.getTime() - now.getTime();
        const totalSeconds = Math.floor(diff / 1000);

        if (diff <= 0) {
            return { timeString: 'Đã hết hạn', isExpired: true, totalSeconds: 0 };
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeString = '';
        if (hours > 0) {
            timeString = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            timeString = `${minutes}m ${seconds}s`;
        } else {
            timeString = `${seconds}s`;
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


