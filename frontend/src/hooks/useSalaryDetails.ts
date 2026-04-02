
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery } from "@tanstack/react-query"

import { PermissionError } from "../types/interview"
import { 
        getTDSPayslipHTML,
        getBenefitPayslipHTML,
        getOffCyclePayslipHTML,
        getSalarySlipHTML,
        PrintFormatMenuOptionsService,
        getSalarySlipName,
        updateSalarySlip
     } from "../services/salaryDetailsService"

const isPermissionError = (error: unknown): error is PermissionError => {
  if (error instanceof PermissionError) return true
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    )
  }
  return false
}

export const useTDSPRintViewPDF = (options: { onSuccess?: (data: any) => void } = {}) => {
  return useMutation({
    mutationFn: async (salarySlipName: string) => {
      const html = await getTDSPayslipHTML(salarySlipName)
      return { response: html }
    },
    ...options,
  })
}

export const useBenefitClaimPDF = (options: { onSuccess?: (data: any) => void } = {}) => {
  return useMutation({
    mutationFn: async (salarySlipName: string) => {
      const html = await getBenefitPayslipHTML(salarySlipName)
      return { response: html }
    },
    ...options,
  })
}

export const useOffCyclePaySlipPDF = (options: { onSuccess?: (data: any) => void } = {}) => {
  return useMutation({
    mutationFn: async (salarySlipName: string) => {
      const html = await getOffCyclePayslipHTML(salarySlipName)
      return { response: html }
    },
    ...options,
  })
}

export const useDownloadSalarySlipPDF = (options: { onSuccess?: (data: any) => void } = {}) => {
  return useMutation({
    mutationFn: async (salarySlipName: string) => {
      const html = await getSalarySlipHTML(salarySlipName)
      return { response: html }
    },
    ...options,
  })
}

export { isPermissionError }

export const usePrintFormatMenuOptions = (employee_name: string, name: string) => {
  return useQuery({
    queryKey: ["print-format-menu-options", name, employee_name],
    queryFn: () => PrintFormatMenuOptionsService(employee_name, name),
    placeholderData: [], // prevents undefined
  });
};

export const useSalarySlipName = () => {
  return useQuery({
    queryKey: ["salary-slip-name"],
    queryFn: () => getSalarySlipName(),
  });
};


// hooks/useUpdateSalarySlip.ts


export const useUpdateSalarySlip = () => {
  return useMutation({
    mutationFn: ({
      salarySlipName,
      fileUrl,
    }: {
      salarySlipName: string;
      fileUrl: string;
    }) => updateSalarySlip(salarySlipName, fileUrl),
  });
};
