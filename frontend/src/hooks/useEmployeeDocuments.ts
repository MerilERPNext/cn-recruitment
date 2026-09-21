import { useMutation, useQuery } from "@tanstack/react-query";
import { AcknowledgementRequiredService, EmployeeDocumentService } from "../services/EmployeeDocumentService";
import { FilterCondition } from "../types/frappe";

import { DocumentItem, CreateEmployeeDocumentPayload } from "../types/employeeDocument";

const PAGE_SIZE = 10;

export const useEmployeeDocument = (
  employeeId: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE,
  extraFilters: FilterCondition[] = [],
  enabled: boolean = true
) => {
  const limitStart = (page - 1) * pageSize;
  return useQuery<DocumentItem[]>({
    queryKey: ["employee-documents", employeeId, page, pageSize, extraFilters],
    queryFn: () =>
      EmployeeDocumentService.getDraftEmployeeDocument(employeeId, pageSize, limitStart, extraFilters),
    enabled: Boolean(employeeId) && enabled,
  });
};

export const useEmployeeDocumentCount = (
  employeeId: string,
  extraFilters: FilterCondition[] = []
) => {
  return useQuery<number>({
    queryKey: ["employee-documents-count", employeeId, extraFilters],
    queryFn: () =>
      EmployeeDocumentService.getEmployeeDocumentCount(employeeId, extraFilters),
  });
};


export const useSubmitAcknowledgement = () => {
  return useMutation({
    mutationFn: (documentId: string) =>
      AcknowledgementRequiredService.submitAcknowledgement(documentId),
  });
};

export const useCreateEmployeeDocument = () => {
  return useMutation({
    mutationFn: (payload: CreateEmployeeDocumentPayload) =>
      EmployeeDocumentService.createEmployeeDocument(payload),
  });
};