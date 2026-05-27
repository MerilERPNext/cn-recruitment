import { ArrowDown, ArrowUp, ArrowUpDown, Ticket as TicketIcon } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { HDTicket } from "../../hooks/useHelpDeskTickets";
import { useCountdown } from "../../hooks/Helpdesk/useCountdown";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Typography } from "../shared/atoms/Typography";
import BottomDrawer from "../shared/BottomDrawer";
import Badge from "../shared/Badge";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import NoDataFound from "../shared/atoms/NoDataFound";
import { showCloseTicketButton } from "./hdelpdeskUtils";
import HDActionPill from "./HDActionPills";
import TicketTableRow from "./TicketTableRow";
import Button from "../shared/atoms/Button";

interface TicketTableProps {
  tickets: HDTicket[];
  isLoading?: boolean;
  onReply: (ticket: HDTicket) => void;
  onClose: (ticket: HDTicket) => void;
  onRevoke: (ticket: HDTicket) => void;
  onReopen: (ticket: HDTicket) => void;
  onRowClick?: (ticket: HDTicket) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  categoryMap?: Record<string, string>;
  userLookup?: Map<string, string>;
  employeeByEmail?: Map<string, string>;
  headerControls?: React.ReactNode;
  permRevoke?: boolean;
  permCloseTicket?: boolean;
  permReply?: boolean;
  permReopen?: boolean;
}

const getAssignedName = (
  assignStr: string | null,
  userLookup?: Map<string, string>,
): string => {
  if (!assignStr) return "-";
  try {
    const parsed = JSON.parse(assignStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const email = parsed[0];
      // Use full name from lookup if available, otherwise extract from email
      return (
        userLookup?.get(email) ||
        (typeof email === "string"
          ? email.split("@")[0].replace(/[._]/g, " ")
          : "-")
      );
    }
  } catch {
    return "-";
  }
  return "-";
};

// Status badge config for Badge component
const getStatusBadgeConfig = (
  status: string,
): { label: string; backgroundColor: string; textColor: string } => {
  switch (status) {
    case "Open":
      return {
        label: "Open",
        backgroundColor: "bg-blue-100",
        textColor: "text-blue-600",
      };
    case "Replied":
      return {
        label: "Replied",
        backgroundColor: "bg-purple-100",
        textColor: "text-purple-600",
      };
    case "Resolved":
      return {
        label: "Resolved",
        backgroundColor: "bg-green-100",
        textColor: "text-green-600",
      };
    case "Closed":
      return {
        label: "Closed",
        backgroundColor: "bg-gray-100",
        textColor: "text-gray-600",
      };
    case "Reopened":
      return {
        label: "Reopened",
        backgroundColor: "bg-yellow-100",
        textColor: "text-yellow-600",
      };
    case "Revoked":
      return {
        label: "Revoked",
        backgroundColor: "bg-red-100",
        textColor: "text-red-600",
      };
    default:
      return {
        label: status,
        backgroundColor: "bg-gray-100",
        textColor: "text-gray-600",
      };
  }
};

