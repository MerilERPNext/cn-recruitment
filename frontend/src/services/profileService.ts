import { GenderResponse } from "../types/profile";
import FrappeAPI from "../utils/frappeAPI"

export const profileService = {
  getGenders: async (): Promise<GenderResponse> => {
    try {
      console.log("Fetching genders list");

      const result = await FrappeAPI.getDocumentList("Gender", {
        fields: ["name"],
        limit: 1000
      }) as GenderResponse;

      return result;
    } catch (error) {
      console.error("Failed to fetch genders:", error);
      throw error;
    }
  }
}