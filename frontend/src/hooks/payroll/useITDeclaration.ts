/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery } from "@tanstack/react-query";
import { getCompareTaxSheetHTML, getForm12B, getITDecalarationData, getLTABrakup, getNewRegime, getPerviewOfITDeclaration, getProofDateForITDeclaration, upDateITDeclarationSheet } from "../../services/payrollApi/itDeclarationService";


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

  export const useForm12B = (
    options: { onSuccess?: (data: any) => void } = {}
  ) => {
    return useMutation({
      mutationFn: async ({ declarationId, docName }: { declarationId: string; docName: string }) => {
        const html = await getForm12B(declarationId, docName);
        return { response: html };
      },
      onSuccess: options.onSuccess,
    });
  };

  export const usePreviewOfITDeclaration = (
    options: { onSuccess?: (data: any) => void } = {}
  ) => {
    return useMutation({
      mutationFn: async ({ declarationId }: { declarationId: string; }) => {
        const html = await getPerviewOfITDeclaration(declarationId);
        return { response: html };
      },
      onSuccess: options.onSuccess,
    });
  };
  
  export function useProofDateForITDeclaration(currentDate: string, employee: string | null, declarationDoctype: string | null, payroll_period: string | null) {
    return useQuery({
      queryKey: ["income-tax-sheet", currentDate, employee, declarationDoctype, payroll_period],
      queryFn:() => getProofDateForITDeclaration(currentDate, employee, declarationDoctype, payroll_period),
    staleTime: 0,
    refetchOnWindowFocus: false,
    });
  }


  export function useLTABrakup(employee: string | null,) {
    return useQuery({
      queryKey: ["lta-breakup", employee],
      queryFn:() => getLTABrakup(employee),
    staleTime: 0,
    refetchOnWindowFocus: false,
    });
  }