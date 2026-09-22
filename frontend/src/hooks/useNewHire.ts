import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNewHireFormConfig,
  createNewHire,
  getNewHiresList,
  getNewHireDetail,
  updateNewHire,
  initiateOnboarding,
  activateEmployee,
  getInitiationFields,
  saveInitiationFields,
  getOnboardingInitiationConfig,
  GetNewHireFormConfigParams,
  GetNewHiresListParams,
} from "../services/newHireService";
import type { SaveInitiationFieldsParams } from "../types/newHire";

export const NEW_HIRE_KEYS = {
  all: ["new-hire"] as const,
  config: (params?: GetNewHireFormConfigParams) =>
    [...NEW_HIRE_KEYS.all, "config", params] as const,
  list: (params?: GetNewHiresListParams) =>
    [...NEW_HIRE_KEYS.all, "list", params] as const,
  detail: (name?: string) =>
    [...NEW_HIRE_KEYS.all, "detail", name] as const,
  initiationFields: (form?: string) =>
    [...NEW_HIRE_KEYS.all, "initiation-fields", form] as const,
  onboardingConfig: (name?: string) =>
    [...NEW_HIRE_KEYS.all, "onboarding-config", name] as const,
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
 * Hook to fetch initiation fields configuration of a New Hire Form.
 */
export const useInitiationFields = (form?: string) => {
  return useQuery({
    queryKey: NEW_HIRE_KEYS.initiationFields(form),
    queryFn: () => getInitiationFields(form),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Hook to save initiation fields configuration.
 */
export const useSaveInitiationFieldsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveInitiationFieldsParams) =>
      saveInitiationFields(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: NEW_HIRE_KEYS.initiationFields(variables.form),
      });
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
    },
  });
};

/**
 * Hook to fetch onboarding initiation render config with prefilled values for a pending Employee.
 */
export const useOnboardingInitiationConfig = (name?: string) => {
  return useQuery({
    queryKey: NEW_HIRE_KEYS.onboardingConfig(name),
    queryFn: () => getOnboardingInitiationConfig(name!),
    enabled: Boolean(name),
    staleTime: 60 * 1000,
  });
};

/**
 * Hook to initiate onboarding for an approved pending employee.
 */
export const useInitiateOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: string | { name: string; payload?: Record<string, unknown> }) => {
      if (typeof args === "string") {
        return initiateOnboarding(args);
      }
      return initiateOnboarding(args.name, args.payload);
    },
    onSuccess: (_, variables) => {
      const name = typeof variables === "string" ? variables : variables.name;
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.detail(name) });
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.onboardingConfig(name) });
      queryClient.invalidateQueries({ queryKey: ["employee"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

/**
 * Activate an employee whose onboarding is initiated.
 */
export const useActivateEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => activateEmployee(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEW_HIRE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["employee"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

