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
 * Fetch ticket list with filters, pagination, and sorting
 */
export const useTicketList = (
  filters: TicketFilters = {},
  orderBy: string = "modified desc",
  pageLength: number = 20,
  searchTerm: string = ""
) => {
  // Build filters with search
  const effectiveFilters = { ...filters };
  if (searchTerm) {
    effectiveFilters.name = ["like", `%${searchTerm}%`];
  }

  return useQuery<TicketListResponse>({
    queryKey: ["hd-tickets", filters, orderBy, pageLength, searchTerm],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod("helpdesk.api.doc.get_list_data", {
        doctype: "HD Ticket",
        filters: effectiveFilters,
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
 * Fetch ticket statistics (counts by status)
 */
export const useTicketStats = () => {
  return useQuery<TicketStats>({
    queryKey: ["hd-ticket-stats"],
    queryFn: async () => {
      // Fetch all counts in parallel
      const [total, inProgress, closed, resolved] = await Promise.all([
        FrappeAPI.callMethod("frappe.client.get_count", {
          doctype: "HD Ticket",
        }),
        FrappeAPI.callMethod("frappe.client.get_count", {
          doctype: "HD Ticket",
          filters: { status: ["in", ["Open", "Replied"]] },
        }),
        FrappeAPI.callMethod("frappe.client.get_count", {
          doctype: "HD Ticket",
          filters: { status: "Closed" },
        }),
        FrappeAPI.callMethod("frappe.client.get_count", {
          doctype: "HD Ticket",
          filters: { status: "Resolved" },
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
