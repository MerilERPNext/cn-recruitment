
export const showCloseTicketButton = (ticket_status: string, isResolution: boolean = false): boolean => {
    if (isResolution) {
        return !["Open"].includes(ticket_status);
    }
    return !["Open", "Reopened", "Closed", "Archived", "Requested Closure"].includes(ticket_status);
}

export const getStatusBadgeConfig = (
    status: string,
): { label: string; backgroundColor: string; textColor: string } => {
    switch (status) {
        case "Open":
            return {
                label: "Open",
                backgroundColor: "bg-blue-100",
                textColor: "text-blue-800",
            };

        case "Replied":
            return {
                label: "Replied",
                backgroundColor: "bg-cyan-100",
                textColor: "text-cyan-800",
            };

        case "Resolved":
            return {
                label: "Resolved",
                backgroundColor: "bg-green-100",
                textColor: "text-green-800",
            };

        case "Closed":
            return {
                label: "Closed",
                backgroundColor: "bg-slate-100",
                textColor: "text-slate-700",
            };

        case "Reopened":
            return {
                label: "Reopened",
                backgroundColor: "bg-purple-100",
                textColor: "text-purple-800",
            };

        case "Revoked":
            return {
                label: "Revoked",
                backgroundColor: "bg-red-100",
                textColor: "text-red-800",
            };

        case "Awaiting User Response":
            return {
                label: "Awaiting User Response",
                backgroundColor: "bg-amber-100",
                textColor: "text-amber-800",
            };

        case "Not Assigned":
            return {
                label: "Not Assigned",
                backgroundColor: "bg-zinc-100",
                textColor: "text-zinc-700",
            };

        case "Archived":
            return {
                label: "Archived",
                backgroundColor: "bg-neutral-200",
                textColor: "text-neutral-800",
            };

        case "Requested Closure":
            return {
                label: "Requested Closure",
                backgroundColor: "bg-orange-100",
                textColor: "text-orange-800",
            };

        default:
            return {
                label: status,
                backgroundColor: "bg-gray-100",
                textColor: "text-gray-700",
            };
    }
};