import { formatGap, useRunningClock } from "./useRunningClock";
import type { TicketEscalation } from "../useHelpDeskTickets";

export interface EscalationDisplay {
    /** Running clock to the escalation, e.g. "15h 12m 47s" */
    text: string;
    /** Same gap counted in the SLA's shift hours only, for the tooltip */
    businessText: string | null;
    /** "paused" means the desk is shut right now, though the clock still runs */
    tone: "pending" | "paused" | "breached" | "none";
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

    const remaining = useRunningClock(
        escalation?.due_on,
        escalation?.server_now,
        isPending
    );

    if (!escalation || escalation.status === "none") {
        return { text: "N/A", businessText: null, tone: "none" };
    }

    // On hold: an escalation is still ahead, it just is not counting down.
    if (escalation.status === "paused") {
        return { text: "Paused", businessText: null, tone: "paused" };
    }

    if (escalation.status === "breached" || remaining === null || remaining <= 0) {
        return { text: "SLA Breached", businessText: null, tone: "breached" };
    }

    return {
        text: formatGap(remaining),
        businessText:
            escalation.remaining_seconds === null
                ? null
                : formatGap(escalation.remaining_seconds),
        tone: escalation.is_working_now ? "pending" : "paused",
    };
}
