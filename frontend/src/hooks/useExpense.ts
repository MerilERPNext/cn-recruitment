/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery,
  UseQueryResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ExpenseApprovalPayload,
  expenseService,
  PerMileageUnitRateResponse,
} from "../services/expenseService";
import { FilterCondition } from "../types/frappe";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  ExpenseTypeFieldsResponse,
  CalculateExpenseParams,
  CalculateExpenseResponse,
} from "../types/expenseAdvance";

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
    queryKey: ["employee-expense-claim", filters],
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
      navigate("/webapp/expenses-app/expenses-list", {
        state: { refresh: true },
      });

      queryClient.invalidateQueries({
        queryKey: ["expense-claims"],
      });
    },
    onError: handleError,
  });
}

export const useGetExpenseTypeFields = (expenseType?: string) => {
  return useQuery<ExpenseTypeFieldsResponse>({
    queryKey: ["expense-type-fields", expenseType],
    queryFn: () => {
      if (!expenseType) throw new Error("Expense type is required");
      return expenseService.getExpenseTypeFields(expenseType);
    },
    enabled: !!expenseType,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useCalculateExpenseAmount = (params?: CalculateExpenseParams) => {
  const queryKey = [
    "expense-calc",
    params?.expense_type,
    params?.units,
    params?.vehicle_type,
  ];

  return useQuery<CalculateExpenseResponse, Error>({
    queryKey,
    queryFn: () => {
      if (!params) throw new Error("params are required");
      return expenseService.calculateExpenseAmount(params);
    },
    enabled: !!(
      params &&
      params.expense_type &&
      params.units !== undefined &&
      params.units !== null
    ),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useGetUnitPrice = (
  claimTypeDoc?: string,
  vehicleType?: string
) => {
  return useQuery<PerMileageUnitRateResponse>({
    queryKey: ["unit-price", claimTypeDoc, vehicleType],
    queryFn: () => {
      if (!claimTypeDoc) throw new Error("claimTypeDoc is required");
      if (!vehicleType) throw new Error("vehicleType is required");
      return expenseService.getUnitPrice(claimTypeDoc, vehicleType);
    },
    enabled: !!claimTypeDoc && !!vehicleType,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
};

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
      errorMsg = err.response.data.message;
    } else if (err?.message) {
      errorMsg = err.message;
    }
  } catch (e) {
    console.error("Failed to parse server error message:", e);
  }

  toast.error(errorMsg);
};

//Expense approval hooks
export function useExpenseApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExpenseApprovalPayload) =>
      expenseService.approveRejectLineItems(payload),
    onSuccess: () => {
      toast.success("Expense claim updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
      queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["todo"] });
    },
    onError: (error) => {
      handleError(error);
      console.error("Expense approval/rejection failed:", error);
    },
  });
}

// Hook for single item approval/rejection
export function useExpenseSingleItemApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      claimId,
      itemName,
      sanctionedAmount,
      comments,
      status,
    }: {
      claimId: string;
      itemName: string;
      sanctionedAmount: number;
      comments: string;
      status: "Approve" | "Reject";
    }) =>
      expenseService.approveSingleItem(
        claimId,
        itemName,
        sanctionedAmount,
        comments,
        status
      ),
    onSuccess: () => {
      toast.success("Expense claim updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
      queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["todo"] });
    },
    onError: (error) => {
      handleError(error);
      console.error("Single item approval/rejection failed:", error);
    },
  });
}
