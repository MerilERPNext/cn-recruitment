import FrappeAPI from "../utils/frappeAPI";
import { PayrollData } from "./benifitService";

export const getTaxSheetData = async (
  empId: string | null | undefined, selectedPeriod: string | null | undefined
) => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_annual_statement",
      {
        employee: empId,
        payroll_period: selectedPeriod,
      }
    );
    return response as PayrollData;
  } catch (error) {
    console.error("📡 Error while getting claim benifit for", error);
    throw error;
  }
};


  

export const getITDecalarationData = async () => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.tds_declaration_form"
  );

  console.log("FULL API RESPONSE 👉", response);

  return response;
};

export const PayrollPeriodsService = {
  getPayrollPeriods: async () => {
    const response = await FrappeAPI.getDocumentList("Payroll Period", {
      fields: ["name"],
      orderBy: "creation desc",
    });

    return response.data;
  },
};
