import { useEffect, useMemo, useState } from "react";
import type { TicketEscalation } from "../useHelpDeskTickets";

export interface EscalationDisplay {
    /** Running clock to the escalation, e.g. "15h 12m 47s" */
    text: string;
    /** Same gap counted in the SLA's shift hours only, for the tooltip */
    businessText: string | null;
    /** "paused" means the desk is shut right now, though the clock still runs */
    tone: "pending" | "paused" | "breached" | "none";
}

/** Frappe sends naive datetimes in site time; normalise for Date parsing. */
function toTimestamp(value?: string | null): number | null {
    if (!value) return null;
    const ms = new Date(value.replace(" ", "T")).getTime();
    return Number.isNaN(ms) ? null : ms;
}

function formatGap(totalSeconds: number): string {
    const seconds = Math.max(Math.floor(totalSeconds), 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m ${seconds % 60}s`;
}

/**
 * Running clock to the ticket's next SLA escalation.
 *
 * The escalation *due time* is shift-aware -- the Escalation Point is spent in
 * the SLA's working hours, so a 4h point at 16:00 comes due late next morning,
 * not at 20:00. The countdown to it then runs continuously, so it lands on zero
 * at the exact moment the escalation fires.
 */
export function useEscalationCountdown(
    escalation?: TicketEscalation | null
): EscalationDisplay {
    const isPending = escalation?.status === "pending";
    const dueAt = toTimestamp(escalation?.due_on);
    const serverNow = toTimestamp(escalation?.server_now);

    // Count against the server's clock, not the browser's: a machine in another
    // timezone or with a skewed clock would otherwise show the wrong gap.
    // Pinned to the payload, NOT recomputed per render -- an unstable deadline
    // would restart the interval on every tick, so the clock never advanced.
    const deadline = useMemo(() => {
        if (dueAt === null) return null;
        const skew = serverNow === null ? 0 : Date.now() - serverNow;
        return dueAt + skew;
    }, [dueAt, serverNow]);

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isPending || deadline === null) return;

        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [isPending, deadline]);

    if (!escalation || escalation.status === "none") {
        return { text: "N/A", businessText: null, tone: "none" };
    }

    const remainingSeconds =
        deadline === null ? 0 : (deadline - now) / 1000;

    if (escalation.status === "breached" || remainingSeconds <= 0) {
        return { text: "SLA Breached", businessText: null, tone: "breached" };
    }

    return {
        text: formatGap(remainingSeconds),
        businessText:
            escalation.remaining_seconds === null
                ? null
                : formatGap(escalation.remaining_seconds),
        tone: escalation.is_working_now ? "pending" : "paused",
    };
}
