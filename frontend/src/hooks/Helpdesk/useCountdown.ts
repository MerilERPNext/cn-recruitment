import { useEffect, useState } from "react";

export function useCountdown(targetDate: Date) {
    const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(getTimeLeft(targetDate));
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return timeLeft;
}

function getTimeLeft(targetDate: Date) {
    const now = new Date().getTime();
    const diff = targetDate.getTime() - now;

    if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isExpired: false,
    };
}