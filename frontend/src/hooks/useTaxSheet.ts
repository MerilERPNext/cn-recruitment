import { useMutation, useQuery } from "@tanstack/react-query";
import { getIncomeTaxComputationData, getTaxSheetData, getTaxSheetHTML, PayrollPeriodsService } from "../services/taxSheetService";
import { useCurrentUser, isPayrollAdminUser } from "./useCurrentUser";
import { useTargetUser } from "../context/ViewedUserContext";
import FrappeAPI from "../utils/frappeAPI";

export function useTaxSheetData(
  employee_id: string | null, company: string | null, selectedPeriod: string | null) {
  return useQuery({
    queryKey: ["tax-sheet", employee_id, selectedPeriod, company],
    queryFn: () => getTaxSheetData(employee_id, company, selectedPeriod),
    enabled: !!employee_id && !!company && !!selectedPeriod,
    staleTime: 0, // 5 minutes
  });
}



export function useTaxSheetPayrollPriodsData(company: string | null) {
  // Company scoping for the Payroll Period filter (Compensation module):
  //  - Switch-user (viewing another employee) -> the TARGET user's company.
  //  - Otherwise: Payroll Admin -> no company (all companies); everyone else
  //    -> their own company.
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const payrollAdmin = isPayrollAdminUser(currentUser ?? null);

  const { targetEmployeeId } = useTargetUser();
  // Resolve the switched-to (target) employee's company so the Payroll Period
  // payload carries the TARGET user's company, not the logged-in user's.
  const { data: targetCompanyResolved } = useQuery({
    queryKey: ["target-employee-company", targetEmployeeId],
    queryFn: async () => {
      const res = await FrappeAPI.getDocumentList("Employee", {
        fields: ["name", "company"],
        filters: [["name", "=", targetEmployeeId as string]],
        limit: 1,
      });
      return (
        (res.data?.[0] as { company?: string } | undefined)?.company ?? null
      );
    },
    enabled: !!targetEmployeeId,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveCompany = targetEmployeeId
    ? targetCompanyResolved ?? null
    : payrollAdmin
      ? null
      : company;

  return useQuery({
    queryKey: [
      "tax-sheet-payroll-periods",
      effectiveCompany,
      payrollAdmin,
      targetEmployeeId,
    ],
    queryFn: () => PayrollPeriodsService.getPayrollPeriods(effectiveCompany),
    // Wait until roles are known, and (when switching user) until the target's
    // company has resolved, so the payload is always correct.
    enabled:
      !isUserLoading &&
      (!targetEmployeeId || targetCompanyResolved !== undefined),
  });
}

export function useIncomeTaxComputationData(
  employee_id: string | null, selectedPeriod: string | null, company: string | null) {
  return useQuery({
    queryKey: ["tax-sheet", employee_id, company, selectedPeriod,],
    queryFn: () => getIncomeTaxComputationData(employee_id, company, selectedPeriod,),
    enabled: !!employee_id && !!company && !!selectedPeriod,
    staleTime: 0, // 5 minutes
  });
}


export const useTDSPRintViewPDF = (
  payroll_period: string,
  company: string
) => {
  return useMutation({
    mutationFn: async (employee: string) => {
      const html = await getTaxSheetHTML(employee, payroll_period, company);
      return { response: html };
    },
    ...Option,
  });
};
