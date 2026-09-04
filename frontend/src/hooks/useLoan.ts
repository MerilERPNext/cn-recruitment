/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLoan } from "../services/loan";
import { Loan } from "../components/Compansation/Loan/Type/loan";
import {
  checkLoanAdminPermission,
  createLoanApplication,
  editLoanInstallment,
  getAllLoanProducts,
  holdLoanInstallment,
  updateLoanApplication,
} from "../services/loanService";
import {
  EditInstallmentPayload,
  HoldInstallmentPayload,
} from "../types/loan";
import FrappeAPI from "../utils/frappeAPI";

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
      queryClient.invalidateQueries({ queryKey: ["loan"] });
      queryClient.invalidateQueries({ queryKey: [  "loan-application-doc-data"] });
      queryClient.invalidateQueries({ queryKey: ["loan-application", variables.docname] });
      queryClient.invalidateQueries({ queryKey: ["loan-application-list"] });
    },
    onError: (error: any) => {
      console.error("Update failed:", error.response?.data || error.message);
    },
  });
};

export const useGetLoanApplicationDoc = (
  docname: string
) => {
  return useQuery({
    queryKey: ["loan-application-doc-data", docname],
    queryFn: () => FrappeAPI.getDocument("Loan Application", docname!),
    enabled: !!docname,
  });
};

/** Roles allowed to perform loan actions — fetched via check_admin_permission */
export const useLoanAdminPermission = (employee?: string) => {
  return useQuery({
    queryKey: ["loan-admin-permission", employee],
    queryFn: () => checkLoanAdminPermission(employee),
    placeholderData: [],
  });
};

/** Mutation to hold loan installment(s) */
export const useHoldLoanInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HoldInstallmentPayload) =>
      holdLoanInstallment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan"] });
      queryClient.invalidateQueries({ queryKey: ["loan-application-doc-data"] });
      queryClient.invalidateQueries({ queryKey: ["loan-application-list"] });
    },
  });
};

/** Mutation to edit loan installment repayment amount */
export const useEditLoanInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditInstallmentPayload) =>
      editLoanInstallment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan"] });
      queryClient.invalidateQueries({ queryKey: ["loan-application-doc-data"] });
      queryClient.invalidateQueries({ queryKey: ["loan-application-list"] });
    },
  });
};

