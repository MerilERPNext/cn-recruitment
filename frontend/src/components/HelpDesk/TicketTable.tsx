import React from "react";
import { ExternalLink, X, ChevronUp, ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { HDTicket } from "../../hooks/useHelpDeskTickets";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { useScreenSize } from "../../hooks/useScreenSize";

interface TicketTableProps {
  tickets: HDTicket[];
  isLoading?: boolean;
  onReply: (ticket: HDTicket) => void;
  onClose: (ticket: HDTicket) => void;
  onRowClick?: (ticket: HDTicket) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  categoryMap?: Record<string, string>;
  userLookup?: Map<string, string>;
  employeeByEmail?: Map<string, string>;
}


const getAssignedName = (assignStr: string | null, userLookup?: Map<string, string>): string => {
  if (!assignStr) return "-";
  try {
    const parsed = JSON.parse(assignStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const email = parsed[0];
      // Use full name from lookup if available, otherwise extract from email
      return userLookup?.get(email) || email.split("@")[0].replace(/[._]/g, " ");
    }
  } catch {
    return "-";
  }
  return "-";
};

// Status badge config for Badge component
const getStatusBadgeConfig = (status: string): { label: string; backgroundColor: string; textColor: string } => {
  switch (status) {
    case "Open":
      return { label: "Open", backgroundColor: "bg-blue-100", textColor: "text-blue-600" };
    case "Replied":
      return { label: "Replied", backgroundColor: "bg-purple-100", textColor: "text-purple-600" };
    case "Resolved":
      return { label: "Resolved", backgroundColor: "bg-green-100", textColor: "text-green-600" };
    case "Closed":
      return { label: "Closed", backgroundColor: "bg-gray-100", textColor: "text-gray-600" };
    case "Reopened":
      return { label: "Reopened", backgroundColor: "bg-yellow-100", textColor: "text-yellow-600" };
    default:
      return { label: status, backgroundColor: "bg-gray-100", textColor: "text-gray-600" };
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
  onRowClick?: (ticket: HDTicket) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  categoryMap,
  userLookup,
  employeeByEmail,
  onReply,
  onClose,
  onRowClick,
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
            employeeId={employeeByEmail?.get(getAssignedEmail(ticket._assign) || "")}
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
      </div>

      <div>
        <div className="h-[1px] w-full bg-gray-100 mb-4" />
        <div className="flex justify-between items-center">
          <Typography variant="mobileCardFooter">
            Last Updated on {formatToIndianDate(ticket.modified)}
          </Typography>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onReply(ticket)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
              title="Reply"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            {ticket.status !== "Closed" && (
              <button
                onClick={() => onClose(ticket)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const columns = [
  { key: "name", label: "Issue ID", sortable: true, width: "w-28" },
  { key: "custom_category", label: "Category", sortable: true, width: "w-32" },
  { key: "custom_sub_category", label: "Sub Category", sortable: true, width: "w-40" },
  { key: "_assign", label: "Assigned to", sortable: false, width: "w-40" },
  { key: "creation", label: "Created on", sortable: true, width: "w-32" },
  { key: "modified", label: "Last Updated", sortable: true, width: "w-32" },
  { key: "status", label: "Status", sortable: true, width: "w-28" },
];

const TicketTable: React.FC<TicketTableProps> = ({
  tickets,
  isLoading,
  onReply,
  onClose,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  categoryMap = {},
  userLookup,
  employeeByEmail,
}) => {
  const { isDesktop } = useScreenSize();

  // Helper to get category name from ID
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "-";
    return categoryMap[categoryId] || categoryId;
  };

  // Since we only show user's own tickets, always show "Close" button
  const getCloseButtonLabel = () => {
    return "Close";
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-300" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 text-gray-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-gray-600" />
    );
  };

  if (isLoading) {
    // Mobile loading skeleton
    if (!isDesktop) {
      return (
        <div className="space-y-4 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 p-6 animate-pulse">
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
      );
    }

    // Desktop loading skeleton
    return (
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="helpdesk-table w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 text-left ${col.width}`}>
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                </th>
              ))}
              <th className="px-4 py-3 w-28">
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
              </th>
            </tr>
          </thead>
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
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <Typography variant="body" color="body2">
          No tickets found matching your criteria.
        </Typography>
      </div>
    );
  }

  // Mobile Card View
  if (!isDesktop) {
    return (
      <div className="space-y-2">
        {/* Ticket Cards */}
        <div className="px-2">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.name}
              ticket={ticket}
              categoryMap={categoryMap}
              userLookup={userLookup}
              employeeByEmail={employeeByEmail}
              onReply={onReply}
              onClose={onClose}
              onRowClick={onRowClick}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
      <table className="helpdesk-table w-full min-w-[900px] border-collapse">
        <thead className="bg-gray-50/80 border-b border-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3 text-left ${col.width} ${col.sortable ? "cursor-pointer hover:bg-gray-100" : ""} ${col.key === 'name' ? 'pl-6 pr-4' : 'px-4'}`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  <Typography variant="bodySmall" color="body2" className="font-medium">
                    {col.label}
                  </Typography>
                  {col.sortable && renderSortIcon(col.key)}
                </div>
              </th>
            ))}
            <th className="pl-4 pr-6 py-3 w-28 text-left">
              <Typography variant="bodySmall" color="body2" className="font-medium">
                Actions
              </Typography>
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.name}
              className={`border-t border-gray-50 hover:bg-primary/20 transition-colors ${onRowClick ? "cursor-pointer" : ""
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
                  {getCategoryName(ticket.custom_category)}
                </Typography>
              </td>
              <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1">
                  {getCategoryName(ticket.custom_sub_category)}
                </Typography>
              </td>
              <td className="px-4 py-3">
                <WrapperHoverCard employeeId={employeeByEmail?.get(getAssignedEmail(ticket._assign) || "")} placement="bottom-left">
                  <Typography variant="bodySmall" color="body1">
                    {getAssignedName(ticket._assign, userLookup)}
                  </Typography>
                </WrapperHoverCard>
              </td>
              <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1" className="font-semibold tracking-tight">
                  {formatToIndianDate(ticket.creation)}
                </Typography>
              </td>
              <td className="px-4 py-3">
                <Typography variant="bodySmall" color="body1" className="font-semibold tracking-tight">
                  {formatToIndianDate(ticket.modified)}
                </Typography>
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const badgeConfig = getStatusBadgeConfig(ticket.status);
                  return (
                    <Badge
                      size="sm"
                      label={badgeConfig.label}
                      backgroundColor={badgeConfig.backgroundColor}
                      textColor={badgeConfig.textColor}
                    />
                  );
                })()}
              </td>
              <td className="pl-4 pr-6 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  {/* Reply Button */}
                  <button
                    onClick={() => onReply(ticket)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
                    title="Reply"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  {/* Close/Request Closure Button */}
                  {ticket.status !== "Closed" && (
                    <button
                      onClick={() => onClose(ticket)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                      title={getCloseButtonLabel()}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTable;