const getAssignedEmail = (assignStr: string | null): string | null => {
  if (!assignStr) return null;
  try {
    const parsed = JSON.parse(assignStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    return null;
  }
  return null;
};

// Mobile Card Component
interface TicketCardProps {
  ticket: HDTicket;
  categoryMap: Record<string, string>;
  userLookup?: Map<string, string>;
  employeeByEmail?: Map<string, string>;
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

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  categoryMap,
  userLookup,
  employeeByEmail,
  onReply,
  onClose,
  onRevoke,
  onReopen,
  onRowClick,
  permRevoke = true,
  permCloseTicket = true,
  permReply = true,
  permReopen = true,
}) => {
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "-";
    return categoryMap[categoryId] || categoryId;
  };

  const badgeConfig = getStatusBadgeConfig(ticket.status);

  return (
    <div
      className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary p-6 transition-shadow duration-200 flex flex-col gap-5 cursor-pointer hover:shadow-md"
      onClick={() => onRowClick?.(ticket)}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-2">
            <Typography variant="mobileCardLabel" className="block">
              Issue ID
            </Typography>
            <Typography variant="mobileCardValue">{ticket.name}</Typography>
          </div>
        </div>

        <Badge
          size="sm"
          label={badgeConfig.label}
          backgroundColor={badgeConfig.backgroundColor}
          textColor={badgeConfig.textColor}
        />
      </div>

      {/* Data Fields - Responsive Flex Layout */}
      <div className="flex flex-wrap gap-5">
        {/* Category */}
        <div className="flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] sm:min-w-[calc(25%-0.9375rem)]">
          <Typography variant="mobileCardLabel" className="block">
            Category
          </Typography>
          <Typography variant="mobileCardValue">
            {getCategoryName(ticket.custom_category)}
          </Typography>
        </div>

        {/* Sub Category */}
        <div className="flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] sm:min-w-[calc(25%-0.9375rem)] text-right">
          <Typography variant="mobileCardLabel" className="block">
            Sub Category
          </Typography>
          <Typography variant="mobileCardValue">
            {getCategoryName(ticket.custom_sub_category)}
          </Typography>
        </div>

        {/* Assigned to */}
        <div className="flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] sm:min-w-[calc(25%-0.9375rem)]">
          <Typography variant="mobileCardLabel" className="block">
            Assigned to
          </Typography>
          <WrapperHoverCard
            employeeId={employeeByEmail?.get(
              getAssignedEmail(ticket._assign) || "",
            )}
            placement="bottom-left"
          >
            <Typography variant="mobileCardValue">
              {getAssignedName(ticket._assign, userLookup)}
            </Typography>
          </WrapperHoverCard>
        </div>

        {/* Created on */}
        <div className="flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] sm:min-w-[calc(25%-0.9375rem)] text-right">
          <Typography variant="mobileCardLabel" className="block">
            Created on
          </Typography>
          <Typography variant="mobileCardValue">
            {formatToIndianDate(ticket.creation)}
          </Typography>
        </div>

        {/* Creator Type */}
        <div className="flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] sm:min-w-[calc(25%-0.9375rem)]">
          <Typography variant="mobileCardLabel" className="block">
            Creator Type
          </Typography>
          <Typography variant="mobileCardValue">
            {ticket.user_type || "-"}
          </Typography>
        </div>

        {/* Number of Comments */}
        <div className="flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] sm:min-w-[calc(25%-0.9375rem)] text-right">
          <Typography variant="mobileCardLabel" className="block">
            Comments
          </Typography>
          <Typography variant="mobileCardValue">
            {ticket.no_of_comments ?? "0"}
          </Typography>
        </div>
      </div>

      <div>
        <div className="h-[1px] w-full bg-gray-100 mb-4" />
        <div className="flex justify-between items-center">
          <Typography variant="mobileCardFooter">
            Last Updated on {formatToIndianDate(ticket.modified)}
          </Typography>
          <div
            className="flex items-center gap-2"
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
          </div>
        </div>
      </div>
    </div>
  );
};

const columns = [
  { key: "name", label: "Issue ID", sortable: true, width: "w-28" },
  { key: "subject", label: "Issue Title", sortable: false, width: "w-28" },
  { key: "custom_category", label: "Category", sortable: true, width: "w-32" },
  {
    key: "custom_sub_category",
    label: "Sub Category",
    sortable: true,
    width: "w-40",
  }, {
    key: "no_of_comments",
    label: "Number of Comments",
    sortable: false,
    width: "w-40",
  },
  {
    key: "user_type",
    label: "Creator Type",
    sortable: false,
    width: "w-40",
  },
  {
    key: "resolution_by",
    label: "SLA Breached - TAT",
    sortable: true,
    width: "w-40",
  },
  {
    key: "response_by",
    label: "SLA Breached - FRT",
    sortable: true,
    width: "w-40",
  }, {
    key: "raise_by_name",
    label: "Requested By",
    sortable: false,
    width: "w-40",
  }, {
    key: "custom_second_level_escalation_delay_hours",
    label: "Remaining Escalation Business Time ",
    sortable: true,
    width: "w-40",
  },
  {
    key: "agreement_status",
    label: "Sla Breached",
    sortable: false,
    width: "w-40",
  },
  { key: "_assign", label: "Assigned to", sortable: false, width: "w-40" },
  { key: "creation", label: "Created on", sortable: true, width: "w-32" },
  { key: "modified", label: "Last Updated", sortable: true, width: "w-32" },
  { key: "status", label: "Status", sortable: false, width: "w-28" },
];

