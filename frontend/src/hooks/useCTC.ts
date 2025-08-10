import { useQuery } from "@tanstack/react-query";
import { generateSalarySlip } from "../services/ctcservice";

export const useGenerateSalarySlip = (employeeId?: string) => {
  return useQuery({
    queryKey: ["salarySlip", employeeId],
    queryFn: () => generateSalarySlip(employeeId!),
    enabled: !!employeeId, // Only run if employeeId is available
  });
};