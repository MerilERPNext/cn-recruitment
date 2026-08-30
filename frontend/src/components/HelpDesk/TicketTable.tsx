import { ArrowDown, ArrowUp, ArrowUpDown, Ticket as TicketIcon, X, MessageSquare, FileText, Loader2 } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { HDTicket, useTicketDetail } from "../../hooks/useHelpDeskTickets";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEscalationCountdown } from "../../hooks/Helpdesk/useEscalationCountdown";
import { useSlaCountdown } from "../../hooks/Helpdesk/useSlaCountdown";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Typography } from "../shared/atoms/Typography";
import BottomDrawer from "../shared/BottomDrawer";
import Badge from "../shared/Badge";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import NoDataFound from "../shared/atoms/NoDataFound";
import { getStatusBadgeConfig, showCloseTicketButton } from "./hdelpdeskUtils";
import HDActionPill from "./HDActionPills";
import TicketTableRow from "./TicketTableRow";
import SimplifiedChatView from "./Helpdesk/SimplifiedChatView";

interface TicketTableProps {
  tickets: HDTicket[];
  isLoading?: boolean;
  onReply: (ticket: HDTicket) => void;
  onClose: (ticket: HDTicket) => void;
  onRevoke: (ticket: HDTicket) => void;
  onReopen: (ticket: HDTicket) => void;
  onRowClick?: (ticket: HDTicket) => void;
  onResolve: (ticket: HDTicket) => void;
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
  onResolve: (ticket: HDTicket) => void;
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
  onResolve,
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
      className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary p-4 transition-shadow duration-200 flex flex-col gap-4 cursor-pointer hover:shadow-md"
      onClick={() => onRowClick?.(ticket)}
    >
      <div className="flex justify-between items-center mb-0">
        <div className="flex items-center gap-1.5">
          <Typography variant="mobileCardTitle">Issue ID : {ticket.name}</Typography>
        </div>

        <Badge
          size="sm"
          label={badgeConfig.label}
          backgroundColor={badgeConfig.backgroundColor}
          textColor={badgeConfig.textColor}
        />
      </div>

      {/* Data Fields - Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-3">
        {/* Category */}
        <div className="flex flex-col gap-1">
          <Typography variant="mobileCardLabel" className="block">
            Category
          </Typography>
          <Typography variant="mobileCardValue">
            {getCategoryName(ticket.custom_category)}
          </Typography>
        </div>

        {/* Sub Category */}
        <div className="flex flex-col gap-1 text-right sm:text-left">
          <Typography variant="mobileCardLabel" className="block">
            Sub Category
          </Typography>
          <Typography variant="mobileCardValue">
            {getCategoryName(ticket.custom_sub_category_name || ticket.custom_sub_category)}
          </Typography>
        </div>

        {/* Assigned to */}
        <div className="flex flex-col gap-1">
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
        <div className="flex flex-col gap-1 text-right sm:text-left">
          <Typography variant="mobileCardLabel" className="block">
            Created on
          </Typography>
          <Typography variant="mobileCardValue">
            {formatToIndianDate(ticket.creation)}
          </Typography>
        </div>

        {/* Creator Type */}
        <div className="flex flex-col gap-1">
          <Typography variant="mobileCardLabel" className="block">
            Creator Type
          </Typography>
          <Typography variant="mobileCardValue">
            {ticket.user_type || "-"}
          </Typography>
        </div>

        {/* Number of Comments */}
        <div className="flex flex-col gap-1 text-right sm:text-left">
          <Typography variant="mobileCardLabel" className="block">
            Comments
          </Typography>
          <Typography variant="mobileCardValue">
            {ticket.no_of_comments ?? "0"}
          </Typography>
        </div>
      </div>

      <div>
        <div className="h-[1px] w-full bg-gray-100 mb-2" />
        <div className="flex justify-between items-center">
          <Typography variant="mobileCardFooter">
            Last Updated on {formatToIndianDate(ticket.modified)}
          </Typography>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <HDActionPill
              canResolve={!["Resolved", "Closed"].includes(ticket.status)}
              onResolve={() => onResolve(ticket)}
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
  },
  { key: "status", label: "Status", sortable: false, width: "w-28" },
  {
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
    key: "response_by",
    label: "SLA Breached - FRT",
    sortable: true,
    width: "w-40",
  },
  {
    key: "resolution_by",
    label: "SLA Breached - TAT",
    sortable: true,
    width: "w-40",
  },
  {
    key: "raise_by_name",
    label: "Requested By",
    sortable: false,
    width: "w-40",
  }, {
    key: "escalation",
    label: "Remaining Escalation Business Time",
    sortable: false,
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
  { key: "modified", label: "Last Updated", sortable: true, width: "w-32" }
];

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis w-full">
      {label}
    </span>
    <div className="text-sm font-bold text-slate-800 break-words whitespace-normal leading-snug">
      {value}
    </div>
  </div>
);

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
  onResolve: (ticket: HDTicket) => void;
  permRevoke?: boolean;
  permCloseTicket?: boolean;
  permReply?: boolean;
  permReopen?: boolean;
}

