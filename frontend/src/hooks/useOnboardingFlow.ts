import { useQuery } from "@tanstack/react-query";
import type { FlowRequestItem, FunnelActivityLogResponse } from "../types/flows";
import {
  getOnboardingFunnelActivityDetails,
  getOnboardingFunnelActivityLog,
  getEmployeeOnboardingDetail,
} from "../services/onboardingFlowService";

// ─── Onboarding Funnel Activity Details ────────────────────────────────────────

type OnboardingFunnelDetailsResponse = {
  data: FlowRequestItem[];
  total: number;
  page: number;
  limit: number;
};

/**
 * Hook to fetch Employee Onboarding funnel activity details.
 * Returns the full response including data array, total, page, limit.
 */
export const useOnboardingFunnelActivityDetails = () => {
  return useQuery<OnboardingFunnelDetailsResponse>({
    queryKey: ["onboarding-funnel-activity-details"],
    queryFn: getOnboardingFunnelActivityDetails,
  });
};

// ─── Onboarding Funnel Activity Log ────────────────────────────────────────────

/**
 * Hook to fetch funnel activity log for a specific onboarding activity.
 * Only fetches when funnel_activity_id is provided and modal is open (enabled).
 */
export const useOnboardingFunnelActivityLog = (
  funnel_activity_id: string,
  enabled = true
) => {
  return useQuery<FunnelActivityLogResponse>({
    queryKey: ["onboarding-funnel-activity-log", funnel_activity_id],
    queryFn: () => getOnboardingFunnelActivityLog(funnel_activity_id),
    enabled: !!funnel_activity_id && enabled,
  });
};

/**
 * Hook to fetch Employee Onboarding detail.
 */
export const useEmployeeOnboardingDetail = (name: string | null) => {
  return useQuery({
    queryKey: ["employee-onboarding-detail", name],
    queryFn: () => getEmployeeOnboardingDetail(name as string),
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
  });
};
