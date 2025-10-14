import FrappeAPI from "../utils/frappeAPI";
import { ApiAdvance } from "../types/employeeAttendance";
import { ExpenseAdvance } from "../types/expenseAdvance";

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

export const getExpenseAdvanceList = async (employeeId: string): Promise<ExpenseAdvance> => {
  const res = await FrappeAPI.getDocumentList("Employee Advance", {
    fields: [
      "name",
      "employee_name",
      "posting_date",
      "company",
      "department",
      "advance_amount",
      "paid_amount",
      "pending_amount",
      "status",
    ],
    filters: [
      ["employee", "=", employeeId],
      ["custom_type", "in", ["Reimbursement / Expense Advance"]],
    ],
    orderBy: "posting_date desc",
  });
  return {
    data: res.data as {
      name: string;
      employee_name: string;
      posting_date: string;
      company: string;
      department: string;
      advance_amount: number;
      paid_amount: number;
      pending_amount: number;
      status: string;
    }[],
  };
};

export const getAdvancesAmount = async (
employeeId: string, advanceType?: string, postingDate?: string, company?: string,): Promise<ApiAdvance> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.employee_advance.get_advance_amount_checking",
    {
      employee: employeeId,
      advance_type: advanceType,
      posting_date: postingDate,
      company: company,
    }
  );

  return result as ApiAdvance;
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