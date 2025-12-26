import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLoan } from "../services/loan";
import { Loan } from "../components/Compansation/Loan/Type/loan";
import {
  createLoanApplication,
  getAllLoanProducts,
} from "../services/loanService";

export const useLoan = (employeeId?: string) => {
  return useQuery<Loan[]>({
    queryKey: ["loan", employeeId],
    queryFn: () => getLoan(employeeId!),
    enabled: !!employeeId,
  });
};

export const useLoanProducts = () => {
  return useQuery({
    queryKey: ["loan-products"],
    queryFn: getAllLoanProducts,
  });
};

export function useCreateNewLoanApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createLoanApplication(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["loan"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}