const formateDateDiff = (date1: string, date2: string) => {
  if (!date1 || !date2) return "-";
  const diff = new Date(date1).getTime() - new Date(date2).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

interface MobileTicketDetailModalProps {
  ticket: HDTicket | null;
  isOpen: boolean;
  onClose: () => void;
  categoryMap: Record<string, string>;
  userLookup?: Map<string, string>;
  getAssignedName: (assignStr: string | null, lookup?: Map<string, string>) => string;
  onReply: (ticket: HDTicket) => void;
  onReopen: (ticket: HDTicket) => void;
  onCloseTicket: (ticket: HDTicket) => void;
  onRevoke: (ticket: HDTicket) => void;
  permRevoke?: boolean;
  permCloseTicket?: boolean;
  permReply?: boolean;
  permReopen?: boolean;
}

const MobileTicketDetailModal: React.FC<MobileTicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  categoryMap,
  userLookup,
  getAssignedName,
  onReply,
  onReopen,
  onCloseTicket,
  onRevoke,
  permRevoke = true,
  permCloseTicket = true,
  permReply = true,
  permReopen = true,
}) => {
  const targetTime = ticket
    ? new Date(new Date(ticket.creation).getTime() + (ticket.custom_second_level_escalation_delay_hours || 0) * 60 * 60 * 1000)
    : new Date();

  const { hours, minutes, seconds, isExpired } = useCountdown(targetTime);

  if (!ticket) return <BottomDrawer isOpen={isOpen} onClose={onClose}><div /></BottomDrawer>;

  const badgeConfig = getStatusBadgeConfig(ticket.status);

  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "-";
    return categoryMap[categoryId] || categoryId;
  };

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis w-full">
        {label}
      </span>
      <div className="text-sm font-bold text-slate-800 break-words whitespace-normal leading-snug">
        {value}
      </div>
    </div>
  );

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col max-h-[85vh] -mx-4 -mb-6">
        {/* Sticky Header */}
        <div className="flex flex-col gap-3 px-4 pt-2 pb-4 border-b border-gray-100 bg-white sticky top-0 z-10 rounded-t-2xl">
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-3 items-center">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <TicketIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <Typography variant="bodySmall" className="text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-xs">
                  {ticket.name}
                </Typography>
                <Typography variant="h3" className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2 mt-0.5">
                  {ticket.subject || "No Subject"}
                </Typography>
              </div>
            </div>
            <div className="flex-shrink-0 pt-0.5">
              <Badge
                size="md"
                label={badgeConfig.label}
                backgroundColor={badgeConfig.backgroundColor}
                textColor={badgeConfig.textColor}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50 shadow-inner max-h-[60vh]">

          {/* Card 1: Issue Details */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
            <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500/80 uppercase tracking-wider">Issue Details</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-5 gap-x-4">
              <DetailRow label="Category" value={getCategoryName(ticket.custom_category)} />
              <DetailRow label="Sub Category" value={getCategoryName(ticket.custom_sub_category)} />
              <DetailRow label="Requested By" value={ticket.raise_by_name || "-"} />
              <DetailRow label="Assigned to" value={getAssignedName(ticket._assign, userLookup)} />
              <DetailRow label="Creator Type" value={ticket.user_type || "-"} />
              <DetailRow label="Number of Comments" value={ticket.no_of_comments ?? "0"} />
            </div>
          </div>

          {/* Card 2: SLA & SLA Timings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
            <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500/80 uppercase tracking-wider">Timing & SLA</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-5 gap-x-4">
              <DetailRow label="Created on" value={formatToIndianDate(ticket.creation)} />
              <DetailRow label="Last Updated" value={formatToIndianDate(ticket.modified)} />
              <DetailRow label="SLA Breached TAT" value={formateDateDiff(ticket.resolution_by, ticket.creation)} />
              <DetailRow label="SLA Breached FRT" value={formateDateDiff(ticket.response_by, ticket.creation)} />
            </div>
            {/* Highlighted section for Escalation */}
            <div className={`px-4 py-3.5 border-t flex gap-3 justify-between items-center ${isExpired ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'text-red-700/80' : 'text-emerald-700/80'}`}>Escalation Wait Time</span>
              <span className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                {isExpired ? "Escalated" : `${hours}h ${minutes}m ${seconds}s`}
              </span>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="px-4 py-3.5 border-t border-gray-100 bg-white sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-b-2xl z-20">
          <Button variant="outline" size="md" onClick={onClose} className="border-gray-200 text-gray-600 hover:bg-gray-50">
            Close
          </Button>
          <HDActionPill
            canClose={permCloseTicket && showCloseTicketButton(ticket.status)}
            canRevoke={permRevoke && ticket.status === "Open" && !ticket.custom_archived}
            canReply={permReply && ticket.status !== "Closed"}
            canReopen={permReopen && ticket.status === "Closed"}
            onReopen={() => { onReopen(ticket); onClose(); }}
            onClose={() => { onCloseTicket(ticket); onClose(); }}
            onReply={() => { onReply(ticket); onClose(); }}
            onRevoke={() => { onRevoke(ticket); onClose(); }}
          />
        </div>
      </div>
    </BottomDrawer>
  );
};

