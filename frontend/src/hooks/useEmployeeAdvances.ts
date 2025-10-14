import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdvance, getAdvances, getAdvancesAmount, getAllAdvancesTypes, getExpenseAdvanceList } from "../services/employeeAdvances";
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
    queryFn: () => getAdvancesAmount(employeeId!, advanceType, postingDate, company),
    enabled: !!employeeId && !!advanceType && !!postingDate && !!company,
  });
};

