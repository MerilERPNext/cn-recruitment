import { useQuery } from "@tanstack/react-query";
import { todoService, type TodoFilters, type ToDo } from "../services/todoService";

export function useTodoList(filters: TodoFilters = {}) {
  return useQuery<ToDo[]>({
    queryKey: ["todo-list", filters],
    queryFn: () => todoService.getTodoList(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

