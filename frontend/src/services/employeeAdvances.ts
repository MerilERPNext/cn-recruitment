import FrappeAPI from "../utils/frappeAPI";
import { ApiAdvance } from "../types/employeeAttendance";
import {
  CostCenterType,
  CurrencyType,
  ExpenseAdvance,
  ExpenseTableFieldSettings,
  ExpenseType,
  ExpenseTypeField,
  ProjectType,
} from "../types/expenseAdvance";

export const getAdvances = async (
  employeeId: string
): Promise<ApiAdvance[]> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.employee_advance.get_advance_dashboard",
    {
      employee: employeeId,
    }
  );
  return result as ApiAdvance[];
};

//for employee advance application creation api

export const getAllAdvancesTypes = async (): Promise<{
  data: [{ name: string }];
}> => {
  const res = await FrappeAPI.getDocumentList("Advance Type", {
    fields: ["name"],
    orderBy: "creation desc",
    filters: [["policy_based_type", "=", 1]],
  });
  return {
    data: res.data as [{ name: string }],
  };
};

export const getExpenseAdvanceList = async (
  employeeId: string
): Promise<ExpenseAdvance> => {
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
    orderBy: "creation desc",
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

export const getExpenseAdvanceDetails = async (
  advanceName: string
): Promise<any> => {
  if (!advanceName) throw new Error("Advance Name is required");

  // This Frappe call uses the standard resource endpoint to fetch a single document by its name.
  const res = (await FrappeAPI.getDocument("Employee Advance", advanceName)) as {
    data: Record<string, unknown>;
  };
  
  // The API response structure is { data: { ...document_fields... } }
  return res.data; 
};

export const getAdvancesAmount = async (
  employeeId: string,
  advanceType?: string,
  postingDate?: string,
  company?: string
): Promise<ApiAdvance> => {
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

export const getCurrencies = async (): Promise<{ data: CurrencyType[] }> => {
  const res = await FrappeAPI.getDocumentList("Currency", {
    fields: ["name", "symbol", "fraction", "fraction_units"],
    orderBy: "creation desc",
  });

  // Frappe returns { data: [...] }, so just cast properly
  return {
    data: res.data as CurrencyType[],
  };
};

export const getProjects = async (): Promise<{ data: ProjectType[] }> => {
  const res = await FrappeAPI.getDocumentList("Project", {
    fields: ["name", "project_name"],
    orderBy: "creation desc",
  });

  return {
    data: res.data as ProjectType[],
  };
};

export const getCostCenters = async (): Promise<{ data: CostCenterType[] }> => {
  const res = await FrappeAPI.getDocumentList("Cost Center", {
    fields: ["name", "cost_center_name", "company"],
    orderBy: "creation desc",
  });

  return {
    data: res.data as CostCenterType[],
  };
};

export const getExpenseTypes = async (): Promise<{ data: ExpenseType[] } | null> => {
  const res = await FrappeAPI.getDocumentList("Expense Claim Type", {
    fields: ["name"],
    orderBy: "creation desc",
  });

  return {
    data: res.data as ExpenseType[],
  };
}

export const getExpenseTypeFields = async (
  expenseType: string
): Promise<{ data: ExpenseTypeField[] } | null> => {
  if (!expenseType) return null;

  const result = await FrappeAPI.callMethod(
    "chatnext_expense_trips.expense_claim.get_expense_type_fields",
    {
      expense_type: expenseType,
    }
  );

  return result as { data: ExpenseTypeField[] } | null;
}

export const getExpenseTableFieldSettings = async (
  employeeId: string
): Promise<ExpenseTableFieldSettings> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod(
    "chatnext_expense_trips.employee_advance.get_expense_table_field_settings",
    {
      employee: employeeId,
    }
  );

  return result as ExpenseTableFieldSettings;
};
