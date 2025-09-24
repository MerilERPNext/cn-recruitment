/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterCondition } from "../types/frappe";
import { GenderResponse } from "../types/profile";
import FrappeAPI from "../utils/frappeAPI";

export const profileService = {
  getGenders: async (): Promise<GenderResponse> => {
    try {
      console.log("Fetching genders list");

      const result = (await FrappeAPI.getDocumentList("Gender", {
        fields: ["name"],
        limit: 1000,
      })) as GenderResponse;

      return result;
    } catch (error) {
      console.error("Failed to fetch genders:", error);
      throw error;
    }
  },
  getAllEmployeeFields: async (filters?: FilterCondition[]): Promise<any> => {
    const response = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.employee_hierarchy.get_meta",
      {
        fields: ["*"],
        filters: filters,
        orderBy: "creation desc",
      }
    );
    return response as any;
  },
};
