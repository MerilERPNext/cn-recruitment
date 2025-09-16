import FrappeAPI from "../utils/frappeAPI";
import { ApiAdvance } from "../types/employeeAttendance";

export const getAdvances = async (employeeId: string): Promise<ApiAdvance[]> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.employee_advance.get_advance_dashboard", {
    employee: employeeId,
  });
  return result as ApiAdvance[];
};

//for employee advance application creation api

export const getAllAdvancesTypes = async (): Promise<{
  data: [{ name: string }];
}> => {
  const res = await FrappeAPI.getDocumentList("Advance Type", {
    fields: ["name"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as [{ name: string }],
  };
};

export const getAdvancesAmount = async (
  employeeId: string,
  advanceType?: string,
  postingDate?: string
): Promise<ApiAdvance[]> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.employee_advance.get_advance_amount_checking",
    {
      employee: employeeId,
      advance_type: advanceType,
      posting_date: postingDate,
    }
  );

  return result as ApiAdvance[];
};

export const createAdvance = async (
  body: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await FrappeAPI.createDocument("Employee Advance", body);
    return response as boolean;
  } catch (error) {
    console.error("📡 Error while Adding Loan Application in:", error);
    throw error;
  }
};