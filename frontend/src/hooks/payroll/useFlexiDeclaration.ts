import { useMutation, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { fetchFlexiComponents, updateFlexiComponents } from "../../services/payrollApi/flexiDeclarationService";
import { FlexiDataResponse, FlexiComponent } from "../../types/flexiDeclaration";

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
