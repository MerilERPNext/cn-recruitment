
export const showCloseTicketButton = (ticket_status: string): boolean => {
    return !["Open", "Reopened", "Closed"].includes(ticket_status);
}
