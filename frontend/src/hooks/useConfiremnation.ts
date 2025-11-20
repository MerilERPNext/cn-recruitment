import { useQuery } from "@tanstack/react-query";
import { ConfirmationEmployeeService, ConfirmationService } from "../services/ConfirmationService";


export const useConfirmation = () => {
    return useQuery({
      queryKey: ["confirmation"],
      queryFn: ConfirmationService,
      placeholderData: [], // prevents undefined
    });
  };

  export const useConfirmationEmployee = () => {
    return useQuery({
      queryKey: ["confirmation-employee"],
      queryFn: ConfirmationEmployeeService,
    });
  };
