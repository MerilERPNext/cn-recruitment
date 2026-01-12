import { useQuery } from "@tanstack/react-query";
import { ConfirmationEmployeeService, ConfirmationService, } from "../services/ConfirmationService";
import { TodoType } from "../types/todos";

export const useConfirmation = (doctype: string) => {
  return useQuery<TodoType[], Error>({
    queryKey: ["confirmation", doctype],
    queryFn: () => ConfirmationService(doctype)
  });
};

export const useSeparation = (doctype: string) => {
  return useQuery<TodoType[], Error>({
    queryKey: ["separation", doctype],
    queryFn: () => ConfirmationService(doctype)
  });
};

export const useConfirmationEmployee = () => {
  return useQuery({
    queryKey: ["confirmation-employee"],
    queryFn: ConfirmationEmployeeService,
  });
};
