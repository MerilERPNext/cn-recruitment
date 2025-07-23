
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { EmployeeService } from '../services/employeeService';
import { Employee, EmployeeIdCard, EmployeeListItem } from '../types/employee';

// Hook to get a single employee by ID
export const useEmployee = (employeeId: string | null): UseQueryResult<Employee, Error> => {
  return useQuery<Employee, Error>({
    queryKey: ['employee', employeeId],
    queryFn: () => EmployeeService.getEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
};

// Hook to get current logged-in user's employee record
export const useCurrentEmployee = (): UseQueryResult<Employee | null, Error> => {
  return useQuery<Employee | null, Error>({
    queryKey: ['currentEmployee'],
    queryFn: () => EmployeeService.getCurrentEmployee(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
};

// Hook to get current logged-in user's All Details
export const useCurrentEmployeeAllDetails = (
  user_id: string
) => {
  return useQuery<Employee | null, Error>({
    queryKey: ["currentEmployeeAllDetails", user_id],
    queryFn: () => EmployeeService.getCurrentEmployeeAllDetails(user_id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 1,
    enabled: !!user_id
  })
}

// Hook to search employees by name
export const useEmployeeSearch = (searchTerm: string): UseQueryResult<EmployeeListItem[], Error> => {
  return useQuery<EmployeeListItem[], Error>({
    queryKey: ['employeeSearch', searchTerm],
    queryFn: () => EmployeeService.searchEmployees(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 2 * 60 * 1000, // 2 minutes (renamed from cacheTime in v5)
  });
};

// Hook to get employee data transformed for ID card
export const useEmployeeIdCard = (employeeId: string | null): UseQueryResult<EmployeeIdCard | null, Error> => {
  return useQuery<EmployeeIdCard | null, Error>({
    queryKey: ['employeeIdCard', employeeId],
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
export const useCurrentEmployeeIdCard = (...args: unknown[]): UseQueryResult<EmployeeIdCard | null, Error> => {
  return useQuery<EmployeeIdCard | null, Error>({
    queryKey: ['currentEmployeeIdCard'],
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