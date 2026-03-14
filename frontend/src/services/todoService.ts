import FrappeAPI from "../utils/frappeAPI";

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

const TODO_API_METHOD =
  "cn_todo_manager.chatnext_todo_manager.api.todo_api.get_todo_list";

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
};
