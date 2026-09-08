import FrappeAPI from "../utils/frappeAPI";
import type { RequisitionDetailsResponse, GetRequisitionParams } from "../types/requisition";
import type { ApprovalAllocation } from "../types/recruitment";

// Shown when the permission check itself could not be completed (network/server
// error, unexpected empty response) — deliberately worded as "couldn't check",
// not as a permission denial.
const UNVERIFIED_REASON =
  "Couldn't verify your permission to raise requisitions. Please check your connection and try again.";

// Wait schedule for the approval-allocation poll below: five attempts spread
// over ~15s, widening as it goes so a slow queue is still caught without
// hammering the server in the common case (the allocation is usually there on
// the first or second attempt).
const APPROVAL_ALLOCATION_POLL_DELAYS_MS = [1000, 1500, 2500, 4000, 6000];

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

  // Approvers are allocated by a background job that finishes AFTER
  // create_job_requisition returns, so a list fetch made right after create can
  // legitimately come back with an empty `approval_allocation` — and that empty
  // row then sits in the cache until a manual reload. Poll the single new
  // requisition (name mode: one row, no `employee` needed) until the allocation
  // lands, and hand the approvers back so the caller can patch its cached row
  // in place rather than refetching the whole list. Bounded by
  // APPROVAL_ALLOCATION_POLL_DELAYS_MS; stops on the first hit, and returns []
  // if the allocation never appears (e.g. a requisition with no approval flow).
  waitForApprovalAllocation: async (
    requisitionName: string,
    delaysMs: number[] = APPROVAL_ALLOCATION_POLL_DELAYS_MS,
  ): Promise<ApprovalAllocation[]> => {
    for (const delay of delaysMs) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.get_job_requisition",
          { name: requisitionName },
        ) as { data?: { approval_allocation?: ApprovalAllocation[] } };

        const allocation = response?.data?.approval_allocation;
        if (allocation?.length) return allocation;
      } catch (error) {
        // A failed poll says nothing about the allocation itself — give up
        // quietly rather than retrying against an endpoint that just errored.
        console.error(`❌ Approval allocation poll failed for ${requisitionName}:`, error);
        return [];
      }
    }
    return [];
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
