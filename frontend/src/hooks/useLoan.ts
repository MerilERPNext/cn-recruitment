/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLoan } from "../services/loan";
import { Loan } from "../components/Compansation/Loan/Type/loan";
import {
  createLoanApplication,
  getAllLoanProducts,
  updateLoanApplication,
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

export interface LoanApplicationUpdatePayload {
  docname: string; // Loan Application ka name/id
  data: Record<string, any>; // update karne wala data
}



export const useLoanApplicationUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoanApplicationUpdatePayload) => updateLoanApplication(payload),
    onSuccess: (data, variables) => {
      console.log("Loan Application updated:", data);
      queryClient.invalidateQueries({ queryKey: ["loan-application", variables.docname] });
      queryClient.invalidateQueries({ queryKey: ["loan-application-list"] });
    },
    onError: (error: any) => {
      console.error("Update failed:", error.response?.data || error.message);
    },
  });
};
