import type {
  ApprovalField,
  ApprovalStatus,
  InitializeApprovalResponse,
} from "../types/onboarding";
import FrappeAPI from "../utils/frappeAPI";

// ─── Service Functions ─────────────────────────────────────────────

/**
 * Fetch all fields and their current approval status.
 * Base URL is resolved automatically by FrappeAPI (via VITE_API_BASE_URL or window.location.origin).
 */
export async function fetchApprovalFields(
  onboardingName: string
): Promise<ApprovalField[]> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.get_onboarding_fields_for_approval",
    { onboarding_name: onboardingName }
  );

  const data = (res as InitializeApprovalResponse)?.data;

  if (!Array.isArray(data)) {
    throw new Error("Invalid response: expected data array.");
  }

  return data;
}

/**
 * Update single field approval status.
 * Comment is only sent when provided (mandatory for Reject).
 */
export async function updateFieldApprovalStatus(
  onboardingName: string,
  fieldname: string,
  newStatus: ApprovalStatus,
  comment?: string
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.update_field_approval_status",
    {
      onboarding_name: onboardingName,
      fieldname,
      new_status: newStatus,
      ...(comment ? { comment } : {}),
    }
  );
}

/**
 * Update all fields in a section.
 * Comment is only sent when provided (mandatory for Reject).
 */
export async function updateSectionApprovalStatus(
  onboardingName: string,
  sectionName: string,
  newStatus: ApprovalStatus,
  comment?: string
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.update_section_approval_status",
    {
      onboarding_name: onboardingName,
      section_name: sectionName,
      new_status: newStatus,
      ...(comment ? { comment } : {}),
    }
  );
}

/**
 * Bulk approve all pending fields across the entire document.
 */
export async function bulkUpdateApprovalStatus(
  onboardingName: string,
  newStatus: ApprovalStatus
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.bulk_update_approval_status",
    {
      onboarding_name: onboardingName,
      new_status: newStatus,
    }
  );
}

/**
 * Update a specific selection of fields in one API call.
 * Payload: { onboarding_name, fields: string[], new_status, comment? }
 * Comment is only sent when provided (mandatory for Reject).
 */
export async function updateSelectedFieldsApprovalStatus(
  onboardingName: string,
  fields: string[],
  newStatus: ApprovalStatus,
  comment?: string
): Promise<void> {
  await FrappeAPI.callMethod(
    "recruitment.api.field_level_approval.update_selected_fields_approval_status",
    {
      onboarding_name: onboardingName,
      fields,
      new_status: newStatus,
      ...(comment ? { comment } : {}),
    }
  );
}

/**
 * Send back to candidate (email trigger) — notify candidate of rejected fields.
 * Returns: { status, rejected_count, comments, enable_onboarding_review_actions }
 */
export async function sendBackToCandidate(
  onboardingName: string
): Promise<{
  status: string;
  rejected_count?: number;
  comments?: string[];
  enable_onboarding_review_actions?: number;
}> {
  const res = await FrappeAPI.callMethod(
    "homefirst_customs.api.onboarding_automation.send_back_to_candidate",
    { onboarding_name: onboardingName }
  );
  return res as {
    status: string;
    rejected_count?: number;
    comments?: string[];
    enable_onboarding_review_actions?: number;
  };
}

/**
 * Approve the whole onboarding form (email trigger).
 * Returns: { status, enable_onboarding_review_actions }
 */
export async function approveOnboardingForm(
  onboardingName: string
): Promise<{ status: string; enable_onboarding_review_actions?: number }> {
  const res = await FrappeAPI.callMethod(
    "homefirst_customs.api.onboarding_automation.approve_onboarding_form",
    { onboarding_name: onboardingName }
  );
  return res as { status: string; enable_onboarding_review_actions?: number };
}

/**
 * Whether the onboarding review actions (Send Back / Approve form) are enabled.
 * Driven by the global "Onboarding Settings" → enable_onboarding_review_actions flag.
 */
export async function getOnboardingReviewActionsEnabled(): Promise<boolean> {
  const res = await FrappeAPI.callMethod("frappe.client.get_single_value", {
    doctype: "Onboarding Settings",
    field: "enable_onboarding_review_actions",
  });
  return Number(res) === 1;
}