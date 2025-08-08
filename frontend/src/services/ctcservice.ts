import FrappeAPI from "../utils/frappeAPI";
import { SalarySlip } from "../types/ctc";

export const generateSalarySlip = async (employeeId: string): Promise<SalarySlip> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod("recruitment.payroll_api.generate_salary_slip", {
    employee: employeeId,
  });

  console.log(result, "This is my Salary Result");

  return result as SalarySlip;
};