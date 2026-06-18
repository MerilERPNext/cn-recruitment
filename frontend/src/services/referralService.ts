import FrappeAPI from "../utils/frappeAPI"
import type { GetReferralStatusResponse, DesignationResponse, ReferralListColumn } from "../types/referral"

const normalizeReferralColumns = (result: unknown): ReferralListColumn[] => {
  if (Array.isArray(result)) return result as ReferralListColumn[]

  if (result && typeof result === "object") {
    const response = result as {
      message?: unknown
      columns?: unknown
      data?: unknown
    }

    if (Array.isArray(response.message)) return response.message as ReferralListColumn[]
    if (Array.isArray(response.columns)) return response.columns as ReferralListColumn[]
    if (Array.isArray(response.data)) return response.data as ReferralListColumn[]
  }

  return []
}

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
  },

  getReferralListColumns: async (): Promise<ReferralListColumn[]> => {
    const result = await FrappeAPI.callMethod(
      "recruitment.api.channels.refer.list_columns"
    )

    return normalizeReferralColumns(result)
  },
}
