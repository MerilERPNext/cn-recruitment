import FrappeAPI from "../utils/frappeAPI";
import { PayrollData } from "./benifitService";

export const getExtraPayments = async (
  empId: string | null | undefined,
  company : string | null
) => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.extra_payment_api.get_extra_payment_list",
      {
        employee: empId,
        company: company,
      }
    );
    return response as PayrollData;
  } catch (error) {
    console.error("📡 Error while getting claim benifit for", error);
    throw error;
  }
};