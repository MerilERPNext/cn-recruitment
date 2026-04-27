import { useQuery } from "@tanstack/react-query";
import { getEmployeeSeparationType, getSeparationFunnelDetails, SeparationEmployeeService } from "../services/SeparationService";
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


export const useGetEmployeeSeparationType = (docname: string) => {
  return useQuery<{ custom_resignaion_type?: string }>({
    queryKey: ["employee-separation-type", docname],
    queryFn: () => getEmployeeSeparationType("Employee Separation", docname),
    enabled: Boolean(docname)
  });
};