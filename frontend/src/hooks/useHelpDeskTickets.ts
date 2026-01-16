import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FrappeAPI } from "../utils/frappeAPI";

// Types
export interface HDTicket {
  name: string;
  subject: string;
  status: string;
  custom_category: string;
  custom_sub_category: string;
  _assign: string | null;
  raised_by: string;
  creation: string;
  modified: string;
  resolution_details?: string;
  owner: string;
}

export interface TicketListResponse {
  data: HDTicket[];
  columns: Array<{ label: string; key: string; width: string }>;
  rows: string[];
  total_count: number;
  row_count: number;
}

export interface FilterableField {
  fieldname: string;
  fieldtype: string;
  label: string;
  options?: string;
}

export interface TicketStats {
  total: number;
  inProgress: number;
  closed: number;
  resolved: number;
}

export interface TicketFilters {
  [key: string]: unknown;
}

// Retry logic
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) return false;
  return failureCount < 3;
};

const defaultQueryOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 5, // 5 minutes
  retry: defaultRetry,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};

/**
 * Fetch ticket list with filters, pagination, sorting.
 * Note: User-based filtering is handled automatically by Frappe's permission_query hook.
 */
export const useTicketList = (
  filters: TicketFilters = {},
  orderBy: string = "modified desc",
  pageLength: number = 20,
  searchTerm: string = "",
  currentUserEmail?: string,
  isAdmin?: boolean
) => {
  // Build filters with search
  const effectiveFilters = { ...filters };
  if (searchTerm) {
    effectiveFilters.name = ["like", `%${searchTerm}%`];
  }

  // Don't add OR filters - Frappe's permission_query hook automatically filters
  // tickets based on user permissions (owner, contact, raised_by, customer, agent_group, etc.)
  // Adding our own filters would conflict with and override Frappe's permission system

  return useQuery<TicketListResponse>({
    queryKey: ["hd-tickets", filters, orderBy, pageLength, searchTerm, currentUserEmail, isAdmin],
    queryFn: async () => {
      // Use custom API that respects Frappe's permission system
      const result = await FrappeAPI.callMethod("recruitment.api.get_ticket_list_data", {
        doctype: "HD Ticket",
        filters: effectiveFilters,
        or_filters: [], // Empty - let Frappe's permission_query handle filtering
        order_by: orderBy,
        page_length: pageLength,
        rows: [
          "name",
          "subject",
          "status",
          "custom_category",
          "custom_sub_category",
          "_assign",
          "raised_by",
          "creation",
          "modified",
          "resolution_details",
          "owner",
        ],
        show_customer_portal_fields: true,
      });
      return result as TicketListResponse;
    },
    ...defaultQueryOptions,
  });
};

/**
 * Fetch ticket statistics (counts by status).
 * Note: User-based filtering is handled automatically by Frappe's permission_query hook.
 */
export const useTicketStats = (
  currentUserEmail?: string,
  isAdmin?: boolean
) => {
  // Don't add OR filters - Frappe's permission_query hook automatically filters
  // tickets based on user permissions

  return useQuery<TicketStats>({
    queryKey: ["hd-ticket-stats", currentUserEmail, isAdmin],
    queryFn: async () => {
      // Fetch all counts in parallel
      // Frappe's permission_query hook will automatically apply user-based filtering
      const [total, inProgress, closed, resolved] = await Promise.all([
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: {},
          or_filters: [], // Empty - let Frappe's permission_query handle filtering
        }),
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { status: ["in", ["Open", "Replied"]] },
          or_filters: [], // Empty - let Frappe's permission_query handle filtering
        }),
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { status: "Closed" },
          or_filters: [], // Empty - let Frappe's permission_query handle filtering
        }),
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { status: "Resolved" },
          or_filters: [], // Empty - let Frappe's permission_query handle filtering
        }),
      ]);

      return {
        total: (total as number) || 0,
        inProgress: (inProgress as number) || 0,
        closed: (closed as number) || 0,
        resolved: (resolved as number) || 0,
      };
    },
    ...defaultQueryOptions,
  });
};

/**
 * Fetch filterable fields for HD Ticket
 */
export const useFilterableFields = () => {
  return useQuery<FilterableField[]>({
    queryKey: ["hd-ticket-filterable-fields"],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.api.doc.get_filterable_fields",
        {
          doctype: "HD Ticket",
          show_customer_portal_fields: true,
        }
      );
      return result as FilterableField[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60,
  });
};

/**
 * Close ticket with resolution (for raiser/admin)
 */
export const useCloseTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      resolutionDetails,
    }: {
      ticketId: string;
      resolutionDetails?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status: "Closed",
      };
      if (resolutionDetails) {
        updateData.resolution_details = resolutionDetails;
      }

      const result = await FrappeAPI.updateDocument(
        "HD Ticket",
        ticketId,
        updateData
      );
      return result;
    },
    onSuccess: () => {
      // Invalidate ticket list and stats
      queryClient.invalidateQueries({ queryKey: ["hd-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["hd-ticket-stats"] });
    },
  });
};

/**
 * Request closure (for non-raiser users)
 */
export const useRequestClosure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      resolutionNotes,
    }: {
      ticketId: string;
      resolutionNotes: string;
    }) => {
      const result = await FrappeAPI.callMethod(
        "pw_helpdesk.customizations.api.ticket.request_closure",
        {
          ticket_id: ticketId,
          resolution_notes: resolutionNotes,
        }
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hd-tickets"] });
    },
  });
};

// ============== Request Issue Modal Hooks ==============

export interface HDCategory {
  name: string;
  category_name: string;
  category_code?: string;
  description?: string;
  subcategories?: HDCategory[];
}

export interface EmployeeSearchResult {
  value: string;
  description: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  custom_category?: string;
  custom_subcategory?: string;
  custom_rasied_for?: string;
  custom_raise_for_employee?: string;
  custom_for_myself?: number;
  custom_for_others?: number;
}

/**
 * Fetch HD Categories for dropdown
 */
export const useCategories = () => {
  return useQuery<HDCategory[]>({
    queryKey: ["hd-categories"],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod("helpdesk.api.category.get_categories");
      return result as HDCategory[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60,
  });
};

/**
 * Fetch subcategories for a parent category
 */
export const useSubcategories = (parentCategory: string) => {
  return useQuery<HDCategory[]>({
    queryKey: ["hd-subcategories", parentCategory],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.api.category.get_subcategories",
        { parent_category: parentCategory }
      );
      return result as HDCategory[];
    },
    enabled: !!parentCategory,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
};

/**
 * Search employees for "Raise For Others"
 */
export const useSearchEmployees = (searchText: string) => {
  return useQuery<EmployeeSearchResult[]>({
    queryKey: ["employee-search", searchText],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod("frappe.desk.search.search_link", {
        txt: searchText,
        doctype: "Employee",
        filters: {},
        page_length: 20,
      });
      return result as EmployeeSearchResult[];
    },
    enabled: searchText.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Create a new HD Ticket
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      doc,
      attachments = [],
    }: {
      doc: CreateTicketPayload;
      attachments?: Array<{ file_url: string; file_name: string }>;
    }) => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.helpdesk.doctype.hd_ticket.api.new",
        {
          doc,
          attachments,
        }
      );
      return result;
    },
    onSuccess: () => {
      // Invalidate ticket list and stats to refresh
      queryClient.invalidateQueries({ queryKey: ["hd-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["hd-ticket-stats"] });
    },
  });
};
