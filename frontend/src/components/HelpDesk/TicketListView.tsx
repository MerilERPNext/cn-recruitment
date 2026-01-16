import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import TicketStatsCards from "./TicketStatsCards";
import TicketTable from "./TicketTable";
import TicketFiltersComponent from "./TicketFilters";
import ResolutionModal from "./ResolutionModal";
import {
  useTicketList,
  useTicketStats,
  useFilterableFields,
  useCloseTicket,
  useRequestClosure,
  HDTicket,
  TicketFilters,
} from "../../hooks/useHelpDeskTickets";
import useDebounce from "../../hooks/useDebounce";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface TicketListViewProps {
  currentUserEmail: string;
  isAdmin: boolean;
}

const TicketListView: React.FC<TicketListViewProps> = ({ currentUserEmail, isAdmin }) => {
  const navigate = useNavigate();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TicketFilters>({});
  const [sortField, setSortField] = useState("modified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [pageLength, setPageLength] = useState(20);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);

  // Resolution Modal State
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [selectedTicketForClose, setSelectedTicketForClose] = useState<HDTicket | null>(null);
  const [isRequestClosureMode, setIsRequestClosureMode] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Order by string
  const orderBy = `${sortField} ${sortDirection}`;

  // Queries - pass user context for role-based filtering
  const { data: statsData, isLoading: statsLoading } = useTicketStats(
    currentUserEmail,
    isAdmin
  );
  const { data: ticketData, isLoading: ticketsLoading } = useTicketList(
    filters,
    orderBy,
    pageLength,
    debouncedSearch,
    currentUserEmail,
    isAdmin
  );
  const { data: filterableFields = [], isLoading: fieldsLoading } = useFilterableFields();

  // Mutations
  const closeTicketMutation = useCloseTicket();
  const requestClosureMutation = useRequestClosure();

  // Computed values
  const tickets = useMemo(() => ticketData?.data || [], [ticketData]);
  const stats = useMemo(
    () => statsData || { total: 0, inProgress: 0, closed: 0, resolved: 0 },
    [statsData]
  );

  // Handlers
  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTickets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map((t) => t.name)));
    }
  }, [selectedTickets.size, tickets]);

  const handleReply = useCallback((ticket: HDTicket) => {
    // Navigate to ticket detail page
    navigate(`/webapp/helpdesk/ticket/${ticket.name}`);
  }, [navigate]);

  const handleClose = useCallback((ticket: HDTicket) => {
    const isRaiserOrAdmin =
      ticket.raised_by === currentUserEmail || ticket.owner === currentUserEmail;

    if (isRaiserOrAdmin) {
      // Check if resolution already exists
      if (ticket.resolution_details) {
        // Close directly without modal
        closeTicketMutation.mutate({ ticketId: ticket.name });
      } else {
        // Show resolution modal
        setSelectedTicketForClose(ticket);
        setIsRequestClosureMode(false);
        setIsResolutionModalOpen(true);
      }
    } else {
      // Show request closure modal
      setSelectedTicketForClose(ticket);
      setIsRequestClosureMode(true);
      setIsResolutionModalOpen(true);
    }
  }, [currentUserEmail, closeTicketMutation]);

  const handleResolutionSubmit = useCallback((resolution: string) => {
    if (!selectedTicketForClose) return;

    if (isRequestClosureMode) {
      requestClosureMutation.mutate(
        {
          ticketId: selectedTicketForClose.name,
          resolutionNotes: resolution,
        },
        {
          onSuccess: () => {
            setIsResolutionModalOpen(false);
            setSelectedTicketForClose(null);
          },
        }
      );
    } else {
      closeTicketMutation.mutate(
        {
          ticketId: selectedTicketForClose.name,
          resolutionDetails: resolution,
        },
        {
          onSuccess: () => {
            setIsResolutionModalOpen(false);
            setSelectedTicketForClose(null);
          },
        }
      );
    }
  }, [selectedTicketForClose, isRequestClosureMode, closeTicketMutation, requestClosureMutation]);

  const handleApplyFilters = useCallback((newFilters: TicketFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <TicketStatsCards stats={stats} isLoading={statsLoading} />

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200">
          <Typography variant="body" color="primary" className="font-medium">
            All Issues raised
          </Typography>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            {/* Filters */}
            <TicketFiltersComponent
              fields={filterableFields}
              filters={filters}
              onApply={handleApplyFilters}
              isLoading={fieldsLoading}
            />
          </div>
        </div>

        {/* Table */}
        <div className="p-4">
          <TicketTable
            tickets={tickets}
            isLoading={ticketsLoading}
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            onSelectAll={handleSelectAll}
            onReply={handleReply}
            onClose={handleClose}
            currentUser={currentUserEmail}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {/* Pagination */}
        {ticketData && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-t border-gray-200">
            <Typography variant="bodySmall" color="body2">
              Showing {tickets.length} of {ticketData.total_count} results
            </Typography>

            <div className="flex items-center gap-4">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <Typography variant="bodySmall" color="body2">
                  Rows per page:
                </Typography>
                <div className="relative">
                  <button
                    onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    {pageLength}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isPageSizeOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isPageSizeOpen && (
                    <div className="absolute bottom-full mb-1 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setPageLength(size);
                            setIsPageSizeOpen(false);
                          }}
                          className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                            size === pageLength ? "bg-primary-50 text-primary-600" : ""
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Load More Button */}
              {tickets.length < ticketData.total_count && (
                <Button
                  variant="outline"
                  bgColor="primary"
                  size="sm"
                  onClick={() => setPageLength((prev) => prev + 20)}
                >
                  Load More
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      <ResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setSelectedTicketForClose(null);
        }}
        onSubmit={handleResolutionSubmit}
        ticketId={selectedTicketForClose?.name || ""}
        isRequestClosure={isRequestClosureMode}
        isLoading={closeTicketMutation.isPending || requestClosureMutation.isPending}
      />
    </div>
  );
};

export default TicketListView;
