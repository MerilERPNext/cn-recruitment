import { useQuery } from "@tanstack/react-query";
import { ConfirmationEmployeeService, ConfirmationService, } from "../services/ConfirmationService";


export const useConfirmationAndseparation = (doctype: string) => {
  return useQuery({
    queryKey: ["confirmation", doctype],
    queryFn: () => ConfirmationService(doctype)
  });
};

export const useConfirmationEmployee = () => {
  return useQuery({
    queryKey: ["confirmation-employee"],
    queryFn: ConfirmationEmployeeService,
  });
};
