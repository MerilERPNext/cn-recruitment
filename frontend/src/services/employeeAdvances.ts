import FrappeAPI from "../utils/frappeAPI";
import { ApiAdvance } from "../types/employeeAttendance";

export const getAdvances = async (employeeId: string): Promise<ApiAdvance[]> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.employee_advance.get_advance_dashboard", {
    employee: employeeId,
  });
  return result as ApiAdvance[];
};

