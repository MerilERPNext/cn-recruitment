import FrappeAPI from "../utils/frappeAPI";
import type { FilterCondition } from "../types/frappe";
import type { FlowRequestItem } from "../types/flows";


export interface ActiveRepotreeTypes {
  name: string;
  employee_name: string;
  image: string | null;
  status: string;
  designation?: string;
  custom_designation_title?: string | null;
  department?: string;
  reports_to?: string;
  company?: string;
  user_id?: string;
  designation_name?: string;
  company_name?: string;
  department_name?: string;
  employee_self_service?: boolean;
}

export interface FetchEmployeesPaginationParams {
  searchTerm?: string;
  limit?: number;
  limitStart?: number;
}

/**
 * Fetch all active employees across the organization (used by admins).
 */
export const getAllActiveEmployees = async (
  params?: FetchEmployeesPaginationParams
): Promise<ActiveRepotreeTypes[]> => {
  const filters: FilterCondition[] = [
    ["status", "=", "Active"],
  ];
  const fields = [
    "name",
    "employee_name",
    "image",
    "status",
    "designation",
    "custom_designation_title",
    "department",
    "reports_to",
    "company",
    "user_id",
  ];
  const queryParams: Record<string, unknown> = {
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
  };
  if (params?.searchTerm && params.searchTerm.trim()) {
    queryParams.search_term = params.searchTerm.trim();
  }
  if (params?.limit !== undefined) {
    queryParams.limit_page_length = params.limit;
  }
  if (params?.limitStart !== undefined) {
    queryParams.start = params.limitStart;
  }

  const response = await FrappeAPI.getMethod(
    "cn_hrms_core.cn_hrms_core.apis.employee.get_employees",
    queryParams
  );
  const res = response as { message?: unknown; data?: unknown } | unknown[];
  const rawList = Array.isArray((res as { message?: unknown })?.message)
    ? ((res as { message: unknown[] }).message)
    : Array.isArray(res)
      ? res
      : [];
  return rawList as ActiveRepotreeTypes[];
};

/**
 * Fetch direct active reportees for a given manager employee ID.
 */
export const getActiveReportees = async (
  reportsTo: string,
  params?: FetchEmployeesPaginationParams
): Promise<ActiveRepotreeTypes[]> => {
  const filters: FilterCondition[] = [
    ["reports_to", "=", reportsTo],
    ["status", "=", "Active"],
  ];
  const fields = [
    "name",
    "employee_name",
    "image",
    "status",
    "designation",
    "custom_designation_title",
    "department",
    "reports_to",
    "company",
    "user_id",
  ];
  const queryParams: Record<string, unknown> = {
    filters: JSON.stringify(filters),
    fields: JSON.stringify(fields),
  };
  if (params?.searchTerm && params.searchTerm.trim()) {
    queryParams.search_term = params.searchTerm.trim();
  }
  if (params?.limit !== undefined) {
    queryParams.limit_page_length = params.limit;
  }
  if (params?.limitStart !== undefined) {
    queryParams.start = params.limitStart;
  }

  const response = await FrappeAPI.getMethod(
    "cn_hrms_core.cn_hrms_core.apis.employee.get_employees",
    queryParams
  );
  const res = response as { message?: unknown; data?: unknown } | unknown[];
  const rawList = Array.isArray((res as { message?: unknown })?.message)
    ? ((res as { message: unknown[] }).message)
    : Array.isArray(res)
      ? res
      : [];
  return rawList as ActiveRepotreeTypes[];
};

/**
 * Fetch PIP (1_PIP_Init) flow requests using funnel_activity API.
 */
export const getPipFlowRequests = async (): Promise<FlowRequestItem[]> => {
  const response = await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details",
    {
      doctype: "Employee",
      search_term: "1_PIP_Init",
      search_fields: ["flow_name", "flow_category", "initiated_by"],
      page: 1,
      limit: 10,
      order_by: "creation desc",
    }
  );

  const res = response as {
    data?: FlowRequestItem[] | { data?: FlowRequestItem[] };
    message?: { data?: FlowRequestItem[] };
  } | FlowRequestItem[];

  const rawList: FlowRequestItem[] = Array.isArray((res as { data?: FlowRequestItem[] })?.data)
    ? ((res as { data: FlowRequestItem[] }).data)
    : Array.isArray((res as { message?: { data?: FlowRequestItem[] } })?.message?.data)
      ? ((res as { message: { data: FlowRequestItem[] } }).message.data)
      : Array.isArray((res as { data?: { data?: FlowRequestItem[] } })?.data?.data)
        ? ((res as { data: { data: FlowRequestItem[] } }).data.data)
        : Array.isArray(res)
          ? res
          : [];

  return rawList;
};

/**
 * Fetch PIP flow requests for a specific employee (1_PIP_Init).
 */
export const getPipFlowRequestsByEmployee = async (
  employeeId?: string
): Promise<FlowRequestItem[]> => {
  const rawList = await getPipFlowRequests();

  const pipItems = rawList.filter((item) => item.flow_name === "1_PIP_Init");
  const candidates = pipItems.length > 0 ? pipItems : rawList;

  if (!employeeId) return candidates;

  const filtered = candidates.filter(
    (item) =>
      item.initiated_for_emp_id === employeeId ||
      item.initiated_for === employeeId
  );

  return filtered.length > 0 ? filtered : candidates;
};

/**
 * Fetch PIP flow requests scoped to a target employee using X-Target-Employee-Id header.
 */
export const getPipFlowRequestsForEmployee = async (
  employeeId?: string
): Promise<FlowRequestItem[]> => {
  const options = employeeId
    ? { headers: { "X-Target-Employee-Id": employeeId } }
    : {};

  const response = await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details",
    {
      doctype: "Employee",
      search_term: "1_PIP_Init",
      search_fields: ["flow_name", "flow_category", "initiated_by"],
      page: 1,
      limit: 10,
      order_by: "creation desc",
    },
    options
  );

  const res = response as {
    data?: FlowRequestItem[] | { data?: FlowRequestItem[] };
    message?: { data?: FlowRequestItem[] };
  } | FlowRequestItem[];

  const rawList: FlowRequestItem[] = Array.isArray((res as { data?: FlowRequestItem[] })?.data)
    ? ((res as { data: FlowRequestItem[] }).data)
    : Array.isArray((res as { message?: { data?: FlowRequestItem[] } })?.message?.data)
      ? ((res as { message: { data: FlowRequestItem[] } }).message.data)
      : Array.isArray((res as { data?: { data?: FlowRequestItem[] } })?.data?.data)
        ? ((res as { data: { data: FlowRequestItem[] } }).data.data)
        : Array.isArray(res)
          ? res
          : [];

  const pipItems = rawList.filter((item) => item.flow_name === "1_PIP_Init");
  const candidates = pipItems.length > 0 ? pipItems : rawList;

  if (!employeeId) return candidates;

  const filtered = candidates.filter(
    (item) =>
      item.initiated_for_emp_id === employeeId ||
      item.initiated_for === employeeId
  );

  return filtered.length > 0 ? filtered : candidates;
};
