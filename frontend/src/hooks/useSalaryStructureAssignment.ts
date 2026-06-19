import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAndSubmitSalaryStructureAssignment,
  getIncomeTaxSlabs,
  getPayrollPeriods,
  getSalaryStructureAssignments,
  getSalaryStructures,
  type CreateSalaryStructureAssignmentPayload,
  type LinkOption,
  type SalaryStructureAssignmentRow,
} from "../services/salaryStructureAssignment";

/** List the Salary Structure Assignments (optionally for a single employee). */
export const useSalaryStructureAssignments = (employee?: string) => {
  return useQuery<SalaryStructureAssignmentRow[]>({
    queryKey: ["salary-structure-assignments", employee ?? "all"],
    queryFn: () => getSalaryStructureAssignments(employee),
  });
};

/** Active Salary Structures for the company (dropdown source). */
export const useSalaryStructures = (company?: string) => {
  return useQuery<LinkOption[]>({
    queryKey: ["salary-structures", company],
    queryFn: () => getSalaryStructures(company),
    enabled: !!company,
  });
};

/** Payroll Periods for the company (dropdown source). */
export const usePayrollPeriods = (company?: string) => {
  return useQuery<LinkOption[]>({
    queryKey: ["payroll-periods", company],
    queryFn: () => getPayrollPeriods(company),
    enabled: !!company,
  });
};

/** Enabled Income Tax Slabs for the company (optional dropdown source). */
export const useIncomeTaxSlabs = (company?: string) => {
  return useQuery<LinkOption[]>({
    queryKey: ["income-tax-slabs", company],
    queryFn: () => getIncomeTaxSlabs(company),
    enabled: !!company,
  });
};

/** Create + submit a Salary Structure Assignment, then refresh the list. */
export const useCreateSalaryStructureAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalaryStructureAssignmentPayload) =>
      createAndSubmitSalaryStructureAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["salary-structure-assignments"],
      });
    },
  });
};
