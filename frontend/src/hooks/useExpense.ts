import { useQuery } from "@tanstack/react-query";
import { expenseService } from "../services/expenseService";
import { FilterCondition } from "../types/frappe";

export const useExpenseClaim = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["employee-expense-claim", ],
    queryFn: () => expenseService.getExpenseClaims(filters),
    staleTime: 5 * 60 * 1000,
  });
};

