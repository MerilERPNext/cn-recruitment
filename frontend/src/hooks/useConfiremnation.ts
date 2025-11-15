import { useQuery } from "@tanstack/react-query";
import { ConfirmationService } from "../services/ConfirmationService";


export const useConfirmation = () => {
    return useQuery({
      queryKey: ["confirmation"],
      queryFn: ConfirmationService,
      placeholderData: [], // prevents undefined
    });
  };
