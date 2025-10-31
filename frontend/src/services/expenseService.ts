/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CalculateExpenseParams,
  CalculateExpenseResponse,
  ExpenseTypeFieldsResponse,
} from "../types/expenseAdvance";
import { FilterCondition } from "../types/frappe";
import { FrappeAPI } from "../utils/frappeAPI";

export interface PerMileageUnitRateResponse {
  message?: string | { label?: string; rate?: number; [k: string]: any };
  // other keys if any
}

export const expenseService = {
  getExpensesTypes: async (filters: FilterCondition[]): Promise<any> => {
    const response = await FrappeAPI.getDocumentList("Expense Claim Type", {
      fields: ["name"],
      filters,
    });
    return response.data;
  },
  getExpenseTravelPolicies: async (): Promise<any> => {
    const response = await FrappeAPI.getDocumentList("Expense Travel Policy", {
      fields: ["name"],
    });
    return response.data;
  },

  getDailyAllowancesVehicleTypes: async (): Promise<any> => {
    const response = await FrappeAPI.getDocumentList(
      "Daily Allowance Vehicle Category",
      {
        fields: ["name"],
      }
    );
    return response.data;
  },
  getExpensePolicies: async (employeeId: string): Promise<any> => {
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_list_of_policys",
      {
        employee: employeeId,
      }
    );

    return response;
  },

  getExpenseClaims: async (filters?: FilterCondition[]): Promise<any> => {
    const result = await FrappeAPI.getDocumentList("Expense Claim", {
      fields: [
        "employee_name",
        "creation",
        "total_claimed_amount",
        "approval_status",
        "status",
      ],
      filters,
      limit: 3,
    });
    return result.data as any;
  },

  postExpenseClaim: async (expenses_data: string) => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.create_expense_claims_by_category",
      { expenses_data }
    );
  },

  getExpenseTypeFields: async (
    expenseType: string
  ): Promise<ExpenseTypeFieldsResponse> => {
    if (!expenseType) throw new Error("expenseType is required");
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_expense_type_fields",
      { expense_type: expenseType }
    );
    return response as ExpenseTypeFieldsResponse;
  },

  calculateExpenseAmount: async (
    params: CalculateExpenseParams
  ): Promise<CalculateExpenseResponse> => {
    if (!params) throw new Error("params are required");
    const { expense_type, units, vehicle_type } = params;
    if (!expense_type) throw new Error("expense_type is required");
    if (units == null || Number.isNaN(Number(units)))
      throw new Error("units is required and must be a number");

    const payload: Record<string, unknown> = {
      expense_type,
      units,
    };

    if (
      vehicle_type !== undefined &&
      vehicle_type !== null &&
      vehicle_type !== ""
    ) {
      payload.vehicle_type = vehicle_type;
    }
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.calculate_expense_amount",
      payload
    );

    return response as CalculateExpenseResponse;
  },

  getUnitPrice: async (
    claimTypeDoc: string,
    vehicleType: string
  ): Promise<PerMileageUnitRateResponse> => {
    if (!claimTypeDoc) throw new Error("claimTypeDoc is required");
    if (!vehicleType) throw new Error("vehicleType is required");

    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_per_mileage_unit_rate",
      {
        claim_type_doc: claimTypeDoc,
        vehicle_type: vehicleType,
      }
    );

    return response as PerMileageUnitRateResponse;
  },
};