const TicketTable: React.FC<TicketTableProps> = ({
  tickets,
  isLoading,
  onReply,
  onClose,
  onRevoke,
  onReopen,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  categoryMap = {},
  userLookup,
  employeeByEmail,
  headerControls,
  permRevoke = true,
  permCloseTicket = true,
  permReply = true,
  permReopen = true,
}) => {
  const { isDesktop } = useScreenSize();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [selectedMobileTicket, setSelectedMobileTicket] = useState<HDTicket | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const updateWidth = () => setScrollWidth(scrollEl.clientWidth);
    updateWidth();
    const ro = window.ResizeObserver ? new ResizeObserver(updateWidth) : null;
    if (ro) ro.observe(scrollEl);
    return () => ro?.disconnect();
  }, [isDesktop]);

  // Helper to get category name from ID
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "-";
    return categoryMap[categoryId] || categoryId;
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="text-gray-400 flex-shrink-0" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={13} className="text-blue-600 flex-shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-blue-600 flex-shrink-0" />
    );
  };


  const LoadingSkeleton = (
    !isDesktop ?
      (
        <div className="w-fullspace-y-4 px-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-gray-100 p-6 animate-pulse"
            >
              {/* Header with badge */}
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-3xl" />
              </div>

              {/* Responsive data fields - 4 items in flex-wrap */}
              <div className="flex flex-wrap gap-5 mb-5">
                <div className="flex-1 min-w-[calc(50%-0.625rem)] space-y-2">
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
                <div className="flex-1 min-w-[calc(50%-0.625rem)] space-y-2">
                  <div className="h-3 w-20 bg-gray-200 rounded ml-auto" />
                  <div className="h-4 w-28 bg-gray-200 rounded ml-auto" />
                </div>
                <div className="flex-1 min-w-[calc(50%-0.625rem)] space-y-2">
                  <div className="h-3 w-18 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="flex-1 min-w-[calc(50%-0.625rem)] space-y-2">
                  <div className="h-3 w-16 bg-gray-200 rounded ml-auto" />
                  <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
                </div>
              </div>

              {/* Footer */}
              <div>
                <div className="h-[1px] w-full bg-gray-100 mb-4" />
                <div className="flex justify-between items-center">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded" />
                    <div className="w-8 h-8 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <tr>
          <td colSpan={columns.length + 1}>
            <div className="bg-white rounded-lg overflow-hidden">
              <table className="helpdesk-table w-full border-collapse">
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-t border-gray-200">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded animate-pulse" />
                          <div className="w-8 h-8 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )
  );


  // Mobile Card View
  if (!isDesktop) {
    return (
      <div className="space-y-2">
        {headerControls && headerControls}
        {/* Ticket Cards */}
        <div className="px-2">
          {isLoading && LoadingSkeleton}
          {!isLoading && tickets.length === 0 &&
            <div className="bg-white rounded-lg p-8 text-center">
              <NoDataFound
                title="No tickets found"
                subtitle="No tickets found matching your criteria."
              />
            </div>
          }
          {!isLoading && tickets.map((ticket) => (
            <TicketCard
              key={ticket.name}
              ticket={ticket}
              categoryMap={categoryMap}
              userLookup={userLookup}
              employeeByEmail={employeeByEmail}
              onReply={onReply}
              onClose={onClose}
              onRevoke={onRevoke}
              onReopen={onReopen}
              onRowClick={() => setSelectedMobileTicket(ticket)}
              permRevoke={permRevoke}
              permCloseTicket={permCloseTicket}
              permReply={permReply}
              permReopen={permReopen}
            />
          ))}

          <MobileTicketDetailModal
            ticket={selectedMobileTicket}
            isOpen={!!selectedMobileTicket}
            onClose={() => setSelectedMobileTicket(null)}
            categoryMap={categoryMap}
            userLookup={userLookup}
            getAssignedName={getAssignedName}
            onReply={onReply}
            onReopen={onReopen}
            onCloseTicket={onClose}
            onRevoke={onRevoke}
            permRevoke={permRevoke}
            permCloseTicket={permCloseTicket}
            permReply={permReply}
            permReopen={permReopen}
          />
        </div>
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-full">
      <div className="overflow-x-auto" ref={scrollRef}>
        <table className="helpdesk-table w-full min-w-[900px] border-collapse relative">
          <thead className="bg-gray-50/80 text-center border-b border-gray-100 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-4 ${col.width} ${col.sortable ? "cursor-pointer hover:bg-gray-100" : ""} ${col.key === "name" ? "pl-6 pr-4" : "px-4"}`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <Typography
                      variant="bodySmall"
                      color="body2"
                      className="font-bold whitespace-nowrap"
                    >
                      {col.label}
                    </Typography>
                    {col.sortable && renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
              <th className="pl-4 pr-6 py-4 w-28 text-left">
                <Typography
                  variant="bodySmall"
                  color="body2"
                  className="font-bold whitespace-nowrap"
                >
                  Actions
                </Typography>
              </th>
            </tr>
            {headerControls && (
              <tr className="bg-white">
                <td colSpan={columns.length + 1} className="p-0 border-0">
                  <div
                    className="sticky left-0 border-b border-gray-100"
                    style={{ width: scrollWidth ? `${scrollWidth}px` : '100%' }}
                  >
                    {headerControls}
                  </div>
                </td>
              </tr>
            )}
          </thead>
          <tbody>
            {!isLoading && tickets.length === 0 &&
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="bg-white p-8 text-center">
                    <NoDataFound
                      title="No tickets found"
                      subtitle="No tickets found matching your criteria."
                    />
                  </div>
                </td>
              </tr>
            }
            {isLoading && LoadingSkeleton}
            {!isLoading && tickets.map((ticket) =>
              <TicketTableRow
                key={ticket.name}
                ticket={ticket}
                userLookup={userLookup}
                employeeByEmail={employeeByEmail}
                onReply={onReply}
                onClose={onClose}
                onRevoke={onRevoke}
                onReopen={onReopen}
                getStatusBadgeConfig={getStatusBadgeConfig}
                formatToIndianDate={formatToIndianDate}
                getAssignedEmail={getAssignedEmail}
                getAssignedName={getAssignedName}
                getCategoryName={getCategoryName}
                formateDateDiff={formateDateDiff}
                onRowClick={onRowClick}
                permRevoke={permRevoke}
                permCloseTicket={permCloseTicket}
                permReply={permReply}
                permReopen={permReopen} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketTable;
