
export const showCloseTicketButton = (ticket_status: string, isResolution: boolean = false): boolean => {
    if (isResolution) {
        return !["Open"].includes(ticket_status);
    }
    return !["Open", "Reopened", "Closed", "Archived", "Requested Closure"].includes(ticket_status);
}
