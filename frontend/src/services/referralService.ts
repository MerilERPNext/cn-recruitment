import FrappeAPI from "../utils/frappeAPI"
import type { GetReferralStatusResponse, DesignationResponse } from "../types/referral"

export const referralService = {
  getReferralDetails: async (referralId: string): Promise<GetReferralStatusResponse> => {
    return FrappeAPI.callMethod("recruitment.api.employee_referral.get_referral_status", {
      referral_id: referralId,
    })
  },


  // ✅ New method for fetching designations
  getDesignations: async (): Promise<DesignationResponse> => {
    try {
      console.log("Fetching designations list")
      // Use the resource API endpoint for fetching list of documents
      const result = await FrappeAPI.getDocumentList("Designation", {
        fields: ["name"],
        limit:1000
      })
      return result
    } catch (error) {
      console.error("Failed to fetch designations:", error)
      throw error
    }
  }
}