import FrappeAPI from "../utils/frappeAPI";
import type { RequisitionDetailsResponse, GetRequisitionParams } from "../types/requisition";

export const requisitionService = {
  // Fetch requisition details
  getRequisitionDetails: async ({ requisition_name }: GetRequisitionParams): Promise<RequisitionDetailsResponse> => {
    try {
      console.log(`🎯 Fetching requisition details for: ${requisition_name}`)
  
      const result = await FrappeAPI.callMethod("recruitment.api.job_requisition.get_job_requisition_details", {requisition_name}) as RequisitionDetailsResponse;
  
      console.log(`✅ Requisition details:`, result)
  
      return result
     } catch (error) {
      console.error(`❌ Failed to fetch requisition details for ${requisition_name}:`, error)
      throw error
    }
  },

  // Gate check: whether the current user may raise a requisition, per the
  // "Raise Requisition Scope" configuration. Called BEFORE opening the form so
  // a non-permitted user gets a clean message on click instead of at submit.
  checkCanRaiseRequisition: async (): Promise<CanRaiseRequisitionResponse> => {
    try {
      const result = await FrappeAPI.callMethod(
        "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.check_can_raise_requisition"
      ) as CanRaiseRequisitionResponse;
      return result ?? { allowed: true, reason: "", employee: null };
    } catch (error) {
      console.error("❌ checkCanRaiseRequisition failed:", error);
      // Fail open: the server-side before_insert hook remains the authoritative
      // block, so a transient check failure must not wrongly lock users out.
      return { allowed: true, reason: "", employee: null };
    }
  },

};

export type CanRaiseRequisitionResponse = {
  allowed: boolean;
  reason: string;
  employee: string | null;
};
