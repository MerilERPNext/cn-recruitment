/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery } from "@tanstack/react-query";
import { getInvoiceHTMLSheet, getInvoiceSalarySlip, getPerquisite } from "../../services/payrollApi/perquisiteService";



export const usePerquisite = (
  employeeId?: string,
  company?: string,
  payroll_period?: string,
) => {
return useQuery({
queryKey: ["payroll-data", employeeId, company, payroll_period],
queryFn: () => getPerquisite(employeeId,   company, payroll_period),
enabled: true,
staleTime: 5 * 60 * 1000, // 5 minutes
});
}

export const useInvoiceSalarySlip = (
  employeeId?: string,
  company?: string,
) => {
return useQuery({
queryKey: ["invoice-salary-slip", employeeId, company],
queryFn: () =>  getInvoiceSalarySlip (employeeId,   company),
enabled: true,
staleTime: 5 * 60 * 1000, // 5 minutes
});
}


export const useInvoiceSheetViewPDF = (
  options: { onSuccess?: (data: any) => void } = {}
) => {
  return useMutation({
    mutationFn: async (invoiceID: string) => {
      const res = await getInvoiceHTMLSheet(invoiceID);

      // yahin se url extract karo
      return res?.message?.file_url;
    },
    onSuccess: options.onSuccess,
  });
};
