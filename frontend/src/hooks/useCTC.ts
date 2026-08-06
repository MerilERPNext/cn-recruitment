import { useQuery } from "@tanstack/react-query";
import { generateSalarySlip } from "../services/ctcservice";

export const useGenerateSalarySlip = (employeeId?: string, payroll_period?: string) => {
  return useQuery({
    queryKey: ["salarySlip", employeeId, payroll_period],
    queryFn: () => generateSalarySlip(employeeId!, payroll_period),
    enabled: !!employeeId, // Only run if employeeId is available
  });
};