import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { requisitionService } from "../services/requisitionService"
import { PermissionError } from "../types/frappe"
import type { RequisitionDetailsResponse, GetRequisitionParams } from "../types/requisition"

// Utility to check if error is permission-related
const isPermissionError = (error: unknown): error is PermissionError => {
  if (error instanceof PermissionError) {
    return true
  }
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    )
  }
  return false
}

// Default retry function that doesn't retry permission errors
const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) {
    return false
  }
  return failureCount < 3
}

// Hook for fetching requisition details
export const useRequisitionDetails = (
  params: GetRequisitionParams,
  options?: Omit<UseQueryOptions<RequisitionDetailsResponse>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["requisition-details", params.requisition_name],
    queryFn: () => requisitionService.getRequisitionDetails(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!params.requisition_name, // Only run query if requisition_name exists
    ...options,
  })
}

// Export utility function
export { isPermissionError }
