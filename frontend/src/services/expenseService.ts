/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExpenseCategoryType,
  ExpensePolicyQuestionsResponse,
} from "../types/expense";
import {
  CalculateExpenseParams,
  CalculateExpenseResponse,
  ExpenseTypeFieldsResponse,
} from "../types/expenseAdvance";
import { ReimbursementSummary } from "../types/expenseSummary";
import { FilterCondition } from "../types/frappe";
import { FrappeAPI } from "../utils/frappeAPI";

export interface PerMileageUnitRateResponse {
  message?: string | { label?: string; rate?: number; [k: string]: any };
  // other keys if any
}

export type UnitPriceResponse = PerMileageUnitRateResponse | string;

export interface ExpenseLineItem {
  name: string;
  sanctioned_amount?: number;
  comments: string;
  status: "Approve" | "Reject";
}

// export interface ExpenseApprovalPayload {
//   claim_id: string;
//   line_items: ExpenseLineItem[];
// }

export interface ExpenseApprovalPayload extends Record<string, unknown> {
  claim_id: string;
  line_items: ExpenseLineItem[];
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
      },
    );
    return response.data;
  },
  getExpensePolicies: async (employeeId: string): Promise<any> => {
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_list_of_policys",
      {
        employee: employeeId,
      },
    );

    return response;
  },

  getAutoPopulatedCostCenter: async (employeeId: string): Promise<any> => {
    return FrappeAPI.getMethod(
      "chatnext_expense_trips.chatnext_expense_trips.doctype.reimbursement_settings.reimbursement_settings.get_auto_populated_cost_center",
      { employee: employeeId },
    );
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

  getExpenseReferenceDoc: async (
    referenceName: string,
    doctype: string = "Expense Claim",
  ): Promise<any> => {
    return FrappeAPI.callMethod("cn_hrms_core.api.get_reference_doc", {
      reference_name: referenceName,
      doctype,
    });
  },

  postExpenseClaim: async (expenses_data: string) => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.create_expense_claims_by_category",
      { expenses_data },
    );
  },

  getExpenseTypeFields: async (
    expenseType: string,
  ): Promise<ExpenseTypeFieldsResponse> => {
    const normalizedExpenseType = expenseType?.trim();
    if (!normalizedExpenseType) throw new Error("expenseType is required");
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_expense_type_fields",
      { expense_type: normalizedExpenseType }
    );
    return response as ExpenseTypeFieldsResponse;
  },

  calculateExpenseAmount: async (
    params: CalculateExpenseParams,
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
      payload,
    );

    return response as CalculateExpenseResponse;
  },

  getUnitPrice: async (
    claimTypeDoc: string,
    vehicleType: string
  ): Promise<UnitPriceResponse> => {
    if (!claimTypeDoc) throw new Error("claimTypeDoc is required");
    if (!vehicleType) throw new Error("vehicleType is required");

    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_per_mileage_unit_rate",
      {
        claim_type_doc: claimTypeDoc,
        vehicle_type: vehicleType,
      },
    );

    return response as UnitPriceResponse;
  },

  //Approve or reject line expense
  approveRejectLineItems: async (
    payload: ExpenseApprovalPayload,
  ): Promise<any> => {
    try {
      const response = await FrappeAPI.callMethod(
        "chatnext_expense_trips.expense_claim.approve_reject_line_items",
        payload,
      );
      return response;
    } catch (error) {
      console.error("📡 Error while approving/rejecting expense items:", error);
      throw error;
    }
  },

  // Optional: Single item approval/rejection
  approveSingleItem: async (
    claimId: string,
    itemName: string,
    sanctionedAmount: number,
    comments: string,
    status: "Approve" | "Reject",
  ): Promise<any> => {
    try {
      const payload: ExpenseApprovalPayload = {
        claim_id: claimId,
        line_items: [
          {
            name: itemName,
            sanctioned_amount:
              status === "Approve" ? sanctionedAmount : undefined,
            comments,
            status,
          },
        ],
      };

      const response = await FrappeAPI.callMethod(
        "chatnext_expense_trips.expense_claim.approve_reject_line_items",
        payload,
      );
      return response;
    } catch (error) {
      console.error(
        "📡 Error while approving/rejecting single expense item:",
        error,
      );
      throw error;
    }
  },

  //expense update
  updateExpense: async (
    expense_claim_name: string,
    expenses: Array<Record<string, any>>,
    isResubmit?: boolean,
    approval_status?: string,
    participants?: Array<Record<string, any>>,
  ) => {
    if (!expense_claim_name) {
      throw new Error("expense_claim_name is required");
    }

    if (!Array.isArray(expenses)) {
      throw new Error("expenses must be an array");
    }

    const expenseClaimData: Record<string, unknown> = {
      expense_claim_name,
      expenses,
    };

    if (approval_status) {
      expenseClaimData.approval_status = approval_status;
    }

    if (participants) {
      expenseClaimData.participants = participants;
    }

    const payload = {
      expense_claim_data: expenseClaimData,
    };

    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.edit_expense_claim",
      payload,
    );

    if (isResubmit) {
      await FrappeAPI.callMethod(
        "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.resubmit_approval_event",
        {
          doctype: "Expense Claim",
          docname: expense_claim_name,
        },
      );
    }

    return response;
  },

  //update line item status
  updateLineItem: async (
    claimId: string,
    itemName: string,
    sanctionedAmount: number,
  ): Promise<any> => {
    try {
      const payload = {
        claim_id: claimId,
        line_items: [
          {
            name: itemName,
            sanctioned_amount: sanctionedAmount,
          },
        ],
      };

      const response = await FrappeAPI.callMethod(
        "chatnext_expense_trips.expense_claim.update_sanctioned_amount",
        payload,
      );
      return response;
    } catch (error) {
      console.error("Error while updating expense line item:", error);
      throw error;
    }
  },

  //update reject comment
  updateExpenseComment: async (
    referenceDoctype: string,
    referenceName: string,
    content: string,
    comment_email: string,
  ): Promise<any> => {
    try {
      const payload = {
        reference_doctype: referenceDoctype,
        reference_name: referenceName,
        content: content,
        comment_email: comment_email,
        comment_by: "",
      };

      const response = await FrappeAPI.callMethod(
        "frappe.desk.form.utils.add_comment",
        payload,
      );

      return response;
    } catch (error) {
      console.error("Error while adding comment:", error);
      throw error;
    }
  },

  getExpenseCategoryTypes: async (): Promise<ExpenseCategoryType[]> => {
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.fiter_category_types",
    );

    return Array.isArray(response) ? response : [];
  },

  getApplicableExpenseCategories: async (
    categoryType: string,
  ): Promise<any> => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_applicable_expense_categories",
      { category_type: categoryType },
    );
  },

  getAllExpenseCategories: async (): Promise<any> => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_applicable_expense_categories",
      // { category_type: "General" }
    );
  },

  getExpenseTypesByCategory: async (
    employee: string,
    reimbursementCategory: string,
  ): Promise<any> => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.get_expense_types_by_category",
      { employee, reimbursement_category: reimbursementCategory },
    );
  },

  getExpensePolicyQuestions: async (
    categoryName?: string,
  ): Promise<ExpensePolicyQuestionsResponse> => {
    const response = await FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_category_questions.get_expense_category_questions",
      categoryName ? { category_name: categoryName } : {},
    );

    return response as ExpensePolicyQuestionsResponse;
  },

  validateExpenseClaim: async (expenses_data: string) => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.validate_expense_claims_by_category",
      { expenses_data },
    );
  },

  getExpenseAttachments: async (
    documentName: string,
    doctype: string = "Expense Claim",
  ): Promise<any[]> => {
    const filters: FilterCondition[] = [
      ["attached_to_doctype", "=", doctype],
      ["attached_to_name", "=", documentName],
    ];
    const result = await FrappeAPI.getDocumentList("File", {
      fields: ["name", "file_name", "file_url"],
      filters,
    });
    return (result.data as any[]) || [];
  },

  createDraftExpenseClaim: async (payload: any) => {
    return FrappeAPI.createDocument("Draft Expense Claim", payload);
  },

  getDraftExpenseClaims: async (employeeId: string): Promise<any[]> => {
    const filters: FilterCondition[] = [["employee", "=", employeeId]];
    const response = await FrappeAPI.getDocumentList("Draft Expense Claim", {
      fields: ["*"],
      filters,
      orderBy: "creation desc",
    });
    return response.data || [];
  },

  deleteDraftExpenseClaim: async (docName: string) => {
    return FrappeAPI.deleteDocument("Draft Expense Claim", docName);
  },

  updateDraftExpenseClaim: async (docName: string, payload: any) => {
    return FrappeAPI.updateDocument("Draft Expense Claim", docName, payload);
  },

  getFilesByAttachment: async (
    attachedToDoctype: string,
    attachedToName: string,
  ): Promise<any[]> => {
    const filters: FilterCondition[] = [
      ["attached_to_doctype", "=", attachedToDoctype],
      ["attached_to_name", "=", attachedToName],
    ];
    const response = await FrappeAPI.getDocumentList("File", {
      fields: [
        "name",
        "file_name",
        "file_url",
        "attached_to_doctype",
        "attached_to_name",
      ],
      filters,
    });
    return response.data || [];
  },

  updateFile: async (
    fileName: string,
    data: { attached_to_doctype: string; attached_to_name: string },
  ) => {
    return FrappeAPI.updateDocument("File", fileName, data);
  },

  deleteFile: async (fileName: string) => {
    return FrappeAPI.deleteDocument("File", fileName);
  },

  resubmitApprovalEvent: async (doctype: string, docname: string) => {
    return FrappeAPI.callMethod(
      "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.resubmit_approval_event",
      {
        doctype,
        docname,
      },
    );
  },

  /**
   * Updates the approval_status of an Expense Claim document.
   * Used to transition a backend "Draft" expense to "Pending".
   */
  updateExpenseClaimApprovalStatus: async (
    expenseClaimName: string,
    approvalStatus: string,
  ): Promise<any> => {
    return FrappeAPI.updateDocument("Expense Claim", expenseClaimName, {
      approval_status: approvalStatus,
    });
  },

  /**
   * Deletes an Expense Claim document.
   * Used for backend "Draft" expense claims (approval_status=Draft).
   */
  deleteExpenseClaim: async (expenseClaimName: string): Promise<any> => {
    return FrappeAPI.deleteDocument("Expense Claim", expenseClaimName);
  },

  getAllowRequestsToBePutOnHold: async (): Promise<any> => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.allow_requests_to_be_put_on_hold",
    );
  },

  updateExpenseClaimStatusAPI: async (
    docname: string,
    approvalStatus: string,
  ): Promise<any> => {
    return FrappeAPI.callMethod(
      "chatnext_expense_trips.expense_claim.update_approval_status",
      { docname, approval_status: approvalStatus }
    );
  },

  /** Fetch reimbursement summary for a given employee */
  /** Fetch reimbursement summary for a given employee */
  getReimbursementSummary: async (
    employeeId: string,
  ): Promise<ReimbursementSummary> => {
    const response = await FrappeAPI.getMethod(
      "chatnext_expense_trips.expense_claim.get_reimbursement_summary",
      { employee: employeeId },
    );
    return response as ReimbursementSummary;
  },

  /** Get count of pending expense claims for an employee using get_open_approval_todos */
  getPendingExpenseClaimsCount: async (
    employeeId: string,
  ): Promise<number> => {
    if (!employeeId) return 0;
    const response: any = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_open_approval_todos",
      {
        doctype: "Expense Claim",
        employee: employeeId,
        approval_status: "Pending",
        filters: JSON.stringify({ approval_status: "Pending" }),
        order_by: "creation desc",
        page_length: 10,
        start: 0,
        todo_status: "Open",
      },
    );

    const totalCount =
      response?.message?.total_count ??
      response?.total_count ??
      response?.data?.total_count ??
      (Array.isArray(response?.message?.data)
        ? response.message.data.length
        : undefined) ??
      (Array.isArray(response?.data) ? response.data.length : undefined) ??
      0;

    return typeof totalCount === "number" ? totalCount : Number(totalCount) || 0;
  },
};


