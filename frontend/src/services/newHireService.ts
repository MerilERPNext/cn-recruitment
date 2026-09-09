import FrappeAPI from "../utils/frappeAPI";
import type {
  NewHireFormConfigResponse,
  CreateNewHireResponse,
  NewHireListResponse,
  NewHireDetailResponse,
  UpdateNewHireResponse,
  InitiateOnboardingResponse,
  ActivateEmployeeResponse,
} from "../types/newHire";

export interface GetNewHireFormConfigParams {
  form?: string;
  name?: string;
  company?: string;
  employment_type?: string;
}

export interface GetNewHiresListParams {
  filters?: Record<string, unknown> | string;
  search?: string;
  start?: number;
  page_length?: number;
  order_by?: string;
}

/**
 * Fetch New Hire dynamic intake form configuration.
 */
export async function getNewHireFormConfig(
  params?: GetNewHireFormConfigParams
): Promise<NewHireFormConfigResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.get_new_hire_form_config",
    (params as Record<string, unknown>) || {}
  );
  return res as NewHireFormConfigResponse;
}

/**
 * Create a new hire record as a pending Employee.
 */
export async function createNewHire(
  payload: Record<string, unknown>,
  form?: string,
  submit: number = 1
): Promise<CreateNewHireResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.create_new_hire",
    {
      payload,
      ...(form ? { form } : {}),
      submit,
    }
  );
  return res as CreateNewHireResponse;
}

/**
 * Fetch paginated list of pending new hires.
 */
export async function getNewHiresList(
  params?: GetNewHiresListParams
): Promise<NewHireListResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.get_new_hire",
    (params as Record<string, unknown>) || {}
  );
  return res as NewHireListResponse;
}

/**
 * Fetch single pending new hire by name (e.g. PEND-00001).
 */
export async function getNewHireDetail(
  name: string
): Promise<NewHireDetailResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.get_new_hire",
    { name }
  );
  return res as NewHireDetailResponse;
}

/**
 * Update a pending Employee that has not gone for approval yet (Draft or Rejected).
 */
export async function updateNewHire(
  name: string,
  payload: Record<string, unknown>,
  submit: number = 0
): Promise<UpdateNewHireResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.update_new_hire",
    {
      name,
      payload,
      submit,
    }
  );
  return res as UpdateNewHireResponse;
}

/**
 * Hand an approved pending Employee to the existing onboarding process.
 */
export async function initiateOnboarding(
  name: string
): Promise<InitiateOnboardingResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.initiate_onboarding",
    { name }
  );
  return res as InitiateOnboardingResponse;
}

/**
 * Activate a pending Employee into an Active Employee code (renames PEND- into real employee series).
 */
export async function activateEmployee(
  name: string
): Promise<ActivateEmployeeResponse> {
  const res = await FrappeAPI.callMethod(
    "recruitment.api.new_hire.activate_employee",
    { name }
  );
  return res as ActivateEmployeeResponse;
}
