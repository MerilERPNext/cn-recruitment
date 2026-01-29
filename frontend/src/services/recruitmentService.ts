import FrappeAPI from "../utils/frappeAPI";
import { CreateJobRequisitionPayload, CreateJobRequisitionResponse } from "../types/recruitment";

export const recruitmentService = {
  createJobRequisition: async (
    payload: CreateJobRequisitionPayload
  ): Promise<CreateJobRequisitionResponse> => {
    return FrappeAPI.callMethod(
      "recruitment.api.job_requisition.create_job_requisition_api",
      { data: payload },
    ) as Promise<CreateJobRequisitionResponse>;
  },
};