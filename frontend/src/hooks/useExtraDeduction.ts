import { useQuery } from "@tanstack/react-query";
import { getExtraDeductionList } from "../services/extraDeductionService";

export function useExtraDeductions(
  company: string | null | undefined,
  employee_id: string | null | undefined,
  payroll_period: string | null | undefined
) {
  return useQuery({
    queryKey: ["extra-deductions", employee_id, company, payroll_period],
    queryFn: () => getExtraDeductionList(employee_id, company, payroll_period),
    enabled: !!employee_id && !!company && !!payroll_period,
  });
}
