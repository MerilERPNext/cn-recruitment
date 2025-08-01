/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterCondition } from "../types/frappe";
import { FrappeAPI } from "../utils/frappeAPI";

export const expenseService = {
    getExpensesTypes: async (filters: FilterCondition[]): Promise<any> => {
        const response = await FrappeAPI.getDocumentList('Expense Claim Type', {
            fields: ['name'],
            filters
        });
        return response.data;
    },
    getExpenseTravelPolicies: async (): Promise<any> => {
        const response = await FrappeAPI.getDocumentList('Expense Travel Policy', {
            fields: ['name'],
        });
        return response.data;
    },


    getDailyAllowancesVehicleTypes: async (): Promise<any> => {
        const response = await FrappeAPI.getDocumentList('Daily Allowance Vehicle Category', {
            fields: ['name'],
        });
        return response.data;
    },
    getExpensePolicies: async (employeeId : string): Promise<any> => {
        const response = await FrappeAPI.callMethod('chatnext_expense_trips.expense_claim.get_list_of_policys',{
            employee: employeeId,
        });

        return response;
    },

  getExpenseClaims: async (filters?: FilterCondition[]): Promise<any> => {
    const result = await FrappeAPI.getDocumentList("Expense Claim", {
      fields: [
        "*"
      ],
      filters,
      limit: 50,
    });
    return result.data as any;
  },
};