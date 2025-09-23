import {
  useQuery,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { frappeService } from "../services/frappeService";
import { PermissionError } from "../types/frappe";
import type {
  DoctypeSchema,
  GetDocumentsParams,
  FrappePageResponse,
  FrappeDocumentsResponse,
  GetCountParams,
  CreateDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  CreateDocumentResult,
  UpdateDocumentResult,
  DeleteDocumentResult,
} from "../types/frappe";

// Utility to check if error is permission-related
const isPermissionError = (error: unknown): error is PermissionError => {
  if (error instanceof PermissionError) {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    );
  }
  return false;
};

// Default retry function that doesn't retry permission errors
const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) {
    return false;
  }
  return failureCount < 3;
};

// Hook for fetching doctype schema
export const useDoctypeSchema = (
  doctype: string,
  options?: Omit<UseQueryOptions<DoctypeSchema>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["doctype-schema", doctype],
    queryFn: () => frappeService.getDoctypeSchema(doctype),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// Hook for infinite query
export const useFrappeInfiniteQuery = (
  params: Omit<GetDocumentsParams, "pageParam">,
  options?: Omit<
    UseInfiniteQueryOptions<FrappePageResponse>,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >
) => {
  return useInfiniteQuery({
    queryKey: [
      "documents-infinite",
      params.doctype,
      params.searchTerm,
      params.filters,
      params.fields,
    ],
    queryFn: ({ pageParam = 0 }) =>
      frappeService.getDocumentsPage({
        ...params,
        pageParam: pageParam as number,
      }),
    getNextPageParam: (lastPage: FrappePageResponse) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// Hook for calling a method
export const useFrappeMethodInfiniteQuery = (
  method: string,
  params: Record<string, unknown>,
  options?: Omit<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    UseInfiniteQueryOptions<any>,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >
) => {
  return useInfiniteQuery({
    queryKey: ["method", method, params],
    queryFn: ({ pageParam = 0 }) =>
      frappeService.callMethod(method, {
        ...params,
        pageParam: pageParam as number,
      }),
    getNextPageParam: (lastPage: unknown) => lastPage,
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// Hook for paginated query
export const useFrappeDocuments = (
  params: GetDocumentsParams,
  options?: Omit<
    UseQueryOptions<FrappeDocumentsResponse>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: [
      "documents",
      params.doctype,
      params.pageParam,
      params.searchTerm,
      params.filters,
      params.fields,
    ],
    queryFn: () => frappeService.getDocumentsPage(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// Hook for calling a method
export const useFrappeMethodMutation = (
  method: string,
  options?: Omit<
    UseMutationOptions<unknown, unknown, Record<string, unknown>>,
    "mutationFn"
  >
) => {
  return useMutation<unknown, unknown, Record<string, unknown>>({
    mutationKey: ["method", method],
    mutationFn: (params: Record<string, unknown>) =>
      frappeService.callMethod(method, params),
    ...options,
  });
};

// Hook for fetching a single document
export const useFrappeDocument = (
  doctype: string,
  name: string,
  fields?: string[]
) => {
  return useQuery({
    queryKey: ["document", doctype, name, fields],
    queryFn: () => frappeService.getDocument(doctype, name, fields),
  });
};

// Hook for document count
export const useFrappeDocumentCount = (
  params: GetCountParams,
  options?: Omit<UseQueryOptions<number>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["document-count", params.doctype, params.filters],
    queryFn: () => frappeService.getDocumentCount(params),
    staleTime: 2 * 60 * 1000,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// Export utility function
export { isPermissionError };

// Mutation hook for creating a document
export const useCreateFrappeDocument = (
  options?: UseMutationOptions<
    CreateDocumentResult,
    unknown,
    CreateDocumentParams
  >
) => {
  return useMutation<CreateDocumentResult, unknown, CreateDocumentParams>({
    mutationFn: ({ doctype, data }) =>
      frappeService.createDocument(doctype, data),
    ...options,
  });
};

// Mutation hook for updating a document
export const useUpdateFrappeDocument = (
  options?: UseMutationOptions<
    UpdateDocumentResult,
    unknown,
    UpdateDocumentParams
  >
) => {
  return useMutation<UpdateDocumentResult, unknown, UpdateDocumentParams>({
    mutationFn: ({ doctype, name, data }) =>
      frappeService.updateDocument(doctype, name, data),
    ...options,
  });
};

// Mutation hook for deleting a document
export const useDeleteFrappeDocument = (
  options?: UseMutationOptions<
    DeleteDocumentResult,
    unknown,
    DeleteDocumentParams
  >
) => {
  return useMutation<DeleteDocumentResult, unknown, DeleteDocumentParams>({
    mutationFn: ({ doctype, name }) =>
      frappeService.deleteDocument(doctype, name),
    ...options,
  });
};
