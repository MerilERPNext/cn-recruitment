/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { expenseService } from "../services/expenseService";
import { FilterCondition } from "../types/frappe";

export const useExpenseTypes = (filters?: FilterCondition[],): UseQueryResult<any, Error> => {
    return useQuery<any, Error>({
        queryKey: ["expense",filters],
        queryFn: () => expenseService.getExpensesTypes(filters ?? []),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    });
};

export const useExpenseTravelPolicies = (): UseQueryResult<any, Error> => {
    return useQuery<any, Error>({
        queryKey: ["expenseTravelPolicies"],
        queryFn: () => expenseService.getExpenseTravelPolicies(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    });
};

export const useDailyAllowancesVehicleCategories = (): UseQueryResult<any, Error> => {
    return useQuery<any, Error>({
        queryKey: ["DailyAllowancesVehicleCategories"],
        queryFn: () => expenseService.getDailyAllowancesVehicleTypes(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    });
}

export const  useExpensePolicies = (employee_id: string): UseQueryResult<any, Error> => {
    return useQuery<any, Error>({
        queryKey: ["expensePolicies", employee_id],
        queryFn: () => expenseService.getExpensePolicies(employee_id),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
        enabled: !!employee_id
    });
}

export const useExpenseClaim = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["employee-expense-claim", ],
    queryFn: () => expenseService.getExpenseClaims(filters),
    staleTime: 5 * 60 * 1000,
  });
};

