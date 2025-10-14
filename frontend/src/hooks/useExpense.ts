/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery,
  UseQueryResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { expenseService } from "../services/expenseService";
import { FilterCondition } from "../types/frappe";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export const useExpenseTypes = (
  filters?: FilterCondition[]
): UseQueryResult<any, Error> => {
  return useQuery<any, Error>({
    queryKey: ["expense", filters],
    queryFn: () => expenseService.getExpensesTypes(filters ?? []),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

export const useExpenseTravelPolicies = (): UseQueryResult<any, Error> => {
  return useQuery<any, Error>({
    queryKey: ["expenseTravelPolicies"],
    queryFn: () => expenseService.getExpenseTravelPolicies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

export const useDailyAllowancesVehicleCategories = (): UseQueryResult<
  any,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["DailyAllowancesVehicleCategories"],
    queryFn: () => expenseService.getDailyAllowancesVehicleTypes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

export const useExpensePolicies = (
  employee_id: string
): UseQueryResult<any, Error> => {
  return useQuery<any, Error>({
    queryKey: ["expensePolicies", employee_id],
    queryFn: () => expenseService.getExpensePolicies(employee_id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    enabled: !!employee_id,
  });
};

export const useExpenseClaim = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["employee-expense-claim"],
    queryFn: () => expenseService.getExpenseClaims(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export function usePostExpenseClaim() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleError = (err: any) => {
    let errorMsg = "Submission failed. Please try again.";

    try {
      const raw = err?.response?.data?._server_messages;
      if (raw) {
        const messages = JSON.parse(raw);
        if (Array.isArray(messages) && messages.length > 0) {
          const firstMessage = JSON.parse(messages[0]);
          if (firstMessage?.message) {
            errorMsg = firstMessage.message.replace(/<[^>]*>/g, "").trim();
          }
        }
      } else if (err?.response?.data?.message) {
        // Fallback for non-_server_messages errors
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
    } catch (e) {
      console.error("Failed to parse server error message:", e);
    }

    toast.error(errorMsg);
  };

  return useMutation({
    mutationFn: (expenses_data: string) =>
      expenseService.postExpenseClaim(expenses_data),
    onSuccess: () => {
      toast.success("Expense claim submitted successfully!");
      navigate("/webapp/expenses-app/expenses-list");
      queryClient.invalidateQueries({ queryKey: ["expenseClaims"] });
    },
    onError: handleError,
  });
}
