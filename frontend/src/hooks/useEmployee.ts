import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import commonSerivce from "../services/commonSerivce";
import { EmployeeService } from "../services/employeeService";
import { profileService } from "../services/profileService";
import {
  AttendanceFieldPermissions,
  Award,
  Employee,
  EmployeeIdCard,
  EmployeeIdCardResponse,
  EmployeeListItem,
  EmployeeNode,
} from "../types/employee";
import { FilterCondition } from "../types/frappe";
import { AddressInfoData } from "../types/profile";
import { useLoggedInUser } from "./useLoggedInUser";
import { errorResponseFormater } from "../utils/errorResponseFormater";

// Hook to get a single employee by ID
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
};
export const useEmployees = (
  fields?: string[],
  filters?: FilterCondition[],
  orFilters?: FilterCondition[],
): UseQueryResult<Employee[], Error> => {
  return useQuery<Employee[], Error>({
    queryKey: ["employee", "all", filters, orFilters],
    queryFn: () => EmployeeService.getAllEmployees(fields, filters, orFilters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useSearchEmployees = (
  filters?: string,
  limit?: number,
): UseQueryResult<Employee[], Error> => {
  return useQuery<Employee[], Error>({
    queryKey: ["employee", "search", filters],
    queryFn: () => EmployeeService.getSearchMembers(filters, limit),
    enabled: !!filters,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useAttendanceFieldReasonAndMessagePermissions = (): UseQueryResult<
  AttendanceFieldPermissions,
  Error
> => {
  return useQuery<AttendanceFieldPermissions, Error>({
    queryKey: ["reason-message-permissions-in-attendance-request-form"],
    queryFn: () =>
      EmployeeService.getAttendanceFieldReasonAndMessagePermissions(),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useEmployee = (
  employeeId: string | null,
): UseQueryResult<Employee | EmployeeIdCardResponse, Error> => {
  return useQuery<Employee | EmployeeIdCardResponse, Error>({
    queryKey: ["employee", employeeId],
    queryFn: () => EmployeeService.getEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Hook to get current logged-in user's employee record
export const useCurrentEmployee = (): UseQueryResult<
  Employee | EmployeeIdCardResponse | null,
  Error
> => {
  return useQuery<Employee | EmployeeIdCardResponse | null, Error>({
    queryKey: ["currentEmployee"],
    queryFn: () => EmployeeService.getCurrentEmployee(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
};

// Common fields required by various frontend components to avoid multiple API calls
// Common fields required by various frontend components
// Strictly minimal identity fields to avoid over-fetching PII
export const DEFAULT_EMPLOYEE_FIELDS = [
  // Identity
  "name",
  "employee_name",
  "first_name",
  "middle_name",
  "last_name",
  "image",
  "user_id",
  "employee",
  "employee_number",
  // Organization
  "company",
  "department",
  "designation",
  "custom_designation_title",
  "reports_to",
  "employment_type",
  "branch",
  "grade",
  "status",
  "date_of_joining",
  "default_shift",
  "company_email",
  "personal_email",
  "custom_weekly_off",
  "custom_enable_web_clockin",
  "custom_allow_mobile_checkin",
  "custom_employment_status",
  "final_confirmation_date",
  "custom_dotted_line_manager",
] as const;

export interface EmployeeDetilsType {
  name: string;
  employee_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  image: string | null;

  user_id: string;
  employee_number: string | null;

  company: string;
  department: string;
  designation: string;
  custom_designation_title: string;

  reports_to: string;
  employment_type: string;
  branch: string;
  grade: string;

  status: string;
  date_of_joining: string;

  default_shift: string | null;

  company_email: string;
  personal_email: string;

  custom_weekly_off: string | null;

  custom_enable_web_clockin: number;
  custom_allow_mobile_checkin: number;

  custom_employment_status: string;
  final_confirmation_date: string;

  custom_dotted_line_manager: string | null;

  employee: string;

  reports_to_name: string;
  user_id_name: string;

  company_name: string;
  department_name: string;
  designation_name: string;

  employment_type_name: string;
  branch_name: string;

  grade_name: string;
}

export const useCurrentEmployeeDetails = ({
  employeeId,
  logged_in_employee_details,
}: {
  employeeId?: string;
  logged_in_employee_details?: boolean;
}) => {
  return useQuery<EmployeeDetilsType | null, Error>({
    queryKey: [
      "currentEmployeeDetails",
      employeeId,
      logged_in_employee_details,
    ],
    queryFn: async () =>
      EmployeeService.getCurrnetEmployeeDetails({
        employeeId,
        logged_in_employee_details,
      }),
    select: (data: EmployeeDetilsType | null) => {
      if (data) {
        if (data && data.employee && data.employee === data.name) return data;
        return {
          ...data,
          employee: data.name,
        };
      }
      return data;
    },

    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
};

/**
 * add fields you want in DEFAULT_EMPLOYEE_FIELDS Array inside useEmployee.ts.
 * or pass fields in params.
 */
export const useCurrentEmployeeAllDetails = <
  T extends keyof Employee = never,
>(params?: {
  user_id?: string;
  name?: string;
  fields?: T[];
}) => {
  // Internally resolve the logged-in user when no user_id is supplied
  const { data: loggedInUserId } = useLoggedInUser({
    enabled: !params?.user_id || params.user_id.trim() === "",
  });

  // The effective user id: prefer the explicit arg, fall back to logged-in user
  const effectiveUserId =
    params?.user_id && params.user_id.trim() !== ""
      ? params.user_id
      : (loggedInUserId ?? "");

  // Resolve the fields to fetch: prefer explicit fields, fallback to centralized defaults
  const effectiveFields =
    params?.fields && params.fields.length > 0
      ? params.fields
      : (DEFAULT_EMPLOYEE_FIELDS as unknown as T[]);

  type ResultType = [T] extends [never]
    ? Pick<Employee, (typeof DEFAULT_EMPLOYEE_FIELDS)[number]>
    : Pick<Employee, T>;

  return useQuery<ResultType | null, Error>({
    queryKey: [
      "currentEmployeeAllDetails",
      effectiveUserId,
      params?.name,
      effectiveFields,
    ],
    queryFn: async () => {
      if (
        !effectiveUserId ||
        typeof effectiveUserId !== "string" ||
        effectiveUserId.trim() === ""
      ) {
        console.warn(
          "useCurrentEmployeeAllDetails: could not resolve a valid user_id",
          { user_id: params?.user_id, loggedInUserId },
        );
        return null;
      }
      return EmployeeService.getCurrentEmployeeAllDetails(
        effectiveUserId,
        params?.name,
        effectiveFields as unknown as string[],
      ) as Promise<ResultType | null>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2, // Increased retry count
    enabled:
      !!effectiveUserId &&
      typeof effectiveUserId === "string" &&
      effectiveUserId.trim() !== "",
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Hook to get current logged-in user's All Details
export const useCurrentEmployeeAllDetailsWithParams = (
  filters: FilterCondition[],
) => {
  return useQuery<Employee | null, Error>({
    queryKey: ["currentEmployeeAllDetails", filters],
    queryFn: async () => {
      if (!filters || filters.length === 0) {
        console.warn(
          "useCurrentEmployeeAllDetailsWithParams: Invalid filters provided:",
          filters,
        );
        return null;
      }
      return EmployeeService.getCurrentEmployeeAllDetailsWithParams(filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2, // Increased retry count
    enabled: !!filters && filters.length > 0,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
export const useCurrentEmployeeAddress = (user_id: string) => {
  return useQuery<AddressInfoData, Error>({
    queryKey: ["currentEmployeeAddress", user_id],
    queryFn: () => EmployeeService.getCurrentEmployeeAddress(user_id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
    enabled: !!user_id,
  });
};

export const useGetEmployeeHierarchy = (company: string, empid: string) => {
  return useQuery<EmployeeNode[]>({
    queryKey: ["Employee-hierarchy", company, empid],
    queryFn: () => {
      return EmployeeService.getEmployeeHierarchy(company);
    },
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });
};
export const useGetEmployeeSubordinateHierarchy = (employee: string) => {
  return useQuery<EmployeeNode[]>({
    queryKey: ["Employee-subordinate-hierarchy", employee],
    queryFn: () => {
      return EmployeeService.getEmployeeSubordinateHierarchy(employee);
    },
    enabled: !!employee,
    staleTime: 5 * 60 * 1000,
  });
};
export const useEmployeeReportees = () => {
  return useQuery<Employee[]>({
    queryKey: ["Employee-reportess"],
    queryFn: () => {
      return EmployeeService.getEmployeeReportees();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateCurrentEmployeeProfile = () => {
  const queryClient = useQueryClient();
  return {
    updateEmployeeMutation: useMutation({
      mutationKey: ["updateCurrentEmployeeProfile"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mutationFn: (employeeDetails: any) =>
        EmployeeService.updateCurrentEmployeeProfile(employeeDetails),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["currentEmployeeAllDetails"],
        });
        toast.success("Update submitted! Awaiting your manager’s approval.");
      },
      onError: (e) => {
        console.error("Error updating employee details:", e);
        toast.error("Failed to update employee details. Please try again.");
      },
      retry: 1,
    }),
  };
};

// Hook to search employees by name
export const useEmployeeSearch = (
  searchTerm: string,
): UseQueryResult<EmployeeListItem[], Error> => {
  return useQuery<EmployeeListItem[], Error>({
    queryKey: ["employeeSearch", searchTerm],
    queryFn: () => EmployeeService.searchEmployees(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 2 * 60 * 1000, // 2 minutes (renamed from cacheTime in v5)
  });
};

// Hook to get employee data transformed for ID card
export const useEmployeeIdCard = (
  employeeId: string | null,
): UseQueryResult<EmployeeIdCard | null, Error> => {
  return useQuery<EmployeeIdCard | null, Error>({
    queryKey: ["employeeIdCard", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const employee = await EmployeeService.getEmployee(employeeId);
      return EmployeeService.transformToIdCard(employee);
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Hook to get current user's employee ID card
export const useCurrentEmployeeIdCard = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any,
): UseQueryResult<EmployeeIdCard | null, Error> => {
  return useQuery<EmployeeIdCard | null, Error>({
    queryKey: ["currentEmployeeIdCard"],
    queryFn: async () => {
      const employee = await EmployeeService.getCurrentEmployee();
      if (!employee) return null;
      return EmployeeService.transformToIdCard(employee);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
    ...options,
  });
};

//Hook to get employee by user id
export const useEmployeeByUserId = (userId?: string) => {
  return useQuery({
    queryKey: ["employee-by-user-id", userId],
    queryFn: () => EmployeeService.getEmployeeByUserId(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};
export const useGetAllEmployees = (
  fields?: string[],
  limit?: number,
  filters?: FilterCondition[],
  orFilters?: FilterCondition[],
): UseQueryResult<Employee[], Error> => {
  return useQuery<Employee[], Error>({
    queryKey: ["all-employees-list", fields, limit, filters, orFilters],
    queryFn: () =>
      EmployeeService.getAllEmployees(fields, filters, orFilters, limit),
    // staleTime: 1000 * 60 * 5,
  });
};

export const useGetAllReasons = (requestType: string) => {
  return useQuery({
    queryKey: ["all-reasons-list", requestType],
    queryFn: () => {
      return EmployeeService.getAllReasons([
        // We might need to change it to a dynamic value but currently we are hard coding it.
        ["reference_doctype", "=", requestType],
      ]);
    },
    enabled: !!requestType,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useGenderTypes = () => {
  return useQuery({
    queryKey: ["gender-types"],
    queryFn: () => profileService.getGenders(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useGetEmployeeFieldPermissions = ({
  docname,
  doctype,
  include_breaks,
  all_fields,
  detailed,
}: {
  doctype: string;
  docname?: string;
  include_breaks?: number;
  all_fields?: number;
  detailed?: number;
}) => {
  return useQuery({
    queryKey: [
      "all-emp-field-permissions",
      docname,
      include_breaks,
      all_fields,
      detailed,
    ],
    queryFn: () =>
      profileService.getEmployeeFieldPermissions({
        docname,
        doctype,
        include_breaks,
        all_fields,
        detailed,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!doctype,
  });
};
export const useGetEmployeeDetailsByEmpId = (
  employee_id: string,
  fields?: string[],
) => {
  return useQuery({
    queryKey: ["all-emp-details-by-employee-id", employee_id, fields],
    queryFn: () =>
      profileService.getEmployeeDetailsByEmpId(employee_id, fields),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useGetEmployeeDetailsByEmpIdForProfile = (employee_id: string) => {
  return useQuery({
    queryKey: ["all-emp-details-by-empid-for-profile", employee_id],
    queryFn: () =>
      profileService.getEmployeeDetailsByEmpIdForProfile(employee_id),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useGetEmployeeProfileOverview = (employee_id: string) => {
  return useQuery({
    queryKey: ["all-emp-profile-overview", employee_id],
    queryFn: () => profileService.getEmployeeProfileOverview(employee_id),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useGetEmployeeFieldsToTrack = () => {
  return useQuery({
    queryKey: ["all-emp-fields-to-track"],
    queryFn: () => profileService.getEmployeeFieldsToTrack(),
    staleTime: 1000 * 60 * 5,
  });
};
export const useGetEmploymentHistoryData = (employee_id: string) => {
  return useQuery({
    queryKey: ["employment-history-data", employee_id],
    queryFn: () => profileService.getEmploymentHistoryData(employee_id),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useGetEmployeeAppreciations = () => {
  return useQuery<{ badges: Award[] } | null>({
    queryKey: ["all-emp-appreciations"],
    queryFn: () => profileService.getEmployeeAppreciations(),
    staleTime: 1000 * 60 * 5,
  });
};
export const useGetEmployeeEarnedAppreciations = (employee: string) => {
  return useQuery<{ badges: Award[] } | null>({
    queryKey: ["all-emp-appreciations-badges", employee],
    queryFn: () => profileService.getEmployeeEarnedAppreciations(employee),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee,
  });
};

export const useAppreciateAnEmployeeMutation = () => {
  return useMutation({
    mutationKey: ["appreciateAnEmployee"],
    mutationFn: (body: Record<string, unknown>) =>
      profileService.appreciateAnEmployee(body),
    onError: (error) => {
      console.error("Error appreciating an employee:", error);
    },
  });
};

export const useShowAttendanaceAssignmentButton = (
  employee_id: string,
  currentUser: string,
) => {
  return useQuery({
    queryKey: ["attendance-assignment-button-visibility", employee_id],
    queryFn: () =>
      profileService.getShowAttendanceAssignmentButton(
        employee_id,
        currentUser,
      ),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useGetDesignationHierarchy = (
  company: string,
  department: string,
  designation: string,
) => {
  return useQuery({
    queryKey: ["designation-hierarchy", company, department, designation],
    queryFn: () =>
      profileService.getDesignationHierarchy(company, department, designation),
    staleTime: 1000 * 60 * 5,
    enabled: true,
  });
};

export const useGetEmpDesignationHierarchyCurrentDetails = (
  employee: string,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ["designation-hierarchy", employee],
    queryFn: () =>
      profileService.getEmpDesignationHierarchyCurrentDetails(employee),
    staleTime: 1000 * 60 * 5,
    enabled: enabled,
  });
};

export const useAddEmployeeHistoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["addEmployeeHistory"],
    mutationFn: (body: Record<string, unknown>) =>
      profileService.addEmployeeHistory(body),
    onError: (error) => {
      console.error("Error adding employee history:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employment-history-data"] });
      toast.success("Employee history added successfully");
    },
  });
};
export const useAddEmployeeReportingDetailsMutation = () => {
  return useMutation({
    mutationKey: ["addEmployeeReportingDetails"],
    mutationFn: (body: Record<string, unknown>) =>
      profileService.addEmployeeReportingDetails(body),
    onError: (error) => {
      console.error("Error adding employee reporting details:", error);
    },
  });
};

export const useGetEmployeeReportingDetails = (employee: string) => {
  return useQuery({
    queryKey: ["getEmployeeReportingDetails", employee],
    queryFn: () => profileService.getEmployeeReportingDetails(employee),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee,
  });
};

export const useGetEmployeeHierarchyHistory = (employee: string) => {
  return useQuery({
    queryKey: ["getEmployeeHierarchyHistory", employee],
    queryFn: () => profileService.getEmployeeHierarchyHistory(employee),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee,
  });
};
export const useDeleteEmpReportingDetailsRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteEmpReportingDetailsRecord"],
    mutationFn: (name: string) => profileService.deleteEmpReportingDetailsRecord(name),
    onError: (error) => {
      toast.error(errorResponseFormater(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getEmployeeHierarchyHistory"] });
      toast.success("Employee reporting details deleted successfully");
    },
  });
};

export const useUpdateEmpReportingDetailsRecordMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateEmpReportingDetailsRecord"],
    mutationFn: ({ employee, field, value, start_date }: { employee: string, field: string, value: string, start_date: string }) => profileService.updateEmpReportingDetailsRecord(employee, field, value, start_date),
    onError: (error) => {
      toast.error(errorResponseFormater(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getEmployeeHierarchyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["getEmployeeReportingDetails"] });
      toast.success("Employee reporting details updated successfully");
    },
  });
};

export const useGetFutureFieldTransactions = (employee: string) => {
  return useQuery({
    queryKey: ["getFutureFieldTransactions", employee],
    queryFn: () => profileService.getFutureFieldTransactions(employee),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee,
  });
};

export const useFileUpload = () => {
  return useMutation({
    mutationKey: ["uploadFile"],
    mutationFn: (file: File) => profileService.uploadFile(file),
    onError: (error) => {
      console.error("Error uploading file:", error);
    },
  });
};

export const useGetEmployeeHoverData = () => {
  return useMutation({
    mutationFn: (employee_id: string) =>
      commonSerivce.getHoverData("Employee", employee_id),
    onError: (error) => {
      console.error("Error fetching employee hover data:", error);
    },
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationKey: ["resetPassword"],
    mutationFn: ({
      employee,
      new_password,
      send_mail,
    }: {
      employee: string;
      new_password: string;
      send_mail: boolean;
    }) => EmployeeService.resetPassword(employee, new_password, send_mail),
    onError: (error) => {
      console.error("Error resetting password:", error);
    },
  });
};

export const useUpdateEmployeeSelfServiceMutation = () => {
  return useMutation({
    mutationKey: ["updateEmployeeSelfService"],
    mutationFn: ({ employee, status }: { employee: string; status: string }) =>
      EmployeeService.updateEmployeeSelfService(employee, status),
    onError: (error) => {
      console.error("Error updating employee self service:", error);
    },
  });
};

export const useUpdateProbationPeriodMutation = () => {
  return useMutation({
    mutationKey: ["updateProbationPeriod"],
    mutationFn: ({
      employees,
      probation_period,
    }: {
      employees: string[];
      probation_period: string;
    }) => EmployeeService.updateProbationPeriod(employees, probation_period),
    onError: (error) => {
      console.error("Error updating probation period:", error);
    },
  });
};
export const useUpdateHRBPMutation = () => {
  return useMutation({
    mutationKey: ["updateHRBP"],
    mutationFn: ({
      employees,
      hrbp,
      effective_date,
    }: {
      employees: string[];
      hrbp: string;
      effective_date: string;
    }) => EmployeeService.updateHRBP(employees, hrbp, effective_date),
    onError: (error) => {
      console.error("Error updating HRBP:", error);
    },
  });
};
export const useUpdateDottedLineManagerMutation = () => {
  return useMutation({
    mutationKey: ["updateDottedLineManager"],
    mutationFn: ({
      employees,
      dotted_line_manager,
      effective_date,
    }: {
      employees: string[];
      dotted_line_manager: string;
      effective_date: string;
    }) =>
      EmployeeService.updateDottedLineManager(
        employees,
        dotted_line_manager,
        effective_date,
      ),
    onError: (error) => {
      console.error("Error updating dotted line manager:", error);
    },
  });
};
export const useUpdateEmployeeWeekOffMutation = () => {
  return useMutation({
    mutationKey: ["updateEmployeeWeekOff"],
    mutationFn: ({
      employee,
      week_off,
      date,
    }: {
      employee: string;
      week_off: string;
      date: string;
    }) => EmployeeService.updateEmployeeWeekOff(employee, week_off, date),
    onError: (error) => {
      console.error("Error updating employee week off:", error);
    },
  });
};
export const useDeactivateEmployeeMutation = () => {
  return useMutation({
    mutationKey: ["deactivateEmployee"],
    mutationFn: ({
      employees,
      deactivate_reason,
      comment,
      notice_period_start_date,
    }: {
      employees: string[];
      deactivate_reason: string;
      comment: string;
      notice_period_start_date: string;
    }) =>
      EmployeeService.deactivateEmployee(
        employees,
        deactivate_reason,
        comment,
        notice_period_start_date,
      ),
    onError: (error) => {
      console.error("Error deactivating employee:", error);
    },
  });
};
