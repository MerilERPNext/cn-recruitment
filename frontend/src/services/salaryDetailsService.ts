import FrappeAPI from "../utils/frappeAPI";
import type { SalaryComponent, SalarySlipDetail } from "../types/salary";

export const SalarySlipDetails = {
  getSalarySlipDetails: async ({
    name,
  }: SalaryComponent): Promise<SalarySlipDetail> => {
    try {
      const result = await FrappeAPI.getDocument("Salary Slip", name);

      if (!result) {
        throw new Error("Salary Slip data not found");
      }

      console.log(`✅ Salary Slip response:`, result);

      return result as SalarySlipDetail;
    } catch (error) {
      console.error(`❌ Failed to fetch salary slip for ID ${name}:`, error);
      throw error;
    }
  },
};

export const downloadSalarySlipPDF = async (salarySlipName: string) => {
  const formatName = encodeURIComponent("Salary Slip"); // Print Format ka exact name

  const response = await fetch(
    `/api/method/frappe.utils.print_format.download_pdf?doctype=Salary%20Slip&name=${salarySlipName}&format=${formatName}&no_letterhead=0`,
    {
      method: "GET",
      headers: {
        Accept: "application/pdf",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch PDF");
  }

  return response.blob();
};


