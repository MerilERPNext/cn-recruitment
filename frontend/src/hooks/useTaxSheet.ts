import { useMutation, useQuery } from "@tanstack/react-query";
import { getIncomeTaxComputationData, getTaxSheetData, getTaxSheetHTML, PayrollPeriodsService } from "../services/taxSheetService";
import { useCurrentUser, isPayrollAdminUser } from "./useCurrentUser";

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
    // Role-based scoping (Compensation module): a Payroll Admin sees Payroll
    // Periods for all companies (no company filter), while every other user is
    // scoped to their own company. Based on the logged-in user's roles, so it
    // stays consistent when viewing another employee via switch-user.
    const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
    const payrollAdmin = isPayrollAdminUser(currentUser ?? null);
    const effectiveCompany = payrollAdmin ? null : company;

    return useQuery({
      queryKey: ["tax-sheet-payroll-periods", effectiveCompany, payrollAdmin],
      queryFn: () => PayrollPeriodsService.getPayrollPeriods(effectiveCompany),
      // Wait until the user's roles are known so the payload is always correct.
      enabled: !isUserLoading,
    });
  }

  export function useIncomeTaxComputationData(
    employee_id: string | null, selectedPeriod: string | null, company: string | null) {
        return useQuery({
          queryKey: ["tax-sheet", employee_id, company, selectedPeriod,],
          queryFn: () => getIncomeTaxComputationData(employee_id,company, selectedPeriod,),
          enabled: !!employee_id && !!company && !!selectedPeriod ,
          staleTime: 0, // 5 minutes
        });
      }

  
      export const useTDSPRintViewPDF = (
        payroll_period: string,
        company: string
      ) => {
        return useMutation({
          mutationFn: async (employee: string) => {
            const html = await getTaxSheetHTML( employee, payroll_period, company);
            return { response: html };
          },
          ...Option,
        });
      };
      