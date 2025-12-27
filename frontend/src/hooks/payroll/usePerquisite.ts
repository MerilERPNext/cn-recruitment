import { useQuery } from "@tanstack/react-query";
import { getPerquisite } from "../../services/payrollApi/perquisiteService";



export const usePerquisite = (
  employeeId?: string,
  company?: string,
  payroll_period?: string,
) => {
return useQuery({
queryKey: ["payroll-data", employeeId, company, payroll_period],
queryFn: () => getPerquisite(employeeId,   company, payroll_period),
enabled: true,
staleTime: 5 * 60 * 1000, // 5 minutes
});
}