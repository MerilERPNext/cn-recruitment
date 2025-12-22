/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../../utils/frappeAPI";

export const getPerquisite = async (
  employeeId?: string,
  company?: string,
  payroll_period?: string,
) => {
  const response = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.perquisite_payment.get_perquisite_payment_list", {
    employee: employeeId,
    company: company,
    payroll_period: payroll_period,
  }) as { status: string; data: any[] };

  return response.data;  
};