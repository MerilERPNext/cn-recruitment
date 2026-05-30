import FrappeAPI from "../utils/frappeAPI";
import {
  CreateJobRequisitionPayload,
  CreateJobRequisitionResponse,
} from "../types/recruitment";
import { IJPField, IJPApplicationSubmitPayload, IJPApplicationSubmitResponse } from "../components/Recruitment/IJPTypes";

// Fields that Frappe manages via workflow — never send these from the client
const FRAPPE_MANAGED_FIELDS = ["status", "workflow_state"];

export const recruitmentService = {
  createJobRequisition: async (
    payload: CreateJobRequisitionPayload
  ): Promise<CreateJobRequisitionResponse> => {
    // Remove undefined / null / empty string values AND workflow-managed fields
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) =>
          !FRAPPE_MANAGED_FIELDS.includes(key) &&
          value !== undefined &&
          value !== null &&
          value !== ""
      )
    );

    // Ensure required arrays always exist (even after the filter above)
    cleanedPayload.custom_position_details =
      payload.custom_position_details || [];

    cleanedPayload.custom_qualifications =
      payload.custom_qualifications || [];

    // Skills: keep as plain string array — backend handles both string and {skill:...}
    cleanedPayload.custom_skills = Array.isArray(payload.custom_skills)
      ? payload.custom_skills.filter(Boolean)
      : [];

    cleanedPayload.custom_pre_screened_candidates =
      payload.custom_pre_screened_candidates || [];

    return FrappeAPI.callMethod(
      "recruitment.api.job_requisition.create_job_requisition",
      {
        payload: cleanedPayload,
      }
    ) as Promise<CreateJobRequisitionResponse>;
  },

  getIJPApplicationFields: async (opening: string): Promise<IJPField[]> => {
    const res = await FrappeAPI.callMethod(
      "recruitment.api.channels.ijp.get_application_fields",
      { opening }
    );
    return (res as IJPField[]) || [];
  },

  submitIJPApplication: async (
    opening: string,
    data: IJPApplicationSubmitPayload
  ): Promise<IJPApplicationSubmitResponse> => {
    return FrappeAPI.callMethod(
      "recruitment.api.channels.ijp.submit_application",
      {
        opening,
        data: JSON.stringify(data),
      }
    ) as Promise<IJPApplicationSubmitResponse>;
  },
};