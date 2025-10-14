/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query"
import {
  getBenefitPayslipHTML,
  getTDSPayslipHTML,
  getSalarySlipHTML,
  getOffCyclePayslipHTML,
} from "../services/salaryDetailsService"
import { PermissionError } from "../types/interview"

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
