import { useQuery } from "@tanstack/react-query";
import { payrollDocumentService } from "../../services/payrollApi/payrollDocumentService";
import type { PayrollDocumentCategoriesResponse } from "../../types/payrollDocument";

export const usePayrollDocumentCategories = () => {
  return useQuery<PayrollDocumentCategoriesResponse>({
    queryKey: ["payroll-document-categories"],
    queryFn: () => payrollDocumentService.getPayrollDocumentCategories(),
    staleTime: 10 * 60 * 1000,
  });
};
