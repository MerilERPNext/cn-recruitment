import { FrappeAPI } from "../utils/frappeAPI";

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface CompanyOption {
  name: string;
  company_name: string;
}

export interface DepartmentOption {
  name: string;
  department_name: string;
}

export interface EmploymentTypeOption {
  name: string;
  employee_type_name: string;
}

export interface BranchOption {
  name: string;
  branch: string;
}

export interface BusinessUnitOption {
  name: string;
  business_unit: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Fetches company options for the Employee Directory filter.
 * Uses the existing hierarchy options endpoint used by Form.io.
 */
export async function getCompanyOptions(): Promise<CompanyOption[]> {
  const result = (await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.apis.employee_history.get_designation_hierarchy_options",
  )) as { data?: { companies?: CompanyOption[] } } | null;

  return result?.data?.companies ?? [];
}

/**
 * Fetches department options, filtered by selected companies.
 * Returns all departments when no companies are selected.
 */
export async function getDepartmentOptions(
  companies: string[],
): Promise<DepartmentOption[]> {
  if (companies.length === 0) return [];

  const result = await FrappeAPI.getDocumentList("Department", {
    fields: ["name", "department_name"],
    filters: [["company", "in", companies]],
  });

  return (result.data as DepartmentOption[]) ?? [];
}

/**
 * Fetches all employment type options.
 */
export async function getEmploymentTypeOptions(): Promise<EmploymentTypeOption[]> {
  const result = await FrappeAPI.getDocumentList("Employment Type", {
    fields: ["name", "employee_type_name"],
  });
  return (result.data as EmploymentTypeOption[]) ?? [];
}

/**
 * Fetches branch (office location) options, filtered by selected companies.
 */
export async function getBranchOptions(
  companies: string[],
): Promise<BranchOption[]> {
  if (companies.length === 0) return [];

  const result = await FrappeAPI.getDocumentList("Branch", {
    fields: ["name", "branch"],
    filters: [["custom_company", "in", companies]],
  });
  return (result.data as BranchOption[]) ?? [];
}

/**
 * Fetches business unit options, filtered by selected companies.
 */
export async function getBusinessUnitOptions(
  companies: string[],
): Promise<BusinessUnitOption[]> {
  if (companies.length === 0) return [];

  const result = await FrappeAPI.getDocumentList("Business Unit", {
    fields: ["name", "business_unit"],
    filters: [["company", "in", companies]],
  });
  return (result.data as BusinessUnitOption[]) ?? [];
}

export const employeeDirectoryFilterService = {
  getCompanyOptions,
  getDepartmentOptions,
  getEmploymentTypeOptions,
  getBranchOptions,
  getBusinessUnitOptions,
};
