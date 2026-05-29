import { useQuery } from "@tanstack/react-query";
import { ConfirmationEmployeeService, ConfirmationService, } from "../services/ConfirmationService";
import type { FlowRequestItem } from "../types/flows";

export const useConfirmation = (doctype: string) => {
  return useQuery<FlowRequestItem[], Error>({
    queryKey: ["confirmation", doctype],
    queryFn: () => ConfirmationService(doctype),
    enabled: !!doctype,
  });
};


export const useConfirmationEmployee = () => {
  return useQuery({
    queryKey: ["confirmation-employee"],
    queryFn: ConfirmationEmployeeService,
  });
};
