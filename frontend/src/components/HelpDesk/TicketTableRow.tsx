import { HDTicket } from "../../hooks/useHelpDeskTickets";
import { useEscalationCountdown } from "../../hooks/Helpdesk/useEscalationCountdown";
import { Typography } from "../shared/atoms/Typography";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import Badge from "../shared/Badge";
import HDActionPill from "./HDActionPills";
import { showCloseTicketButton } from "./hdelpdeskUtils";

interface TicketTableRowProps {
    ticket: HDTicket;
    userLookup?: Map<string, string>;
    employeeByEmail?: Map<string, string>;
    getStatusBadgeConfig: (status: string) => {
        label: string;
        backgroundColor: string;
        textColor: string;
    };
    formatToIndianDate: (date: string) => string;
    getAssignedEmail: (assignStr: string | null) => string | null;
    getAssignedName: (
        assignStr: string | null,
        userLookup?: Map<string, string>,
    ) => string;
    getCategoryName: (categoryId: string | undefined) => string;
    formateDateDiff: (date1: string, date2: string) => string;
    onReply: (ticket: HDTicket) => void;
    onClose: (ticket: HDTicket) => void;
    onRevoke: (ticket: HDTicket) => void;
    onReopen: (ticket: HDTicket) => void;
    onRowClick?: (ticket: HDTicket) => void;
    permRevoke?: boolean;
    permCloseTicket?: boolean;
    permReply?: boolean;
    permReopen?: boolean;
}

const TicketTableRow = ({
    ticket,
    userLookup,
    employeeByEmail,
    getStatusBadgeConfig,
    formatToIndianDate,
    getAssignedEmail,
    getAssignedName,
    getCategoryName,
    formateDateDiff,
    onReply,
    onClose,
    onRevoke,
    onReopen,
    onRowClick,
    permRevoke = true,
    permCloseTicket = true,
    permReply = true,
    permReopen = true,
}: TicketTableRowProps) => {
    // Remaining Escalation Business Time -- ticks only during support hours.
    const escalation = useEscalationCountdown(ticket.escalation);
    return (
        <tr
            key={ticket.name}
            className={`border-t text-center border-gray-50 hover:bg-primary/20 transition-colors ${onRowClick ? "cursor-pointer" : ""
                }`}
            onClick={() => onRowClick?.(ticket)}
        >
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {ticket.name}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {ticket.subject}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {getCategoryName(ticket.custom_category)}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {getCategoryName(ticket.custom_sub_category_name || ticket.custom_sub_category)}
                </Typography>
            </td>
            <td className="px-4 py-3 flex justify-center">
                {(() => {
                    const badgeConfig = getStatusBadgeConfig(ticket.status);
                    return (
                        <Badge
                            size="md"
                            label={badgeConfig.label}
                            backgroundColor={badgeConfig.backgroundColor}
                            textColor={badgeConfig.textColor}
                        />
                    );
                })()}
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {ticket.no_of_comments}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {ticket.user_type}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {formateDateDiff(ticket.response_by, ticket.creation)}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                    {formateDateDiff(ticket.resolution_by, ticket.creation)}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <WrapperHoverCard employeeId={ticket.raise_by_id} placement="center-left" >
                    <Typography
                        variant="bodySmall"
                        color="body1"
                        className="hover:text-primary cursor-pointer"
                    >
                        {ticket.raise_by_name}
                    </Typography>
                </WrapperHoverCard>
            </td>
            <td className="px-4 py-3">
                <Typography
                    variant="bodySmall"
                    color="body1"
                >
                    {<div>
                        <span
                            title={
                                ticket.escalation?.status === "pending" && ticket.escalation?.due_on
                                    ? `${ticket.escalation.next_level_name} due ${ticket.escalation.due_on}`
                                        + (escalation.businessText ? ` — ${escalation.businessText} of shift time left` : "")
                                        + (ticket.escalation.is_working_now ? "" : " (desk currently closed)")
                                    : undefined
                            }
                            className={
                                escalation.tone === "breached"
                                    ? "text-red-600 font-semibold"
                                    : escalation.tone === "paused"
                                        ? "text-blue-600"
                                        : escalation.tone === "pending"
                                            ? "text-amber-600"
                                            : ""
                            }
                        >
                            {escalation.text}
                        </span>
                    </div>}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography
                    variant="bodySmall"
                    color="body1"
                >
                    {ticket.agreement_status}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <WrapperHoverCard
                    employeeId={employeeByEmail?.get(
                        getAssignedEmail(ticket._assign) || "",
                    )}
                    placement="bottom-left"
                >
                    <Typography variant="bodySmall" color="body1">
                        {getAssignedName(ticket._assign, userLookup)}
                    </Typography>
                </WrapperHoverCard>
            </td>
            <td className="px-4 py-3">
                <Typography
                    variant="bodySmall"
                    color="body1"
                    className="font-semibold tracking-tight"
                >
                    {formatToIndianDate(ticket.creation)}
                </Typography>
            </td>
            <td className="px-4 py-3">
                <Typography
                    variant="bodySmall"
                    color="body1"
                    className="font-semibold tracking-tight"
                >
                    {formatToIndianDate(ticket.modified)}
                </Typography>
            </td>

            <td
                className="pl-4 pr-6 py-3"
                onClick={(e) => e.stopPropagation()}
            >
                <HDActionPill
                    canClose={permCloseTicket && showCloseTicketButton(ticket.status)}
                    canRevoke={permRevoke && ticket.status === "Open" && !ticket.custom_archived}
                    canReply={permReply && ticket.status !== "Closed"}
                    canReopen={permReopen && ticket.status === "Closed"}
                    onReopen={() => onReopen(ticket)}
                    onClose={() => onClose(ticket)}
                    onReply={() => onReply(ticket)}
                    onRevoke={() => onRevoke(ticket)}
                />
            </td>
        </tr>
    )
}

export default TicketTableRow;