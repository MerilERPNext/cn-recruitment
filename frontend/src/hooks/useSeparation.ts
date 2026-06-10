import { useQuery } from "@tanstack/react-query";
import { getEmployeeSeparationType, getSeparationFunnelDetails, SeparationEmployeeService, getNoticePeriodAndSeparationPolicy, getEmployeeSeparationDetails } from "../services/SeparationService";
import { SeparationFunnelDetails, NoticePeriodAndSeparationPolicyResponse, EmployeeSeparationDetails } from "../types/flows";

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

export const useGetNoticePeriodAndSeparationPolicy = (employee: string) => {
  return useQuery<NoticePeriodAndSeparationPolicyResponse>({
    queryKey: ["notice-period-separation-policy", employee],
    queryFn: () => getNoticePeriodAndSeparationPolicy(employee),
    enabled: Boolean(employee),
  });
};

export const useEmployeeSeparationDetails = (docname: string) => {
  return useQuery<EmployeeSeparationDetails>({
    queryKey: ["employee-separation-details", docname],
    queryFn: () => getEmployeeSeparationDetails(docname),
    enabled: Boolean(docname),
  });
};