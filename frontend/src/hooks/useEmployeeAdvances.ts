import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdvance,
  getAdvances,
  getAdvancesAmount,
  getAdvancesTypes,
  getAllAdvancesTypes,
  getCostCenters,
  getCurrencies,
  getExpenseAdvanceList,
  getExpenseTableFieldSettings,
  getExpenseTypeFields,
  getExpenseTypes,
  getProjects,
} from "../services/employeeAdvances";
import { ApiAdvance } from "../types/employeeAttendance";

export const useEmployeeAdvances = (employeeId?: string) => {
  return useQuery<ApiAdvance[]>({
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

export const useAdvanceTypes = () => {
  return useQuery({
    queryKey: ["advance-types"],
    queryFn: getAdvancesTypes,
  });
};
