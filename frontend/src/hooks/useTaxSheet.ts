import { useMutation, useQuery } from "@tanstack/react-query";
import { getIncomeTaxComputationData, getTaxSheetData, getTaxSheetHTML, PayrollPeriodsService } from "../services/taxSheetService";

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
    return useQuery({
      queryKey: ["tax-sheet-payroll-periods", company],
      queryFn: () => PayrollPeriodsService.getPayrollPeriods(company),
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
      