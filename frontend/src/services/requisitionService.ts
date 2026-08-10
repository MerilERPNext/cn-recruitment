import FrappeAPI from "../utils/frappeAPI";
import type { RequisitionDetailsResponse, GetRequisitionParams } from "../types/requisition";

// Shown when the permission check itself could not be completed (network/server
// error, unexpected empty response) — deliberately worded as "couldn't check",
// not as a permission denial.
const UNVERIFIED_REASON =
  "Couldn't verify your permission to raise requisitions. Please check your connection and try again.";

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
  //
  // Fails CLOSED, matching the server's deny-by-default rule: raising is allowed
  // only on a positive answer, so an unverifiable check blocks rather than waves
  // the user through. The reason distinguishes "we couldn't check" from "you are
  // not permitted" — the callers surface `reason` verbatim, and telling someone
  // they lack permission when we simply failed to ask would be wrong.
  checkCanRaiseRequisition: async (): Promise<CanRaiseRequisitionResponse> => {
    try {
      const result = await FrappeAPI.callMethod(
        "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.check_can_raise_requisition"
      ) as CanRaiseRequisitionResponse;
      return result ?? { allowed: false, reason: UNVERIFIED_REASON, employee: null };
    } catch (error) {
      console.error("❌ checkCanRaiseRequisition failed:", error);
      return { allowed: false, reason: UNVERIFIED_REASON, employee: null };
    }
  },

};

export type CanRaiseRequisitionResponse = {
  allowed: boolean;
  reason: string;
  employee: string | null;
};
