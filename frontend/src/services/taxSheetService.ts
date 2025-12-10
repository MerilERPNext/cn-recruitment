import FrappeAPI from "../utils/frappeAPI";
import { PayrollData } from "./benifitService";

export const getTaxSheetData = async (
  empId: string | null | undefined,
) => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_annual_statement",
      {
        employee: empId,
        payroll_period: "25-26",
      }
    );
    return response as PayrollData;
  } catch (error) {
    console.error("📡 Error while getting claim benifit for", error);
    throw error;
  }
};