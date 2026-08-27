import { useMutation, useQuery } from "@tanstack/react-query";
import { AcknowledgementRequiredService, EmployeeDocumentService } from "../services/EmployeeDocumentService";
import { FilterCondition } from "../types/frappe";

import { DocumentItem } from "../types/employeeDocument";

const PAGE_SIZE = 10;

export const useEmployeeDocument = (
  employeeId: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE,
  extraFilters: FilterCondition[] = []
) => {
  const limitStart = (page - 1) * pageSize;
  return useQuery<DocumentItem[]>({
    queryKey: ["employee-documents", employeeId, page, pageSize, extraFilters],
    queryFn: () =>
      EmployeeDocumentService.getDraftEmployeeDocument(employeeId, pageSize, limitStart, extraFilters),
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