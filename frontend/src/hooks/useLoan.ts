import { useQuery } from "@tanstack/react-query";
import { getLoan } from "../services/loan";
import { Loan } from "../components/SalarySlip/Loan/Type/loan";

export const useLoan = (employeeId?: string) => {
  return useQuery<Loan[]>({
    queryKey: ["loan", employeeId],
    queryFn: () => getLoan(employeeId!),
    enabled: !!employeeId,
  });
};