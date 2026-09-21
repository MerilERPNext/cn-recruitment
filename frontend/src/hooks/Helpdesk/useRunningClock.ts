import { useEffect, useMemo, useState } from "react";

/** Frappe sends naive datetimes in site time; normalise for Date parsing. */
export function toTimestamp(value?: string | null): number | null {
    if (!value) return null;
    const ms = new Date(value.replace(" ", "T")).getTime();
    return Number.isNaN(ms) ? null : ms;
}

export function formatGap(totalSeconds: number): string {
    const seconds = Math.max(Math.floor(totalSeconds), 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m ${seconds % 60}s`;
}

// One interval for the whole page. A list of 20 rows runs three clocks each,
// and sixty independent timers would drift apart and waste wake-ups.
const listeners = new Set<(now: number) => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: (now: number) => void): () => void {
    listeners.add(listener);
    if (!ticker) {
        ticker = setInterval(() => {
            const now = Date.now();
            listeners.forEach((fn) => fn(now));
        }, 1000);
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size && ticker) {
            clearInterval(ticker);
            ticker = null;
        }
    };
}

/**
 * Seconds remaining until `target`, ticking once a second. Negative once the
 * target has passed; null when there is no target.
 *
 * The deadline is pinned to the payload rather than recomputed per render: an
 * unstable deadline advances in lockstep with the clock, which reads as a
 * countdown that never moves.
 */
export function useRunningClock(
    target?: string | null,
    serverNow?: string | null,
    active: boolean = true
): number | null {
    const targetAt = toTimestamp(target);
    const serverAt = toTimestamp(serverNow);

    const deadline = useMemo(() => {
        if (targetAt === null) return null;
        // Correct for the gap between the server's clock and this browser's.
        return targetAt + (serverAt === null ? 0 : Date.now() - serverAt);
    }, [targetAt, serverAt]);

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!active || deadline === null) return;
        return subscribe(setNow);
    }, [active, deadline]);

    return deadline === null ? null : (deadline - now) / 1000;
}
