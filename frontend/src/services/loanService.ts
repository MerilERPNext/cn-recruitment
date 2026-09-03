import { LoanApplicationUpdatePayload } from "../hooks/useLoan";
import {
  EditInstallmentPayload,
  HoldInstallmentPayload,
  InstallmentActionResponse,
} from "../types/loan";
import FrappeAPI from "../utils/frappeAPI";

export const getAllLoanProducts = async (): Promise<{
  data: { name: string }[];
}> => {
  const res = await FrappeAPI.getDocumentList("Loan Product", {
    fields: ["name"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as { name: string }[],
  };
};

export const createLoanApplication = async (
  body: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await FrappeAPI.createDocument("Loan Application", body);

    // Return true if response is not null/undefined
    return !!response;
  } catch (error) {
    console.error("📡 Error while Adding Loan Application in:", error);
    throw error;
  }
};


export const updateLoanApplication = async ({
  docname,
  data,
}: LoanApplicationUpdatePayload) => {
  const response = await FrappeAPI.updateDocument("Loan Application", docname, data);
  await FrappeAPI.callMethod(
    "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.resubmit_approval_event",
    {
      doctype: "Loan Application",
      docname: docname,
      data: [data],
    }
  );
  return response;
};

/** Check admin permissions for loan actions */
export const checkLoanAdminPermission = async (
  employee?: string
): Promise<string[]> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_slip_list.check_admin_permission",
    { employee }
  );
  return Array.isArray(response) ? (response as string[]) : [];
};

/** Hold loan installments */
export const holdLoanInstallment = async (
  payload: HoldInstallmentPayload
): Promise<InstallmentActionResponse> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.loan_application.hold_installments",
    payload
  );
  return response as InstallmentActionResponse;
};

/** Edit loan installment repayment amount */
export const editLoanInstallment = async (
  payload: EditInstallmentPayload
): Promise<InstallmentActionResponse> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.loan_application.edit_installment",
    payload
  );
  return response as InstallmentActionResponse;
};