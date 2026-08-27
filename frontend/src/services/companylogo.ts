
import CompanyLogo from "../types/companyLogo";
import FrappeAPI from "../utils/frappeAPI";

export const CompanyLogoService = {
  getCompanyLogo: async (): Promise<CompanyLogo[]> => { // ✅ fixed typo
    const response = await FrappeAPI.getDocumentList("Company", {
      fields: ["company_logo", "company_name", "name"],
    });

    return response.data as CompanyLogo[];
  },

  getSingleCompanyLogo: async (
    companyName: string
  ): Promise<CompanyLogo> => {
    const response = await FrappeAPI.getDocument(
      "Company",
      companyName,
    );

    return response as CompanyLogo;
  },
};