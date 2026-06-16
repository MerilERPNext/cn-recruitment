import { useQuery } from "@tanstack/react-query";
import { todoService, type TodoFilters, type ToDo } from "../services/todoService";
import type { TodoCategory } from "../types/todos";

export function useTodoList(filters: TodoFilters = {}) {
  return useQuery<ToDo[]>({
    queryKey: ["todo-list", filters],
    queryFn: () => todoService.getTodoList(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTodoCategories() {
  return useQuery<TodoCategory[]>({
    queryKey: ["todo-categories"],
    queryFn: () => todoService.getTodoCategories(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.filter((cat) => cat.name !== "Uncategorized"),
  });
}

export function useTodoPendingCount() {
  return useQuery<number>({
    queryKey: ["todo-pending-count"],
    queryFn: () => todoService.getTodoPendingCount(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}
