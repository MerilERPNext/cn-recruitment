import type {
  ApprovalField,
  ApprovalStatus,
  ApiConfig,
  InitializeApprovalResponse,
} from "../types/onboarding";
import FrappeAPI from "../utils/frappeAPI";

// ─── Service Functions ─────────────────────────────────────────────

/**
 * Fetch all fields and their current approval status
 */
export async function fetchApprovalFields(
  config: ApiConfig
): Promise<ApprovalField[]> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.get_onboarding_fields_for_approval",
    {
      onboarding_name: config.onboardingName,
    }
  );

  const data = (res as InitializeApprovalResponse)?.data;

  if (!Array.isArray(data)) {
    throw new Error("Invalid response: expected data array.");
  }

  return data;
}

/**
 * Update single field approval
 */
export async function updateFieldApprovalStatus(
  config: ApiConfig,
  fieldname: string,
  newStatus: ApprovalStatus
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.update_field_approval_status",
    {
      onboarding_name: config.onboardingName,
      fieldname,
      new_status: newStatus,
    }
  );
}

/**
 * Update section approval
 */
export async function updateSectionApprovalStatus(
  config: ApiConfig,
  sectionName: string,
  newStatus: ApprovalStatus
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.update_section_approval_status",
    {
      onboarding_name: config.onboardingName,
      section_name: sectionName,
      new_status: newStatus,
    }
  );
}

/**
 * Bulk update approval
 */
export async function bulkUpdateApprovalStatus(
  config: ApiConfig,
  newStatus: ApprovalStatus
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.bulk_update_approval_status",
    {
      onboarding_name: config.onboardingName,
      new_status: newStatus,
    }
  );
}