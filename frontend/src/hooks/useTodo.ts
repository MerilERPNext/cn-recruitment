import { useQuery } from "@tanstack/react-query";
import { todoService, type TodoFilters, type ToDo } from "../services/todoService";
import type { FrappePageResponse } from "../types/frappe";

export function useTodoList(filters: TodoFilters = {}) {
  return useQuery<ToDo[]>({
    queryKey: ["todo-list", filters],
    queryFn: () => todoService.getTodoList(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch function compatible with DataListView's fetchFunction prop.
 * Wraps todoService.getTodoList and returns FrappePageResponse format.
 */
export const fetchTodoListForDataListView = async (
  filters: TodoFilters = {}
): Promise<FrappePageResponse> => {
  const data = await todoService.getTodoList(filters);

  return {
    data,
    totalCount: data.length,
    hasNextPage: false,
    nextCursor: undefined,
    pages: [1],
  };
};
