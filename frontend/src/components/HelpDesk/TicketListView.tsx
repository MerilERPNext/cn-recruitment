import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import TicketStatsCards from "./TicketStatsCards";
import TicketTable from "./TicketTable";
import TicketFiltersComponent from "./TicketFilters";
import SearchInputWrapper from "../shared/SearchBar";
import TicketCloseModal from "./TicketCloseModal";
import TicketDrawer from "./TicketDrawer";
import {
  useTicketList,
  useFilterableFields,
  useCategories,
  useUserLookup,
  useEmployeesByEmails,
  HDTicket,
  TicketFilters,
  HDCategory,
  useRevokeTicket,
  useGetTicketStats,
  useReopenTicket,
} from "../../hooks/useHelpDeskTickets";
import { useTicketCloseFlow } from "../../hooks/useTicketCloseFlow";
import useDebounce from "../../hooks/useDebounce";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface TicketListViewProps {
  currentUserEmail: string;
  currentUserLoading: boolean;
  isAdmin: boolean;
  viewMode?: "user" | "admin";
  onDrawerStateChange?: (isOpen: boolean) => void;
}

const TicketListView: React.FC<TicketListViewProps> = ({ currentUserEmail, currentUserLoading, isAdmin, viewMode = "user", onDrawerStateChange }) => {
  const { isDesktop } = useScreenSize();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TicketFilters>({ status: ['not in', ['Closed']] });
  const [sortField, setSortField] = useState("modified");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageLength, setPageLength] = useState(20);
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const [subTab, setSubTab] = useState<"myself" | "others">("myself");

  // Ticket Drawer State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Order by string
  const orderBy = `${sortField} ${sortDirection}`;


  const { data: statsData, isLoading: statsLoading } = useGetTicketStats();
  const { data: ticketData, isLoading: ticketsLoading } = useTicketList(
    filters,
    orderBy,
    pageLength,
    debouncedSearch,
    currentUserEmail,
    isAdmin,
    viewMode,
    subTab
  );
  const { data: filterableFields = [], isLoading: fieldsLoading } = useFilterableFields();
  const { data: categories = [] } = useCategories();
  const { data: userLookup } = useUserLookup();

  // Mutations
  const revokeTicketMutation = useRevokeTicket();
  const reopenTicketMutation = useReopenTicket();

  // Centralized close/resolve flow
  const closeFlow = useTicketCloseFlow({ currentUserEmail });

  // UI Permission checks
  const { data: userUiPermission } = useGetUiPermission("Help Desk");
  const permRevoke = isActionEnabled(userUiPermission, "revoke", "Help Desk");
  const permCloseTicket = isActionEnabled(userUiPermission, "close_ticket", "Help Desk");
  const permReply = isActionEnabled(userUiPermission, "reply", "Help Desk");
  const permReopen = isActionEnabled(userUiPermission, "reopen", "Help Desk");

  // Computed values
  const tickets = useMemo(() => ticketData?.data || [], [ticketData]);

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
    closeFlow.initiateClose(ticket);
  }, [closeFlow]);

  // handle revoke ticket 
  const { show, hide } = useLoadingOverlay();
  const handleRevoke = useCallback((ticket: HDTicket) => {
    show("Revoking ticket...");
    revokeTicketMutation.mutate({ ticketId: ticket.name }, {
      onSuccess: () => {
        toast.success("Ticket revoked successfully");
      },
      onError: (error) => {
        const formatedError = errorResponseFormater(error, "Failed to revoke ticket");
        toast.error(formatedError);
      },
      onSettled: () => {
        hide();
      }
    })
  }, [hide, show, revokeTicketMutation])

  const handleReopen = useCallback((ticket: HDTicket) => {
    show("Reopening ticket...");
    reopenTicketMutation.mutate({ ticketId: ticket.name }, {
      onSuccess: () => {
        toast.success("Ticket reopened successfully");
      },
      onError: (error) => {
        const formatedError = errorResponseFormater(error, "Failed to reopen ticket");
        toast.error(formatedError);
      },
      onSettled: () => {
        hide();
      }
    })
  }, [hide, show, reopenTicketMutation])

  const handleResolve = useCallback((ticket: HDTicket) => {
    closeFlow.initiateResolve(ticket);
  }, [closeFlow])

  const handleApplyFilters = useCallback((newFilters: TicketFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="sm:space-y-6 space-y-2">
      {/* Stats Cards */}
      <TicketStatsCards stats={statsData} isLoading={statsLoading} />

      {/* Page Heading */}
      <div>
        <Typography variant="h4" color="primary">
          All Issues Raised
        </Typography>
        <Typography variant="bodySmall" color="body2">
          Track and manage your support tickets
        </Typography>
      </div>

      {viewMode === "user" && (
        <div className="flex gap-6 border-b border-gray-200 mt-2">
          <button
            onClick={() => setSubTab("myself")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === "myself"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            Raised for Myself
          </button>
          <button
            onClick={() => setSubTab("others")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${subTab === "others"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            Raised for Others
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className={`${isDesktop ? "rounded-lg border border-gray-200" : ""} bg-white `}>
        {/* Table */}
        <div className={isDesktop ? "p-4" : "p-0"}>
          <TicketTable
            tickets={tickets}
            isLoading={ticketsLoading || currentUserLoading}
            onReply={handleReply}
            onClose={handleClose}
            onRevoke={handleRevoke}
            onReopen={handleReopen}
            onResolve={handleResolve}
            onRowClick={permReply ? handleReply : undefined}
            permRevoke={permRevoke}
            permCloseTicket={permCloseTicket}
            permReply={permReply}
            permReopen={permReopen}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            categoryMap={categoryMap}
            userLookup={userLookup || new Map()}
            employeeByEmail={employeeByEmail}
            headerControls={
              <div
                className="bg-white  w-full border-b border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center w-full lg:border-b border-gray-300 bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition">
                    <SearchInputWrapper
                      searchTerm={searchTerm}
                      handleSearch={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex mr-2 items-center">
                      <TicketFiltersComponent
                        fields={filterableFields}
                        filters={filters}
                        onApply={handleApplyFilters}
                        isLoading={fieldsLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>

            }
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

      {/* Centralized Close/Resolve Modal */}
      {closeFlow.modalState.isOpen && createPortal(
        <TicketCloseModal
          modalState={closeFlow.modalState}
          onClose={closeFlow.closeModal}
          onSubmit={closeFlow.handleModalSubmit}
          isLoading={closeFlow.isProcessing}
        />
        , document.body)}
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
