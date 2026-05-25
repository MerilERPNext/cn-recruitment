/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdvance,
  getAllowRequestsOnHold,
  getAdvances,
  getAdvancesAmount,
  getAdvancesTypes,
  getAllAdvancesTypes,
  getCostCenters,
  getCurrencies,
  getExpenseAdvanceList,
  getExpenseTableFieldSettings,
  getCheckAdvancePolicy,
  getExpenseTypeFields,
  getExpenseTypes,
  getProjects,
  updateEmployeeAdvance,
} from "../services/employeeAdvances";
import { AllowRequestsOnHoldResponse, ApiAdvance, ApiAdvanceResponse } from "../types/employeeAttendance";
import FrappeAPI from "../utils/frappeAPI";

export const useEmployeeAdvances = (employeeId?: string) => {
  return useQuery<ApiAdvanceResponse>({
    queryKey: ["advances", employeeId],
    queryFn: () => getAdvances(employeeId!),
    enabled: !!employeeId,
  });
};

export const useAdvancesType = () => {
  return useQuery({
    queryKey: ["advances-type"],
    queryFn: getAllAdvancesTypes,
  });
};

export const useExpenseAdvances = (employeeId: string) => {
  return useQuery({
    queryKey: ["employee-advance", employeeId],
    queryFn: () => getExpenseAdvanceList(employeeId),
    enabled: !!employeeId,
  });
};

//this hook for create employee advance application
export function useCreateNewAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createAdvance(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["employee-advnace"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}

export const useEmployeeAdvancesAmount = (
  employeeId?: string,
  advanceType?: string,
  postingDate?: string,
  company?: string
) => {
  return useQuery<ApiAdvance>({
    queryKey: ["advances", employeeId, advanceType, postingDate, company],
    queryFn: () =>
      getAdvancesAmount(employeeId!, advanceType, postingDate, company),
    enabled: !!employeeId && !!advanceType && !!postingDate && !!company,
  });
};

export const useCurrencies = () => {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: getCurrencies,
  });
};

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
};

export const useCostCenters = () => {
  return useQuery({
    queryKey: ["cost-centers"],
    queryFn: getCostCenters,
  });
};

export const useExpenseTypeFields = (expenseType: string | null) => {
  return useQuery({
    queryKey: ["expenseTypeFields", expenseType],
    queryFn: () => getExpenseTypeFields(expenseType!),
    enabled: !!expenseType,
  });
};

export const useExpenseTypes = () => {
  return useQuery({
    queryKey: ["expenseTypes"],
    queryFn: getExpenseTypes,
  });
};

export const useExpenseTableFieldSettings = (
  employeeId: string | null,
  subAdvanceType: string | null
) => {
  return useQuery({
    queryKey: ["expense-table-field-settings", employeeId, subAdvanceType],
    queryFn: () => getExpenseTableFieldSettings(employeeId!, subAdvanceType!),
    enabled: !!employeeId && !!subAdvanceType,
  });
};

export const useCheckAdvancePolicy = (employeeId: string | null) => {
  return useQuery({
    queryKey: ["check-advance-policy", employeeId],
    queryFn: () => getCheckAdvancePolicy(employeeId!),
    enabled: !!employeeId,
  });
};

export const useAdvanceTypes = () => {
  return useQuery({
    queryKey: ["advance-types"],
    queryFn: getAdvancesTypes,
  });
};

export interface EmployeeAdvanceUpdatePayload {
  docname: string; // Loan Application ka name/id
  data: Record<string, any>; // update karne wala data
}

export const useEmployeeAdvanceUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeAdvanceUpdatePayload) => updateEmployeeAdvance(payload),
    onSuccess: (data, variables) => {
      console.log("Employee Advance updated:", data);
      queryClient.invalidateQueries({ queryKey: ["employee-advance", variables.docname] });
      queryClient.invalidateQueries({ queryKey: ["employee-advance-list"] });
    },
    onError: (error: any) => {
      console.error("Update failed:", error.response?.data || error.message);
    },
  });
};


export const useGetEmployeeAdvanceDoc = (
  docname: string
) => {
  return useQuery({
    queryKey: ["advance-doc-data", docname],
    queryFn: () => FrappeAPI.getDocument("Employee Advance", docname!),
    enabled: !!docname,
  });
};

export const useAllowRequestsOnHold = () => {
  return useQuery<AllowRequestsOnHoldResponse>({
    queryKey: ["allow-requests-on-hold"],
    queryFn: getAllowRequestsOnHold,
    staleTime: 10 * 60 * 1000, // cache for 10 minutes
    retry: 1,
  });
};
