import { useMutation, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import {
  fetchFlexiComponents,
  updateFlexiComponents,
  fetchFlexiLockingPeriodVisibility,
  fetchIndividualEmployeeFlexiLockingPeriod,
  setIndividualEmployeeFlexiLockingPeriod
} from "../../services/payrollApi/flexiDeclarationService";
import { FlexiDataResponse, FlexiComponent, FlexiLockingPeriod, FlexiLockingPeriodVisibility } from "../../types/flexiDeclaration";

export const useFlexiComponents = (
  employee: string | undefined,
  payroll_period: string | undefined,
  company: string | undefined
): UseQueryResult<FlexiDataResponse, Error> => {
  return useQuery({
    queryKey: ["flexi-components", employee, payroll_period, company],
    queryFn: () => fetchFlexiComponents(employee!, payroll_period!, company!),
    enabled: !!employee && !!payroll_period && !!company,
  });
};

export const useUpdateFlexiComponents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string, flexi_components: FlexiComponent[] }) => updateFlexiComponents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flexi-components"] });
    },
  });
};

export const useFlexiLockingPeriodVisibility = (params: {
  employee: string;
  payroll_period: string;
  posting_date: string;
  doctype: string;
}) => {
  return useQuery({
    queryKey: ["flexi-locking-period-visibility", params],
    queryFn: () => fetchFlexiLockingPeriodVisibility(params),
    enabled: !!params.employee && !!params.payroll_period,
  });
};

export const useIndividualEmployeeFlexiLockingPeriod = (employee: string) => {
  return useQuery({
    queryKey: ["individual-employee-flexi-locking-period", employee],
    queryFn: () => fetchIndividualEmployeeFlexiLockingPeriod(employee),
    enabled: !!employee,
  });
};

export const useSetIndividualEmployeeFlexiLockingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FlexiLockingPeriod) => setIndividualEmployeeFlexiLockingPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individual-employee-flexi-locking-period"] });
    },
  });
};

