import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { EmployeeService } from "../services/employeeService";
import { Employee, EmployeeIdCard, EmployeeListItem, EmployeeNode } from "../types/employee";
import { profileService } from "../services/profileService";
import { AddressInfoData } from "../types/profile";
import toast from "react-hot-toast";

// Hook to get a single employee by ID
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
      if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
        console.warn("useCurrentEmployeeAllDetails: Invalid user_id provided:", user_id);
        return null;
      }
      return EmployeeService.getCurrentEmployeeAllDetails(user_id);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2, // Increased retry count
    enabled: !!user_id && typeof user_id === 'string' && user_id.trim() !== '',
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

export const useGetEmployeeHierarchy = (
  company: string,
) => {
  return useQuery<EmployeeNode>({
    queryKey: ["Employee-hierarchy", company],
    queryFn: () => {
      return EmployeeService.getEmployeeHierarchy(company);
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
export const useGetAllEmployees = () => {
  return useQuery({
    queryKey: ["all-employees-list"],
    queryFn: () => EmployeeService.getAllEmployees(),
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
