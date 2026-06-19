import FrappeAPI from "../utils/frappeAPI";
import type { FilterCondition } from "../types/frappe";

const DOCTYPE = "Salary Structure Assignment";

export interface SalaryStructureAssignmentRow {
  name: string;
  employee: string;
  employee_name?: string;
  salary_structure: string;
  from_date: string;
  custom_payroll_period?: string;
  income_tax_slab?: string;
  base?: number;
  variable?: number;
  currency?: string;
  company?: string;
  docstatus?: number;
}

export interface LinkOption {
  name: string;
  [key: string]: unknown;
}

export interface CreateSalaryStructureAssignmentPayload {
  employee: string;
  company?: string;
  salary_structure: string;
  currency?: string;
  from_date: string;
  custom_payroll_period: string;
  income_tax_slab?: string;
  base?: number;
  variable?: number;
}

/**
 * GET the current employee's (or any employee's) Salary Structure Assignments
 * via the standard Frappe resource API.
 */
export const getSalaryStructureAssignments = async (
  employee?: string,
): Promise<SalaryStructureAssignmentRow[]> => {
  const res = await FrappeAPI.getDocumentList(DOCTYPE, {
    fields: [
      "name",
      "employee",
      "employee_name",
      "salary_structure",
      "from_date",
      "custom_payroll_period",
      "income_tax_slab",
      "base",
      "variable",
      "currency",
      "company",
      "docstatus",
    ],
    filters: employee ? [["employee", "=", employee]] : [],
    orderBy: "modified desc",
    limit: 100,
  });
  return res.data as SalaryStructureAssignmentRow[];
};

/** GET active Salary Structures for a company (for the dropdown). */
export const getSalaryStructures = async (
  company?: string,
): Promise<LinkOption[]> => {
  const filters: FilterCondition[] = [
    ["is_active", "=", "Yes"],
    ["docstatus", "=", 1],
  ];
  if (company) filters.push(["company", "=", company]);

  const res = await FrappeAPI.getDocumentList("Salary Structure", {
    fields: ["name", "currency"],
    filters,
    orderBy: "modified desc",
    limit: 500,
  });
  return res.data as LinkOption[];
};

/** GET Payroll Periods for a company (for the dropdown). */
export const getPayrollPeriods = async (
  company?: string,
): Promise<LinkOption[]> => {
  const res = await FrappeAPI.getDocumentList("Payroll Period", {
    fields: ["name", "start_date", "end_date"],
    filters: company ? [["company", "=", company]] : [],
    orderBy: "start_date desc",
    limit: 500,
  });
  return res.data as LinkOption[];
};

/** GET enabled Income Tax Slabs for a company (for the optional dropdown). */
export const getIncomeTaxSlabs = async (
  company?: string,
): Promise<LinkOption[]> => {
  const filters: FilterCondition[] = [
    ["disabled", "=", 0],
    ["docstatus", "=", 1],
  ];
  if (company) filters.push(["company", "=", company]);

  const res = await FrappeAPI.getDocumentList("Income Tax Slab", {
    fields: ["name", "currency"],
    filters,
    orderBy: "effective_from desc",
    limit: 500,
  });
  return res.data as LinkOption[];
};

/**
 * Create a Salary Structure Assignment (draft) via POST and then submit it
 * (docstatus 0 -> 1) via PUT — both on the standard resource API.
 * The PUT with docstatus:1 triggers the server-side submit action.
 */
export const createAndSubmitSalaryStructureAssignment = async (
  payload: CreateSalaryStructureAssignmentPayload,
): Promise<SalaryStructureAssignmentRow> => {
  const created = (await FrappeAPI.createDocument(
    DOCTYPE,
    payload as unknown as Record<string, unknown>,
  )) as SalaryStructureAssignmentRow;

  const submitted = (await FrappeAPI.updateDocument(DOCTYPE, created.name, {
    docstatus: 1,
  })) as SalaryStructureAssignmentRow;

  return submitted;
};