type MobileDetailTab = "details" | "chat";

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
  onResolve,
  permRevoke = true,
  permCloseTicket = true,
  permReply = true,
  permReopen = true,
}) => {
  const [activeTab, setActiveTab] = useState<MobileDetailTab>("details");
  const { data: currentUser } = useCurrentUser();
  const currentUserEmail = currentUser?.email || "";

  // Fetch full ticket details for chat view
  const { data: fullTicketDetail, isLoading: isLoadingDetail } = useTicketDetail(
    ticket?.name || ""
  );

  const escalation = useEscalationCountdown(ticket?.escalation);
  const frt = useSlaCountdown({
    dueOn: ticket?.response_by,
    metOn: ticket?.first_responded_on,
    serverNow: ticket?.server_now,
  });
  const tat = useSlaCountdown({
    dueOn: ticket?.resolution_by,
    metOn: ticket?.resolution_date,
    serverNow: ticket?.server_now,
    paused: Boolean(ticket?.escalation?.sla_paused),
  });

  // Reset tab when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("details");
    }
  }, [isOpen]);

  if (!ticket) return <BottomDrawer isOpen={isOpen} onClose={onClose}><div /></BottomDrawer>;

  const badgeConfig = getStatusBadgeConfig(ticket.status);

  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "-";
    return categoryMap[categoryId] || categoryId;
  };

  // Details Tab Content
  const renderDetailsContent = ({ onResolve }: { onResolve: (ticket: HDTicket) => void }) => (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Card 1: Issue Details */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-50/80 to-white px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Issue Details</span>
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

        {/* Card 2: SLA & Timings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-amber-50/80 to-white px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
              <TicketIcon className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Timing & SLA</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-y-5 gap-x-4">
            <DetailRow label="Created on" value={formatToIndianDate(ticket.creation)} />
            <DetailRow label="Last Updated" value={formatToIndianDate(ticket.modified)} />
            <DetailRow label="SLA Breached TAT" value={tat.text} />
            <DetailRow label="SLA Breached FRT" value={frt.text} />
          </div>
          {/* Highlighted section for Escalation */}
          <div className={`px-4 py-3.5 border-t flex gap-3 justify-between items-center ${escalation.tone === 'breached' ? 'bg-red-50/60 border-red-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${escalation.tone === 'breached' ? 'text-red-700/80' : 'text-emerald-700/80'}`}>Remaining Escalation Business Time</span>
            <span className={`text-sm font-bold ${escalation.tone === 'breached' ? 'text-red-600' : 'text-emerald-600'}`}>
              {escalation.text}
            </span>
          </div>
        </div>
      </div>
      <HDActionPill
        variant="modal"
        canResolve={!["Resolved", "Closed"].includes(ticket.status)}
        onResolve={() => onResolve(ticket)}
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
  );

  // Chat Tab Content
  const renderChatContent = () => {
    if (isLoadingDetail) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50/70">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Loading conversation...</span>
          </div>
        </div>
      );
    }

    if (!fullTicketDetail) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50/70">
          <div className="flex flex-col items-center gap-3">
            <MessageSquare className="w-10 h-10 text-gray-300" />
            <span className="text-sm text-gray-500">Unable to load conversation</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <SimplifiedChatView
          ticket={fullTicketDetail}
          currentUserEmail={currentUserEmail}
          isDrawer={true}
        />
      </div>
    );
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose} className="max-sm:h-[100dvh] max-sm:rounded-none max-sm:pt-0">
      <div className="flex flex-col h-full -mx-4 -mb-6">
        {/* Header */}
        <div className="flex flex-col gap-3 px-4 pt-3 pb-3 bg-white sticky top-0 z-10 max-sm:rounded-none rounded-t-2xl border-b border-gray-100">
          {/* Title Row */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-3 items-center flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <TicketIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Typography variant="bodySmall" className="text-blue-600 font-semibold text-xs">
                    #{ticket.name}
                  </Typography>
                  <Badge
                    size="sm"
                    label={badgeConfig.label}
                    backgroundColor={badgeConfig.backgroundColor}
                    textColor={badgeConfig.textColor}
                  />
                </div>
                <Typography variant="h3" className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 mt-0.5">
                  {ticket.subject || "No Subject"}
                </Typography>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "details"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "chat"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
              {(ticket.no_of_comments ?? 0) > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${activeTab === "chat" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                  }`}>
                  {ticket.no_of_comments}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "details" ? renderDetailsContent({ onResolve }) : renderChatContent()}
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
  onResolve,
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
        <div className="w-full space-y-2 px-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary p-4 animate-pulse bg-white flex flex-col gap-4"
            >
              {/* Header with badge */}
              <div className="flex justify-between items-center mb-0">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-6 w-16 bg-gray-200 rounded-full" />
              </div>

              {/* Data Fields - Grid Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-3">
                {/* Category */}
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>

                {/* Sub Category */}
                <div className="flex flex-col gap-1 items-end sm:items-start">
                  <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>

                {/* Assigned to */}
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>

                {/* Created on */}
                <div className="flex flex-col gap-1 items-end sm:items-start">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>

                {/* Creator Type */}
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>

                {/* Comments */}
                <div className="flex flex-col gap-1 items-end sm:items-start">
                  <div className="h-3 w-16 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-8 bg-gray-200 rounded" />
                </div>
              </div>

              {/* Footer */}
              <div>
                <div className="h-[1px] w-full bg-gray-100 mb-2" />
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-40 bg-gray-200 rounded" />
                  <div className="h-7 w-8 bg-gray-200 rounded-md" />
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
              onResolve={onResolve}
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
            onResolve={onResolve}
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
                  <div className="flex items-center gap-1 justify-center">
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
