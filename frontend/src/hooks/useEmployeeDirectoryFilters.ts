import { useQuery } from "@tanstack/react-query";
import {
  getCompanyOptions,
  getDepartmentOptions,
  getEmploymentTypeOptions,
  getBranchOptions,
  getBusinessUnitOptions,
  type CompanyOption,
  type DepartmentOption,
  type EmploymentTypeOption,
  type BranchOption,
  type BusinessUnitOption,
} from "../services/employeeDirectoryFilterService";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes — matches useEmployee.ts convention

/**
 * Fetches all available companies for the directory filter.
 */
export function useCompanyOptions() {
  return useQuery<CompanyOption[]>({
    queryKey: ["directory-filter-companies"],
    queryFn: getCompanyOptions,
    staleTime: STALE_TIME,
  });
}

/**
 * Fetches departments filtered by the given list of companies.
 * Query is disabled when no companies are selected.
 */
export function useDepartmentOptions(companies: string[]) {
  return useQuery<DepartmentOption[]>({
    queryKey: ["directory-filter-departments", companies],
    queryFn: () => getDepartmentOptions(companies),
    enabled: companies.length > 0,
    staleTime: STALE_TIME,
  });
}

/**
 * Fetches all employment types.
 */
export function useEmploymentTypeOptions() {
  return useQuery<EmploymentTypeOption[]>({
    queryKey: ["directory-filter-employment-types"],
    queryFn: getEmploymentTypeOptions,
    staleTime: STALE_TIME,
  });
}

/**
 * Fetches branch (office location) options filtered by selected companies.
 * Query is disabled when no companies are selected.
 */
export function useBranchOptions(companies: string[]) {
  return useQuery<BranchOption[]>({
    queryKey: ["directory-filter-branches", companies],
    queryFn: () => getBranchOptions(companies),
    enabled: companies.length > 0,
    staleTime: STALE_TIME,
  });
}

/**
 * Fetches business unit options filtered by selected companies.
 * Query is disabled when no companies are selected.
 */
export function useBusinessUnitOptions(companies: string[]) {
  return useQuery<BusinessUnitOption[]>({
    queryKey: ["directory-filter-business-units", companies],
    queryFn: () => getBusinessUnitOptions(companies),
    enabled: companies.length > 0,
    staleTime: STALE_TIME,
  });
}
