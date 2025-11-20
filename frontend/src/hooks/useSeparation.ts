import { useQuery } from "@tanstack/react-query";
import { SeparationEmployeeService } from "../services/SeparationService";

export const useSeparationEmployee = () => {
    return useQuery({
      queryKey: ["separation-employee"],
      queryFn: SeparationEmployeeService,
    });
  };