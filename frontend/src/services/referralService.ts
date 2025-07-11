import FrappeAPI from "../utils/frappeAPI"
import type { GetReferralStatusResponse, DesignationResponse } from "../types/referral"

export const referralService = {
  getReferralDetails: async (referralId: string): Promise<GetReferralStatusResponse> => {
    const result = await FrappeAPI.callMethod("recruitment.api.employee_referral.get_referral_status", {
      referral_id: referralId,
    }) as GetReferralStatusResponse;

    // ✅ Log the result for debugging
    console.log("✅ Referral Details Response:", result);

    return result;
  },

  // ✅ New method for fetching designations
  getDesignations: async (): Promise<DesignationResponse> => {
    try {
      console.log("Fetching designations list");

      const result = await FrappeAPI.getDocumentList("Designation", {
        fields: ["name"],
        limit: 1000
      }) as DesignationResponse;

      return result;
    } catch (error) {
      console.error("Failed to fetch designations:", error);
      throw error;
    }
  }
}
