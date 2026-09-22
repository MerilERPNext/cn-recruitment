import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNewHireFormConfig,
  createNewHire,
  getNewHiresList,
  getNewHireDetail,
  updateNewHire,
  initiateOnboarding,
  activateEmployee,
  GetNewHireFormConfigParams,
  GetNewHiresListParams,
} from "../services/newHireService";

export const NEW_HIRE_KEYS = {
  all: ["new-hire"] as const,
  config: (params?: GetNewHireFormConfigParams) =>
    [...NEW_HIRE_KEYS.all, "config", params] as const,
  list: (params?: GetNewHiresListParams) =>
    [...NEW_HIRE_KEYS.all, "list", params] as const,
  detail: (name?: string) =>
    [...NEW_HIRE_KEYS.all, "detail", name] as const,
};

/**
 * Hook to fetch the New Hire intake form configuration.
 */
export const useNewHireFormConfig = (params?: GetNewHireFormConfigParams) => {
  return useQuery({
    queryKey: NEW_HIRE_KEYS.config(params),
    queryFn: () => getNewHireFormConfig(params),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Hook to create a new hire employee.
 */
export const useCreateNewHireMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      form,
      submit = 1,
    }: {
      payload: Record<string, unknown>;
      form?: string;
      submit?: number;
    }) => createNewHire(payload, form, submit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["employee"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

/**
 * Hook to fetch the paginated list of pending new hires.
 */
export const useNewHiresList = (params?: GetNewHiresListParams) => {
  return useQuery({
    queryKey: NEW_HIRE_KEYS.list(params),
    queryFn: () => getNewHiresList(params),
    staleTime: 60 * 1000,
  });
};

/**
 * Hook to fetch single pending new hire by name.
 */
export const useNewHireDetail = (name?: string) => {
  return useQuery({
    queryKey: NEW_HIRE_KEYS.detail(name),
    queryFn: () => getNewHireDetail(name!),
    enabled: Boolean(name),
  });
};

/**
 * Hook to update a pending new hire record.
 */
export const useUpdateNewHireMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      payload,
      submit = 0,
    }: {
      name: string;
      payload: Record<string, unknown>;
      submit?: number;
    }) => updateNewHire(name, payload, submit),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.detail(variables.name) });
    },
  });
};

/**
 * Hook to initiate onboarding for an approved pending employee.
 */
export const useInitiateOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => initiateOnboarding(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.detail(name) });
    },
  });
};

/**
 * Hook to activate a pending employee, with the company email HR enters.
 */
export const useActivateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, companyEmail }: { name: string; companyEmail: string }) =>
      activateEmployee(name, companyEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["employee"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};
