import { FilterCondition } from "../types/frappe";
import FrappeAPI from "../utils/frappeAPI";

export const expenseService = {
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
