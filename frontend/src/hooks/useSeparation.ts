import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getEmployeeSeparationType,
  getSeparationFunnelDetails,
  SeparationEmployeeService,
  getNoticePeriodAndSeparationPolicy,
  getEmployeeSeparationDetails,
  revokeEmployeeSeparation,
  getEmployeeSupportContacts,
  getSeparationOpenItems,
  getSeparationWorkflowStages,
  getFullAndFinalEstimate,
} from "../services/SeparationService";
import { SeparationFunnelDetails, NoticePeriodAndSeparationPolicyResponse, EmployeeSeparationDetails } from "../types/flows";
import {
  EmployeeSupportContacts,
  SeparationOpenItemsData,
  SeparationWorkflowStagesResponse,
  FullAndFinalEstimateResponse,
} from "../types/separation";

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

export const useRevokeEmployeeSeparation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ separation_name, reason }: { separation_name: string; reason: string }) =>
      revokeEmployeeSeparation(separation_name, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
    },
  });
};

export const useEmployeeSupportContacts = (employeeId?: string | null) => {
  return useQuery<EmployeeSupportContacts>({
    queryKey: ["employee-support-contacts", employeeId],
    queryFn: () => getEmployeeSupportContacts(employeeId || ""),
    enabled: Boolean(employeeId),
  });
};

export const useGetSeparationOpenItems = (employee?: string | null) => {
  return useQuery<SeparationOpenItemsData>({
    queryKey: ["separation-open-items", employee],
    queryFn: () => getSeparationOpenItems(employee || ""),
    enabled: Boolean(employee),
  });
};

export const useGetSeparationWorkflowStages = (employee?: string | null) => {
  return useQuery<SeparationWorkflowStagesResponse>({
    queryKey: ["separation-workflow-stages", employee],
    queryFn: () => getSeparationWorkflowStages(employee || ""),
    enabled: Boolean(employee),
  });
};

export const useGetFullAndFinalEstimate = (employee?: string | null) => {
  return useQuery<FullAndFinalEstimateResponse | null>({
    queryKey: ["full-and-final-estimate", employee],
    queryFn: () => getFullAndFinalEstimate(employee || ""),
    enabled: Boolean(employee),
  });
};