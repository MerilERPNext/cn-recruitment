import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { referralService } from "../services/referralService"
import type { GetReferralStatusResponse, DesignationResponse } from "../types/referral"

// ✅ Utility function inside same file
export const isPermissionError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    )
  }
  return false
}

export const useReferralDetails = (
  referralId: string,
  options?: Omit<UseQueryOptions<GetReferralStatusResponse>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["referral-details", referralId],
    queryFn: () => referralService.getReferralDetails(referralId),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => !isPermissionError(error) && failureCount < 3,
    ...options,
  })
}


export const useDesignations = (
  options?: Omit<UseQueryOptions<DesignationResponse>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["designations"],
    queryFn: () => referralService.getDesignations(),
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => !isPermissionError(error) && failureCount < 3,
    ...options,
  })
}

export const useReferralListColumns = () => {
  return useQuery({
    queryKey: ["referral-list-columns"],
    queryFn: () => referralService.getReferralListColumns(),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => !isPermissionError(error) && failureCount < 3,
  })
}
