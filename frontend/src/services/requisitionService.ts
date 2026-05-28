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
  }
  
};
