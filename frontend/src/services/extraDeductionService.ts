import FrappeAPI from "../utils/frappeAPI";
import { ExtraDeductionResponse } from "../types/extraDeduction";

export const getExtraDeductionList = async (
  employee: string | null | undefined,
  company: string | null | undefined,
  payroll_period: string | null | undefined
) => {
  if (!employee || !company || !payroll_period) {
    return { data: [] };
  }
  
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.extra_payment_api.get_extra_deduction_list",
      {
        employee,
        company,
        payroll_period,
      }
    );
    // Returning just the data array for the hook
    const parsedResponse = response as ExtraDeductionResponse;
    return { data: parsedResponse.data || [] };
  } catch (error) {
    console.error("📡 Error while fetching extra deductions:", error);
    throw error;
  }
};
