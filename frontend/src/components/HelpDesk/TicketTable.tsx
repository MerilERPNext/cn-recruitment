import React from "react";
import { ExternalLink, X, ChevronUp, ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { HDTicket } from "../../hooks/useHelpDeskTickets";
import formatToIndianDate from "../../utils/formatToIndianDate";

interface TicketTableProps {
  tickets: HDTicket[];
  isLoading?: boolean;
  selectedTickets: Set<string>;
  onSelectTicket: (ticketId: string) => void;
  onSelectAll: () => void;
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
  selectedTickets,
  onSelectTicket,
  onSelectAll,
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
  // Helper to get category name from ID
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "-";
    return categoryMap[categoryId] || categoryId;
  };
  const allSelected = tickets.length > 0 && selectedTickets.size === tickets.length;

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
    return (
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="helpdesk-table w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-12">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              </th>
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
                <td className="px-4 py-3">
                  <div className="w-4 h-4 bg-gray-100 rounded animate-pulse" />
                </td>
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

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
      <table className="helpdesk-table w-full min-w-[900px] border-collapse">
        <thead className="bg-gray-50/80 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left ${col.width} ${col.sortable ? "cursor-pointer hover:bg-gray-100" : ""}`}
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
            <th className="px-4 py-3 w-28 text-left">
              <Typography variant="bodySmall" color="body2" className="font-medium">
                ACTIONS
              </Typography>
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.name}
              className={`border-t border-gray-50 hover:bg-primary/20 transition-colors ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={() => onRowClick?.(ticket)}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedTickets.has(ticket.name)}
                  onChange={() => onSelectTicket(ticket.name)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </td>
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
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
