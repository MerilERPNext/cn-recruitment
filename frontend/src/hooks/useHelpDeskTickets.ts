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
 * Supports viewMode for role-based filtering:
 * - "user" view: shows tickets raised by the current user
 * - "admin" view: shows tickets assigned to the current user (for HD Agents)
 */
export const useTicketList = (
  filters: TicketFilters = {},
  orderBy: string = "modified desc",
  pageLength: number = 20,
  searchTerm: string = "",
  currentUserEmail?: string,
  isAdmin?: boolean,
  viewMode: "user" | "admin" = "user"
) => {
  // Build filters with search and viewMode-based filtering
  const effectiveFilters = { ...filters };
  if (searchTerm) {
    effectiveFilters.name = ["like", `%${searchTerm}%`];
  }

  // Apply viewMode-based filtering
  if (currentUserEmail) {
    if (viewMode === "user") {
      // User view: show tickets raised by current user
      effectiveFilters.raised_by = currentUserEmail;
    } else if (viewMode === "admin") {
      // Admin view: show tickets assigned to current user
      effectiveFilters._assign = ["like", `%${currentUserEmail}%`];
    }
  }

  return useQuery<TicketListResponse>({
    queryKey: ["hd-tickets", filters, orderBy, pageLength, searchTerm, currentUserEmail, isAdmin, viewMode],
    queryFn: async () => {
      // Use custom API that respects Frappe's permission system
      const result = await FrappeAPI.callMethod("recruitment.api.get_ticket_list_data", {
        doctype: "HD Ticket",
        filters: effectiveFilters,
        or_filters: [],
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
 * Supports viewMode for role-based filtering:
 * - "user" view: counts tickets raised by the current user
 * - "admin" view: counts tickets assigned to the current user (for HD Agents)
 */
export const useTicketStats = (
  currentUserEmail?: string,
  isAdmin?: boolean,
  viewMode: "user" | "admin" = "user"
) => {
  // Build base filters based on viewMode
  const getBaseFilters = (): TicketFilters => {
    if (!currentUserEmail) return {};
    if (viewMode === "user") {
      return { raised_by: currentUserEmail };
    } else if (viewMode === "admin") {
      return { _assign: ["like", `%${currentUserEmail}%`] };
    }
    return {};
  };

  return useQuery<TicketStats>({
    queryKey: ["hd-ticket-stats", currentUserEmail, isAdmin, viewMode],
    queryFn: async () => {
      const baseFilters = getBaseFilters();

      // Fetch all counts in parallel with viewMode-based filtering
      const [total, inProgress, closed, resolved] = await Promise.all([
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { ...baseFilters },
          or_filters: [],
        }),
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { ...baseFilters, status: ["in", ["Open", "Replied"]] },
          or_filters: [],
        }),
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { ...baseFilters, status: "Closed" },
          or_filters: [],
        }),
        FrappeAPI.callMethod("recruitment.api.get_ticket_count", {
          doctype: "HD Ticket",
          filters: { ...baseFilters, status: "Resolved" },
          or_filters: [],
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
      status = "Closed",
    }: {
      ticketId: string;
      resolutionDetails?: string;
      status?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
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
    onSuccess: async (_data, variables) => {
      // Refetch ticket detail immediately to update UI without refresh
      await queryClient.refetchQueries({ queryKey: ["hd-ticket-detail", variables.ticketId] });
      // Invalidate list and stats to refresh on next view
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
    onSuccess: async (_data, variables) => {
      // Refetch ticket detail immediately to update UI without refresh
      await queryClient.refetchQueries({ queryKey: ["hd-ticket-detail", variables.ticketId] });
      // Invalidate list to refresh on next view
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
 * Uses frappe.client.get_list which respects Frappe's User Permissions
 */
export const useSearchEmployees = (searchText: string) => {
  return useQuery<EmployeeSearchResult[]>({
    queryKey: ["employee-search", searchText],
    queryFn: async () => {
      // Use get_list which properly respects User Permissions
      const result = await FrappeAPI.callMethod("frappe.client.get_list", {
        doctype: "Employee",
        or_filters: [
          ["name", "like", `%${searchText}%`],
          ["employee_name", "like", `%${searchText}%`]
        ],
        fields: ["name", "employee_name", "department", "designation"],
        limit_page_length: 20,
        order_by: "employee_name asc",
      });

      // Transform to expected format (value/description for compatibility)
      return ((result as Array<{ name: string; employee_name: string; department?: string; designation?: string }>) || []).map(emp => ({
        value: emp.name,
        description: `${emp.employee_name}${emp.designation ? ` - ${emp.designation}` : ''}${emp.department ? ` (${emp.department})` : ''}`,
      }));
    },
    enabled: searchText.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetch subordinate employees for "Raise for Others" dropdown
 * Returns employees where current user is their reports_to, HRBP, or HOD
 */
export const useSubordinateEmployees = () => {
  return useQuery<EmployeeSearchResult[]>({
    queryKey: ["subordinate-employees"],
    queryFn: async () => {
      // Use the get_reportees API which returns employees reporting to current user
      const result = await FrappeAPI.getMethod(
        "cn_leave_shift_managment.api.get_reportees"
      );

      // Transform to expected format (value/description for compatibility)
      return ((result as Array<{ name: string; employee_name: string; department?: string; designation?: string }>) || []).map(emp => ({
        value: emp.name,
        description: `${emp.employee_name}${emp.designation ? ` - ${emp.designation}` : ''}${emp.department ? ` (${emp.department})` : ''}`,
      }));
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
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
    }: {
      doc: CreateTicketPayload;
    }) => {
      // Only pass doc - attachments should be embedded in description as HTML
      const result = await FrappeAPI.callMethod(
        "helpdesk.helpdesk.doctype.hd_ticket.api.new",
        {
          doc,
        }
      );
      return result;
    },
    onSuccess: async () => {
      // Refetch ticket list and stats immediately to show new ticket without refresh
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["hd-tickets"] }),
        queryClient.refetchQueries({ queryKey: ["hd-ticket-stats"] }),
      ]);
    },
  });
};

// ============== Agents Hook for @mentions ==============

export interface HDAgent {
  name: string;
  agent_name: string;
  user: string;
  user_image?: string;
}

/**
 * Fetch HD Agents for @mention suggestions
 * Uses fallback API first to avoid 417 errors from helpdesk.api.agent.get_agents
 */
export const useAgents = () => {
  return useQuery<HDAgent[]>({
    queryKey: ["hd-agents"],
    queryFn: async () => {
      // Use fallback API directly (more reliable, avoids 417 errors)
      try {
        const result = await FrappeAPI.callMethod("frappe.client.get_list", {
          doctype: "HD Agent",
          fields: ["name", "agent_name", "user"],
          limit_page_length: 100,
        });
        return (result as HDAgent[]) || [];
      } catch {
        // Silent fail - @mentions just won't work if this fails
        return [];
      }
    },
    retry: false, // Don't retry on failure
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30,
  });
};

/**
 * User info for @mention suggestions
 */
export interface MentionUser {
  name: string;
  full_name: string;
  email: string;
  user_image?: string;
}

/**
 * Fetch all active users for @mention suggestions (employees/users)
 */
export const useMentionUsers = () => {
  return useQuery<MentionUser[]>({
    queryKey: ["mention-users"],
    queryFn: async () => {
      try {
        const result = await FrappeAPI.callMethod("frappe.client.get_list", {
          doctype: "User",
          fields: ["name", "full_name", "email", "user_image"],
          filters: {
            enabled: 1,
            user_type: "System User",
          },
          limit_page_length: 200,
        });
        return (result as MentionUser[]) || [];
      } catch {
        return [];
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
};

/**
 * Fetch user lookup map (email -> full_name)
 * Used for displaying assignee names in ticket list instead of emails
 */
export const useUserLookup = () => {
  return useQuery<Map<string, string>>({
    queryKey: ["user-lookup"],
    queryFn: async () => {
      try {
        const result = await FrappeAPI.callMethod("frappe.client.get_list", {
          doctype: "User",
          fields: ["name", "full_name"],
          filters: { enabled: 1 },
          limit_page_length: 500,
        });
        const map = new Map<string, string>();
        ((result as Array<{ name: string; full_name: string }>) || []).forEach((u) => {
          map.set(u.name, u.full_name || u.name.split("@")[0]);
        });
        return map;
      } catch {
        return new Map<string, string>();
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30,
  });
};

// ============== Ticket Detail View Hooks ==============

export interface TicketContact {
  name: string;
  email_id: string;
  image?: string;
  mobile_no?: string;
  phone?: string;
  company_name?: string;
}

export interface TicketUser {
  name: string;
  email: string;
  user_image?: string;
  full_name?: string;
}

export interface TicketAttachment {
  file_name: string;
  file_url: string;
}

export interface TicketComment {
  name: string;
  commented_by: string;
  content: string;
  creation: string;
  is_pinned?: boolean;
  attachments?: TicketAttachment[];
  user?: TicketUser;
}

export interface TicketCommunication {
  name: string;
  sender: string;
  recipients: string;
  cc?: string;
  bcc?: string;
  subject: string;
  content: string;
  creation: string;
  communication_date: string;
  delivery_status?: string;
  attachments?: TicketAttachment[];
  user?: TicketUser;
}

export interface TicketHistory {
  creation: string;
  action: string;
  user: string;
}

export interface TicketDetail {
  name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  agent_group?: string;
  raised_by: string;
  _assign?: string;
  creation: string;
  modified: string;
  response_by?: string;
  resolution_by?: string;
  first_responded_on?: string;
  resolution_date?: string;
  custom_category?: string;
  custom_sub_category?: string;
  // Category names (API may return these populated)
  category?: { name: string; category_name: string };
  sub_category?: { name: string; category_name: string };
  via_customer_portal?: number;
  agreement_status?: string;
  resolution_details?: string;
  contact?: TicketContact;
  comments: TicketComment[];
  communications: TicketCommunication[];
  history: TicketHistory[];
}

/**
 * Fetch single ticket with all communications, comments, and history
 */
export const useTicketDetail = (ticketId: string) => {
  return useQuery<TicketDetail>({
    queryKey: ["hd-ticket-detail", ticketId],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.helpdesk.doctype.hd_ticket.api.get_one",
        {
          name: ticketId,
          is_customer_portal: false,
        }
      );
      return result as TicketDetail;
    },
    enabled: !!ticketId,
    ...defaultQueryOptions,
  });
};

/**
 * Send email reply to ticket
 */
export const useSendEmailReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      to,
      cc,
      bcc,
      message,
    }: {
      ticketId: string;
      to: string;
      cc?: string;
      bcc?: string;
      message: string;
    }) => {
      // Attachments are now embedded in message HTML
      const result = await FrappeAPI.callMethod("run_doc_method", {
        dt: "HD Ticket",
        dn: ticketId,
        method: "reply_via_agent",
        args: {
          to,
          cc,
          bcc,
          message,
        },
      });
      return result;
    },
    onSuccess: async (_data, variables) => {
      // Refetch ticket detail immediately to show new communication without refresh
      await queryClient.refetchQueries({
        queryKey: ["hd-ticket-detail", variables.ticketId],
      });
    },
  });
};

/**
 * Add internal comment to ticket
 */
export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
    }: {
      ticketId: string;
      content: string;
    }) => {
      // Attachments are now embedded in content HTML
      const result = await FrappeAPI.callMethod("run_doc_method", {
        dt: "HD Ticket",
        dn: ticketId,
        method: "new_comment",
        args: {
          content,
        },
      });
      return result;
    },
    onSuccess: async (_data, variables) => {
      // Refetch ticket detail immediately to show new comment without refresh
      await queryClient.refetchQueries({
        queryKey: ["hd-ticket-detail", variables.ticketId],
      });
    },
  });
};
