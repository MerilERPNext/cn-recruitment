import FrappeAPI from "../utils/frappeAPI";
import type { TodoCategory } from "../types/todos";

export interface TodoFilters {
  [key: string]: unknown;
  status_filter?: string;
  type?: string;
  sort_by?: string;
  page?: number;
  search?: string;
  priority?: string;
  sort_order?: string;
  allocated_to?: string;
  assigned_by?: string;
  todo_type_filter?: string;
  due_filter?: string | null;
  category_filter?: string | null;
}

export interface ToDo {
  [key: string]: unknown;
  name: string;
  custom_subject: string | null;
  description: string;
  allocated_to: string | null;
  priority: string;
  status: string;
  date: string;
  owner: string;
  modified: string;
  custom_todo_type: string;
  custom_dynamic_route: string;
  assigned_by: string;
  creation: string;
  reference_type: string;
  reference_name: string;
  /** `status` of the reference document, when that doctype has one. */
  reference_status?: string | null;
  custom_due_datetime: string | null;
  custom_doctype_actions: string;
  custom_funnel_task: string;
  custom_approval_type: string;
  custom_open_chatnext_assistant_on_action: number;
  custom_redirect_only: number;
  is_delegated: number;
  delegated_from: string | null;
  custom_reminders: unknown[];
}

export interface TodoApprovalConfig {
  reason_required_for_approval: boolean;
  reason_required_for_rejection: boolean;
  reason_character_mandatory: number;
}

const TODO_API_METHOD =
  "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_list";

const TODO_CATEGORIES_API_METHOD =
  "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_categories";

const TODO_APPROVAL_CONFIG_API_METHOD =
  "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_type_approval_config";

export const todoService = {
  getTodoList: async (filters: TodoFilters = {}): Promise<ToDo[]> => {
    try {
      const params: TodoFilters = {
        status_filter: "Open",
        type: "My Todo",
        sort_by: "modified",
        page: 1,
        search: "",
        priority: "",
        sort_order: "",
        allocated_to: "[]",
        assigned_by: "[]",
        todo_type_filter: "[]",
        due_filter: null,
        category_filter: null,
        ...filters,
      };

      const result = await FrappeAPI.callMethod(TODO_API_METHOD, params);

      // Response is { message: [...] } after callMethod unwraps the outer message
      const response = result as { message?: ToDo[] } | ToDo[];
      const data: ToDo[] = Array.isArray(response)
        ? response
        : (response as { message?: ToDo[] })?.message || [];

      return data;
    } catch (error) {
      console.error("📡 Error fetching todo list:", error);
      throw error;
    }
  },

  getTodoCategories: async (): Promise<TodoCategory[]> => {
    try {
      const result = await FrappeAPI.callMethod(TODO_CATEGORIES_API_METHOD, {
        type: "My Todo",
      });

      return (result as { message?: TodoCategory[] })?.message || [];
    } catch (error) {
      console.error("📡 Error fetching todo categories:", error);
      throw error;
    }
  },

  getTodoPendingCount: async (): Promise<number> => {
    try {
      // Reuse the categories API — FrappeAPI.callMethod unwraps response.data.message,
      // so result is { message: [...] }. Sum all counts except "Uncategorized".
      const result = await FrappeAPI.callMethod(TODO_CATEGORIES_API_METHOD, {
        type: "My Todo",
      });

      const categories = (result as { message?: { name: string; count: number }[] })?.message || [];

      return categories
        .filter((cat) => cat.name !== "Uncategorized")
        .reduce((sum, cat) => sum + (cat.count || 0), 0);
    } catch (error) {
      console.error("📡 Error fetching todo pending count:", error);
      return 0;
    }
  },

  getTodoTypeApprovalConfig: async (todo_name: string): Promise<TodoApprovalConfig | null> => {
    try {
      const result = await FrappeAPI.callMethod(TODO_APPROVAL_CONFIG_API_METHOD, {
        todo_name,
      });

      // API returns { message: { reason_required_for_approval: false, ... } }
      // FrappeAPI wrapper usually returns the content of the response.
      // Depending on the FrappeAPI wrapper, the actual message might be directly in `result`
      // or `(result as any).message`. Let's handle both.
      const data = (result as { message?: TodoApprovalConfig })?.message || (result as TodoApprovalConfig);
      
      if (data && typeof data === 'object') {
         return data;
      }
      return null;
    } catch (error) {
      console.error("📡 Error fetching todo approval config:", error);
      return null;
    }
  },
};

