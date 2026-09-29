import { useQuery } from "@tanstack/react-query";
import { todoService, type TodoFilters, type TodoListResult, type TodoApprovalConfig } from "../services/todoService";

import type { TodoCategory } from "../types/todos";

export function useTodoList(filters: TodoFilters = {}) {
  return useQuery<TodoListResult>({
    queryKey: ["todo-list", filters],
    queryFn: () => todoService.getTodoList(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTodoCategories(enabled: boolean = true) {
  return useQuery<TodoCategory[]>({
    queryKey: ["todo-categories"],
    queryFn: () => todoService.getTodoCategories(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
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

export function useTodoTypeApprovalConfig(todo_name?: string) {
  return useQuery<TodoApprovalConfig | null>({
    queryKey: ["todo-approval-config", todo_name],
    queryFn: () => todo_name ? todoService.getTodoTypeApprovalConfig(todo_name) : null,
    enabled: !!todo_name,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

