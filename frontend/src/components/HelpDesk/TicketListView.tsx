import React, { useState, useMemo, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import TicketStatsCards from "./TicketStatsCards";
import TicketTable from "./TicketTable";
import TicketFiltersComponent from "./TicketFilters";
import ResolutionModal from "./ResolutionModal";
import TicketDrawer from "./TicketDrawer";
import {
  useTicketList,
  useTicketStats,
  useFilterableFields,
  useCloseTicket,
  useRequestClosure,
  useCategories,
  useUserLookup,
  useEmployeesByEmails,
  HDTicket,
  TicketFilters,
  HDCategory,
} from "../../hooks/useHelpDeskTickets";
import useDebounce from "../../hooks/useDebounce";
import { useScreenSize } from "../../hooks/useScreenSize";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface TicketListViewProps {
  currentUserEmail: string;
  isAdmin: boolean;
  viewMode?: "user" | "admin";
  onDrawerStateChange?: (isOpen: boolean) => void;
}

const TicketListView: React.FC<TicketListViewProps> = ({ currentUserEmail, isAdmin, viewMode = "user", onDrawerStateChange }) => {
  const { isDesktop } = useScreenSize();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TicketFilters>({});
  const [sortField, setSortField] = useState("modified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageLength, setPageLength] = useState(20);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);

  // Resolution Modal State
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [selectedTicketForClose, setSelectedTicketForClose] = useState<HDTicket | null>(null);
  const [isRequestClosureMode, setIsRequestClosureMode] = useState(false);

  // Ticket Drawer State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Order by string
  const orderBy = `${sortField} ${sortDirection}`;

  // Queries - pass user context and viewMode for role-based filtering
  const { data: statsData, isLoading: statsLoading } = useTicketStats(
    currentUserEmail,
    isAdmin,
    viewMode
  );
  const { data: ticketData, isLoading: ticketsLoading } = useTicketList(
    filters,
    orderBy,
    pageLength,
    debouncedSearch,
    currentUserEmail,
    isAdmin,
    viewMode
  );
  const { data: filterableFields = [], isLoading: fieldsLoading } = useFilterableFields();
  const { data: categories = [] } = useCategories();
  const { data: userLookup } = useUserLookup();

  // Mutations
  const closeTicketMutation = useCloseTicket();
  const requestClosureMutation = useRequestClosure();

  // Computed values
  const tickets = useMemo(() => ticketData?.data || [], [ticketData]);
  const stats = useMemo(
    () => statsData || { total: 0, inProgress: 0, closed: 0, resolved: 0 },
    [statsData]
  );

  // Extract unique assigned emails for employee hover card lookup
  const assignedEmails = useMemo(() => {
    const emailSet = new Set<string>();
    tickets.forEach((t) => {
      if (t._assign) {
        try {
          const parsed = JSON.parse(t._assign);
          if (Array.isArray(parsed)) {
            parsed.forEach((email: string) => emailSet.add(email));
          }
        } catch {
          // ignore parse errors
        }
      }
    });
    return Array.from(emailSet);
  }, [tickets]);

  const { data: employeeByEmail } = useEmployeesByEmails(assignedEmails);

  // Create category lookup map (ID -> Name) including subcategories
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    const addToMap = (cats: HDCategory[]) => {
      cats.forEach((cat) => {
        map[cat.name] = cat.category_name;
        if (cat.subcategories) {
          addToMap(cat.subcategories);
        }
      });
    };
    addToMap(categories);
    return map;
  }, [categories]);

  // Handlers
  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const handleReply = useCallback((ticket: HDTicket) => {
    // Open ticket in drawer
    setSelectedTicketId(ticket.name);
    setIsDrawerOpen(true);
    onDrawerStateChange?.(true);
  }, [onDrawerStateChange]);

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

      {/* Page Heading */}
      <div>
        <Typography variant="h4" color="primary">
          All Issues Raised
        </Typography>
        <Typography variant="bodySmall" color="body2">
          Track and manage your support tickets
        </Typography>
      </div>

      {/* Table Section */}
      <div className={`${isDesktop ? "rounded-lg border border-gray-200" : ""} bg-white `}>
        {/* Header */}
        <div className={isDesktop ? "flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 px-6 py-4 border-b border-gray-200" : "flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 px-2 py-4"}>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-64 w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
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
        <div className={isDesktop ? "p-4" : "p-0"}>
          <TicketTable
            tickets={tickets}
            isLoading={ticketsLoading}
            onReply={handleReply}
            onClose={handleClose}
            onRowClick={handleReply}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            categoryMap={categoryMap}
            userLookup={userLookup || new Map()}
            employeeByEmail={employeeByEmail}
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
                          className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${size === pageLength ? "bg-primary-50 text-primary-600" : ""
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

      {/* Ticket Detail Drawer */}
      <TicketDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTicketId(null);
          onDrawerStateChange?.(false);
        }}
        ticketId={selectedTicketId}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
};

export default TicketListView;
