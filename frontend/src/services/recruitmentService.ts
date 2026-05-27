import FrappeAPI from "../utils/frappeAPI";
import {
  CreateJobRequisitionPayload,
  CreateJobRequisitionResponse,
} from "../types/recruitment";

export const recruitmentService = {
  createJobRequisition: async (
    payload: CreateJobRequisitionPayload
  ): Promise<CreateJobRequisitionResponse> => {
    // Remove undefined / null / empty string values
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
    );

    // Ensure required arrays exist
    cleanedPayload.custom_position_details =
      payload.custom_position_details || [];

    cleanedPayload.custom_qualifications =
      payload.custom_qualifications || [];

    // Convert skills safely
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
};