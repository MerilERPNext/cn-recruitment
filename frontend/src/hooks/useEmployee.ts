import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { EmployeeService } from "../services/employeeService";
import {
  Employee,
  EmployeeIdCard,
  EmployeeListItem,
  EmployeeNode,
} from "../types/employee";
import { profileService } from "../services/profileService";
import { AddressInfoData } from "../types/profile";
import toast from "react-hot-toast";
import { FilterCondition } from "../types/frappe";
import commonSerivce from "../services/commonSerivce";

// Hook to get a single employee by ID
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
};
export const useEmployees = (
  fields?: string[],
  filters?: FilterCondition[],
  orFilters?: FilterCondition[]
): UseQueryResult<Employee[], Error> => {
  return useQuery<Employee[], Error>({
    queryKey: ["employee", "all", filters, orFilters],
    queryFn: () => EmployeeService.getAllEmployees(fields, filters, orFilters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useEmployee = (
  employeeId: string | null
): UseQueryResult<Employee, Error> => {
  return useQuery<Employee, Error>({
    queryKey: ["employee", employeeId],
    queryFn: () => EmployeeService.getEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Hook to get current logged-in user's employee record
export const useCurrentEmployee = (): UseQueryResult<
  Employee | null,
  Error
> => {
  return useQuery<Employee | null, Error>({
    queryKey: ["currentEmployee"],
    queryFn: () => EmployeeService.getCurrentEmployee(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
};

// Hook to get current logged-in user's All Details
export const useCurrentEmployeeAllDetails = (user_id: string) => {
  return useQuery<Employee | null, Error>({
    queryKey: ["currentEmployeeAllDetails", user_id],
    queryFn: async () => {
      if (!user_id || typeof user_id !== "string" || user_id.trim() === "") {
        console.warn(
          "useCurrentEmployeeAllDetails: Invalid user_id provided:",
          user_id
        );
        return null;
      }
      return EmployeeService.getCurrentEmployeeAllDetails(user_id);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2, // Increased retry count
    enabled: !!user_id && typeof user_id === "string" && user_id.trim() !== "",
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
      mutationFn: (employeeDetails: unknown) =>
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
  searchTerm: string
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
  employeeId: string | null
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
  ...args: unknown[]
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
    ...args,
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
  orFilters?: FilterCondition[]
): UseQueryResult<Employee[], Error> => {
  return useQuery<Employee[], Error>({
    queryKey: ["all-employees-list", fields, filters, orFilters],
    queryFn: () => EmployeeService.getAllEmployees(fields, filters, orFilters, limit),
    // staleTime: 1000 * 60 * 5,
  });
};

export const useGetAllReasons = (requestType: string) => {
  return useQuery({
    queryKey: ["all-reasons-list", "Attendance Request"],
    queryFn: () => {
      return EmployeeService.getAllReasons([
        // We might need to change it to a dynamic value but currently we are hard coding it.
        ["reference_doctype", "=", "Attendance Request"],
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
export const useGetEmployeeDetailsByEmpId = (employee_id: string) => {
  return useQuery({
    queryKey: ["all-emp-details-by-empid", employee_id],
    queryFn: () => profileService.getEmployeeDetailsByEmpId(employee_id),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useShowAttendanaceAssignmentButton = (
  employee_id: string,
  currentUser: string
) => {
  return useQuery({
    queryKey: ["attendance-assignment-button-visibility", employee_id],
    queryFn: () =>
      profileService.getShowAttendanceAssignmentButton(
        employee_id,
        currentUser
      ),
    staleTime: 1000 * 60 * 5,
    enabled: !!employee_id,
  });
};
export const useGetDesignationHierarchy = (
  company: string,
  department: string,
  designation: string,
  isEdit: boolean
) => {
  return useQuery({
    queryKey: ["designation-hierarchy", company, department, designation],
    queryFn: () =>
      profileService.getDesignationHierarchy(
        company,
        department,
        designation
      ),
    staleTime: 1000 * 60 * 5,
    enabled: !!company && !isEdit,
  });
};

export const useGetEmpDesignationHierarchyCurrentDetails = (employee: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["designation-hierarchy", employee],
    queryFn: () => profileService.getEmpDesignationHierarchyCurrentDetails(employee),
    staleTime: 1000 * 60 * 5,
    enabled: enabled
  });
};

export const useAddEmployeeHistoryMutation = () => {
  return useMutation({
    mutationKey: ["addEmployeeHistory"],
    mutationFn: (body: Record<string, unknown>) => profileService.addEmployeeHistory(body),
    onError: (error) => {
      console.error("Error adding employee history:", error);
    },
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
    mutationFn: (employee_id: string) => commonSerivce.getHoverData("Employee", employee_id),
    onError: (error) => {
      console.error("Error fetching employee hover data:", error);
    },
  });
};
