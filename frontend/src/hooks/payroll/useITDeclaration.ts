/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery } from "@tanstack/react-query";
import { getCompareTaxSheetHTML, getITDecalarationData, getNewRegime, upDateITDeclarationSheet } from "../../services/payrollApi/itDeclarationService";


export function useNewRegime(employee: string | null, company: string | null, payroll_period: string | null) {
    return useQuery({
      queryKey: ["new-regime", employee, company, payroll_period],
      queryFn: () => getNewRegime(employee, company, payroll_period),
    });
  }

export function useITDeclarationTabData(goHeadValue: boolean, employee: string | null, company: string | null, payroll_period: string | null) {
    return useQuery({
      queryKey: ["income-tax-sheet", goHeadValue, employee, company, payroll_period],
      queryFn:() => getITDecalarationData(goHeadValue, employee, company, payroll_period),
    staleTime: 0,
    refetchOnWindowFocus: false,
    });
  }

  export const useSubmitITDeclaration = () => {
    return useMutation({
      mutationFn: (payload: any) => upDateITDeclarationSheet.submitITDeclaration(payload),
    });
  };


  export const useCompareTaxSheetViewPDF = (
    options: { onSuccess?: (data: any) => void } = {}
  ) => {
    return useMutation({
      mutationFn: async (declarationId: string) => {
        const html = await getCompareTaxSheetHTML(declarationId);
        return { response: html };
      },
      onSuccess: options.onSuccess,
    });
  };
  