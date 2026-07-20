import FrappeAPI from "../utils/frappeAPI";
import type {
  FlowRequestItem,
  FunnelActivityLogResponse,
} from "../types/flows";
import type { EmployeeOnboardingDetailResponse } from "../types/onboarding";

// ─── Onboarding Funnel Activity Details ────────────────────────────────────────

type OnboardingFunnelDetailsResponse = {
  data: FlowRequestItem[];
  total: number;
  page: number;
  limit: number;
};

/**
 * Fetch funnel activity details for Employee Onboarding.
 * API: cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details
 */
export const getOnboardingFunnelActivityDetails =
  async (): Promise<OnboardingFunnelDetailsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details",
      { doctype: "Employee Onboarding" }
    );

    return response as OnboardingFunnelDetailsResponse;
  };

// ─── Onboarding Funnel Activity Log ────────────────────────────────────────────

/**
 * Fetch funnel activity log for a specific funnel_activity_id.
 * API: cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_log
 */
export const getOnboardingFunnelActivityLog = async (
  funnel_activity_id: string
): Promise<FunnelActivityLogResponse> => {
  const response = await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_log",
    { funnel_activity_id }
  );

  return response as FunnelActivityLogResponse;
};

export const getEmployeeOnboardingDetail = async (
  name: string
): Promise<EmployeeOnboardingDetailResponse> => {
  const response = await FrappeAPI.callMethod(
    "recruitment.api.employee_onboarding.get_employee_onboarding_detail",
    { name }
  );
  return response as EmployeeOnboardingDetailResponse;
};
