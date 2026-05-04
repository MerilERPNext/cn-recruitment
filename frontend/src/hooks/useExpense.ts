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
    queryKey: ["employee-expense-claim", filters],
    queryFn: () => expenseService.getExpenseClaims(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export function usePostExpenseClaim() {
  const queryClient = useQueryClient();

  const handleError = (err: any) => {
    toast.error(
      errorResponseFormater(err, "Submission failed. Please try again.")
    );
  };

  return useMutation({
    mutationFn: (expenses_data: string) =>
      expenseService.postExpenseClaim(expenses_data),
    onSuccess: () => {
      toast.success("Expense claim submitted successfully!");
      
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["custom-api"],
        });
        queryClient.invalidateQueries({
          queryKey: ["custom-api-infinite"],
        });
      }, 1500);

    },
    onError: handleError,
  });

}

export function useValidateExpense() {
  return useMutation({
    mutationFn: (expenses_data: string) =>
      expenseService.validateExpenseClaim(expenses_data),
    onError: (err: any) => {
      toast.error(errorResponseFormater(err, "Validation failed."));
    },
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

export type UpdateExpensePayload = {
  expense_claim_name: string;
  expenses: ExpenseItem[];
  isResubmit?: boolean;
};

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateExpensePayload) => {
      return expenseService.updateExpense(
        params.expense_claim_name,
        params.expenses,
        params.isResubmit
      );
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Expense claim updated successfully");

      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["custom-api"],
        });
        queryClient.invalidateQueries({
          queryKey: ["custom-api-infinite"],
        });
      }, 1500);

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

export function useGetApplicableExpenseCategoriesMutation() {
  return useMutation({
    mutationFn: (categoryType: string) =>
      expenseService.getApplicableExpenseCategories(categoryType),
  });
}

export const useGetAllExpenseCategories = () => {
  return useQuery({
    queryKey: ["all-expense-categories"],
    queryFn: () => expenseService.getAllExpenseCategories(),
    staleTime: 5 * 60 * 1000,
  });
};

export function useGetExpenseTypesByCategoryMutation() {
  return useMutation({
    mutationFn: ({
      employee,
      reimbursementCategory,
    }: {
      employee: string;
      reimbursementCategory: string;
    }) => expenseService.getExpenseTypesByCategory(employee, reimbursementCategory),
  });
}

export const useGetExpenseAttachments = (documentName?: string, doctype?: string) => {
  return useQuery({
    queryKey: ["expense-attachments", documentName, doctype],
    queryFn: () => {
      if (!documentName) throw new Error("documentName is required");
      return expenseService.getExpenseAttachments(documentName, doctype);
    },
    enabled: !!documentName,
    staleTime: 5 * 60 * 1000,
  });
};

export function useCreateDraftExpenseClaim() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: any) => expenseService.createDraftExpenseClaim(payload),
    onSuccess: () => {
      toast.success("Draft expense claim saved!");
      queryClient.removeQueries({ queryKey: ["expense-claims-draft"] });
      navigate("/webapp/expenses-app/expenses-list");
    },
    onError: (err: any) => {
      toast.error(errorResponseFormater(err, "Failed to save draft."));
    },
  });
}

export const useGetDraftExpenseClaims = (
  employeeId?: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["expense-claims-draft", employeeId],
    queryFn: () => {
      if (!employeeId) return [];
      return expenseService.getDraftExpenseClaims(employeeId);
    },
    enabled: options?.enabled ?? !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export function useDeleteDraftExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (docName: string) => expenseService.deleteDraftExpenseClaim(docName),
    onSuccess: (_, docName) => {
      queryClient.setQueriesData(
        { queryKey: ["expense-claims-draft"] },
        (existingDrafts: any) => {
          if (!Array.isArray(existingDrafts)) return existingDrafts;
          return existingDrafts.filter((draft: any) => draft?.name !== docName);
        },
      );
    },
    onError: (err: any) => {
      toast.error(errorResponseFormater(err, "Failed to delete draft."));
    },
  });
}

export function useUpdateDraftExpenseClaim() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ docName, payload }: { docName: string; payload: any }) =>
      expenseService.updateDraftExpenseClaim(docName, payload),
    onSuccess: () => {
      toast.success("Draft expense claim updated!");
      queryClient.removeQueries({ queryKey: ["expense-claims-draft"] });
      navigate("/webapp/expenses-app/expenses-list");
    },
    onError: (err: any) => {
      toast.error(errorResponseFormater(err, "Failed to update draft."));
    },
  });
}

export function useUpdateFileAttachment() {
  return useMutation({
    mutationFn: ({ fileName, data }: { fileName: string; data: { attached_to_doctype: string; attached_to_name: string } }) =>
      expenseService.updateFile(fileName, data),
  });
}

/**
 * Hook to update the approval_status field of an Expense Claim.
 * Used to transition backend "Draft" expenses to "Pending" on bulk submit.
 */
export function useUpdateExpenseApprovalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expenseClaimName,
      approvalStatus,
    }: {
      expenseClaimName: string;
      approvalStatus: string;
    }) =>
      expenseService.updateExpenseClaimApprovalStatus(
        expenseClaimName,
        approvalStatus
      ),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["custom-api"] });
        queryClient.invalidateQueries({ queryKey: ["custom-api-infinite"] });
        queryClient.invalidateQueries({ queryKey: ["expense-claims-all"] });
      }, 500);
    },
    onError: (err: any) => {
      toast.error(errorResponseFormater(err, "Failed to update expense status."));
    },
  });
}

/**
 * Hook to delete an Expense Claim document (not Draft Expense Claim).
 * Used for backend "Draft" expense claims shown in My Expenses tab.
 */
export function useDeleteExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseClaimName: string) =>
      expenseService.deleteExpenseClaim(expenseClaimName),
    onSuccess: () => {
      toast.success("Expense claim deleted successfully.");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["custom-api"] });
        queryClient.invalidateQueries({ queryKey: ["custom-api-infinite"] });
        queryClient.invalidateQueries({ queryKey: ["expense-claims-all"] });
      }, 500);
    },
    onError: (err: any) => {
      toast.error(errorResponseFormater(err, "Failed to delete expense claim."));
    },
  });
}
