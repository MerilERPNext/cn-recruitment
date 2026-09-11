import FrappeAPI from "../../utils/frappeAPI";
import type {
  PayrollDocument,
  PayrollDocumentCategoriesResponse,
  PayrollDocumentListResponse,
} from "../../types/payrollDocument";

export interface GetPayrollDocumentListParams {
  employee?: string;
  company?: string;
  payroll_period?: string;
  month?: string;
  payroll_document_category?: string;
  search_term?: string;
  start?: number;
  page_length?: number;
  order_by?: string;
}

export const payrollDocumentService = {
  getPayrollDocumentCategories: async (): Promise<PayrollDocumentCategoriesResponse> => {
    const res = (await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.payroll_documents.get_payroll_document_categories"
    )) as PayrollDocumentCategoriesResponse;
    return res;
  },

  getPayrollDocument: async (
    name: string,
    employee?: string
  ): Promise<{ status: string; data: PayrollDocument }> => {
    const res = (await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.payroll_documents.get_payroll_document",
      { name, employee }
    )) as { status: string; data: PayrollDocument };
    return res;
  },

  getPayrollDocumentList: async (
    params: GetPayrollDocumentListParams
  ): Promise<PayrollDocumentListResponse> => {
    const res = (await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.payroll_documents.get_payroll_document_list",
      params as Record<string, unknown>
    )) as PayrollDocumentListResponse;
    return res;
  },
};
