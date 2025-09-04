
import CompanyLogo from "../types/companyLogo";
import FrappeAPI from "../utils/frappeAPI";

export const CompanyLogoService = {
  getCompanyLogo: async (): Promise<CompanyLogo[]> => { // ✅ fixed typo
    const response = await FrappeAPI.getDocumentList("Company", {
      fields: ["*"],
    });

    return response.data as CompanyLogo[];
  },
};