import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  SalarySlipDetails,
  downloadSalarySlipPDF,
} from "../services/salaryDetailsService";
import type { SalaryComponent, SalarySlipDetail } from "../types/salary";
import { PermissionError } from "../types/interview";

const isPermissionError = (error: unknown): error is PermissionError => {
  if (error instanceof PermissionError) return true;
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    );
  }
  return false;
};

const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) return false;
  return failureCount < 3;
};

export const useSalarySlipDetails = (
  params: SalaryComponent,
  options?: Omit<UseQueryOptions<SalarySlipDetail>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["salary-slip", params.name],
    queryFn: () => SalarySlipDetails.getSalarySlipDetails(params),
    staleTime: 5 * 60 * 1000,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!params.name,
    ...options,
  });
};
export const useDownloadSalarySlipPDF = () => {
  return useMutation({
    mutationFn: async (salarySlipName: string) => {
      const blob = await downloadSalarySlipPDF(salarySlipName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Salary_Slip_${salarySlipName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};

export { isPermissionError };
