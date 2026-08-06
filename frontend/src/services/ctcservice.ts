import FrappeAPI from "../utils/frappeAPI";
import { SalarySlip } from "../types/ctc";

interface FrappeApiResponse {
  status?: string;
  message?: string;
  data?: unknown[];
}

export const generateSalarySlip = async (employeeId: string, payroll_period?: string): Promise<SalarySlip> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_structure_assignment.generate_salary_slip", {
    employee: employeeId,
    payroll_period,
  }) as FrappeApiResponse;

  if (result?.status === "failed") {
    throw new Error(result?.message || "Failed to generate salary slip");
  }

  return (result?.data?.[0] as SalarySlip) || null;
};