import { formatGap, useRunningClock } from "./useRunningClock";

export interface SlaCountdown {
    /** Running clock while the target is live, otherwise its outcome */
    text: string;
    tone: "pending" | "fulfilled" | "breached" | "paused" | "none";
    tooltip?: string;
}

interface SlaCountdownArgs {
    /** response_by for FRT, resolution_by for TAT -- already shift-aware */
    dueOn?: string | null;
    /** first_responded_on for FRT, resolution_date for TAT */
    metOn?: string | null;
    serverNow?: string | null;
    /** SLA clock is on hold (ticket awaiting the customer) */
    paused?: boolean;
}

/**
 * Live view of an SLA target: counts down to `dueOn` while it is still open,
 * then settles on whether it was met.
 *
 * The target itself is calculated by the SLA in its working hours, so the
 * countdown lands on zero exactly when the SLA breaches.
 */
export function useSlaCountdown({
    dueOn,
    metOn,
    serverNow,
    paused = false,
}: SlaCountdownArgs): SlaCountdown {
    const isSettled = Boolean(metOn) || !dueOn;
    const remaining = useRunningClock(dueOn, serverNow, !isSettled && !paused);

    if (!dueOn) return { text: "-", tone: "none" };

    if (metOn) {
        const met = new Date(metOn.replace(" ", "T")).getTime();
        const due = new Date(dueOn.replace(" ", "T")).getTime();
        const gap = formatGap(Math.abs(due - met) / 1000);
        return met <= due
            ? { text: "Fulfilled", tone: "fulfilled", tooltip: `Met ${gap} before the ${dueOn} target` }
            : { text: "SLA Breached", tone: "breached", tooltip: `Met ${gap} after the ${dueOn} target` };
    }

    if (paused) {
        return { text: "Paused", tone: "paused", tooltip: `Clock on hold. Target ${dueOn}` };
    }

    if (remaining !== null && remaining > 0) {
        return {
            text: formatGap(remaining),
            tone: "pending",
            tooltip: `Due ${dueOn}`,
        };
    }

    return { text: "SLA Breached", tone: "breached", tooltip: `Target ${dueOn} passed` };
}
