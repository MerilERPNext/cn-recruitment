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
import { errorResponseFormater } from "../utils/errorResponseFormater";
import {
  ExpenseCategoryType,
  ExpensePolicyQuestionsResponse,
} from "../types/expense";

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
    toast.error(
      errorResponseFormater(err, "Submission failed. Please try again.")
    );
  };

  return useMutation({
    mutationFn: (expenses_data: string) =>
      expenseService.postExpenseClaim(expenses_data),
    onSuccess: async() => {
      queryClient.invalidateQueries({
        queryKey: ["expense-claims"],
      });
      queryClient.invalidateQueries({
        queryKey: ["expense-claims-all"],
      });
         queryClient.invalidateQueries({
        queryKey: ["custom-api-infinite", "cn_leave_shift_managment.api.get_open_approval_todos"],
      });
     
      await new Promise((res)=> setTimeout(res, 3000));
      toast.success("Expense claim submitted successfully!");
      navigate("/webapp/expenses-app/expenses-list", {
        state: { refresh: true },
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
      queryClient.invalidateQueries({ queryKey: ["todo-refdocs"] });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to update expense claim. Please try again."
        )
      );

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
      queryClient.invalidateQueries({ queryKey: ["todo-refdocs"] });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to update expense claim. Please try again."
        )
      );

      console.error("Expense approval/rejection failed:", error);
    },
  });
}

//edit expense

type ExpenseItem = Record<string, any>;
type ParticipantItem = Record<string, any>;

export type UpdateExpensePayload = {
  expense_claim_name: string;
  expenses: ExpenseItem[];
  participants: ParticipantItem[];
};

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateExpensePayload) =>
      expenseService.updateExpense(
        params.expense_claim_name,
        params.expenses,
        params.participants
      ),
    onSuccess: () => {
      const allQueries = queryClient.getQueryCache().getAll();
      console.log(
        "All queries in cache:",
        allQueries.map((q) => q.queryKey)
      );
      toast.dismiss();
      toast.success("Expense claim updated successfully");

      queryClient.invalidateQueries({
        queryKey: ["document", "Expense Claim"],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "custom-api-infinite",
          "cn_leave_shift_managment.api.get_open_approval_todos",
        ],
      });
    },
    onError: (err: any) => {
      toast.error(errorResponseFormater(err));
    },
  });
}

//update expense line item
export function useExpenseLineItemUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      claimId,
      itemName,
      sanctionedAmount,
    }: {
      claimId: string;
      itemName: string;
      sanctionedAmount: number;
    }) => expenseService.updateLineItem(claimId, itemName, sanctionedAmount),
    onSuccess: () => {
      toast.success("Line item updated successfully!");

      queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Line item update failed, Please try again."
        )
      );
      console.error("Line item update failed:", error);
    },
  });
}

//updateExpense comment
export function useExpenseCommentUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      referenceDoctype,
      referenceName,
      content,
      comment_email,
    }: {
      referenceDoctype: string;
      referenceName: string;
      content: string;
      comment_email: string;
    }) =>
      expenseService.updateExpenseComment(
        referenceDoctype,
        referenceName,
        content,
        comment_email
      ),

    onSuccess: () => {
      toast.success("Comment added successfully!");
      queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["todo"] });
      queryClient.invalidateQueries({ queryKey: ["todo-refdocs"] });
    },

    onError: (error) => {
      toast.error(
        errorResponseFormater(error, "Comment update failed. Please try again.")
      );
      console.error("Comment update failed:", error);
    },
  });
}

export const useGetExpenseCategoryTypes = () => {
  return useQuery<ExpenseCategoryType[]>({
    queryKey: ["expense-category-types"],
    queryFn: expenseService.getExpenseCategoryTypes,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

//expense policy questions
export const useGetExpensePolicyQuestions = (categoryName?: string) => {
  return useQuery<ExpensePolicyQuestionsResponse>({
    queryKey: ["expense-policy-questions", categoryName],
    queryFn: () => expenseService.getExpensePolicyQuestions(categoryName),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
