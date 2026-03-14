import { useQuery } from "@tanstack/react-query";
import { getSeparationWorkflow, SeparationEmployeeService } from "../services/SeparationService";

export const useSeparationEmployee = () => {
    return useQuery({
      queryKey: ["separation-employee"],
      queryFn: SeparationEmployeeService,
    });
  };

export const useGetSeparationWorkflow = () => {
  return useQuery({
    queryKey: ["separation-workflow"],
    queryFn: getSeparationWorkflow,
  });
};