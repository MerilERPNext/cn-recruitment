import { useQuery } from "@tanstack/react-query";
import { getSeparationFunnelDetails, SeparationEmployeeService } from "../services/SeparationService";
import { SeparationFunnelDetails } from "../types/flows";

export const useSeparationEmployee = () => {
  return useQuery({
    queryKey: ["separation-employee"],
    queryFn: SeparationEmployeeService,
  });
};

export const useGetSeparationFunnelDetails = () => {
  return useQuery<SeparationFunnelDetails>({
    queryKey: ["separation-workflow"],
    queryFn: getSeparationFunnelDetails,
  });
};