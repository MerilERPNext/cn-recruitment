import { useQuery } from "@tanstack/react-query";
import { getITDecalarationData, getTaxSheetData, PayrollPeriodsService } from "../services/taxSheetService";

export function useTaxSheetData(
employee_id: string | null, selectedPeriod: string | null) {
    return useQuery({
      queryKey: ["tax-sheet", employee_id, selectedPeriod],
      queryFn: () => getTaxSheetData(employee_id, selectedPeriod),
      enabled: !!employee_id && !!selectedPeriod,
      staleTime: 0, // 5 minutes
    });
  }

  export function useIncomeTaxSheetData() {
    return useQuery({
      queryKey: ["income-tax-sheet"],
      queryFn: getITDecalarationData,
    });
  }
  
  export function useTaxSheetPayrollPriodsData() {
    return useQuery({
      queryKey: ["tax-sheet-payroll-periods"],
      queryFn: PayrollPeriodsService.getPayrollPeriods,
    });
  }