import { useQuery } from "@tanstack/react-query";
import { ConfirmationEmployeeService, ConfirmationService, } from "../services/ConfirmationService";
import { TodoType } from "../types/todos";

export const useConfirmation = (doctype: string, todo_status: "Open" | "Closed") => {
  return useQuery<TodoType[], Error>({
    queryKey: ["confirmation", todo_status, doctype],
    queryFn: () => ConfirmationService(doctype, todo_status),
    enabled: !!doctype && !!todo_status,
  });
};

export const useSeparation = (doctype: string, todo_status: "Open" | "Closed") => {
  return useQuery<TodoType[], Error>({
    queryKey: ["separation", todo_status, doctype],
    queryFn: () => ConfirmationService(doctype, todo_status),
    enabled: !!doctype,
  });
};

export const useConfirmationEmployee = () => {
  return useQuery({
    queryKey: ["confirmation-employee"],
    queryFn: ConfirmationEmployeeService,
  });
};
