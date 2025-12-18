import { useMutation, useQuery } from "@tanstack/react-query";
import { AcknowledgementRequiredService, EmployeeDocumentService } from "../services/EmployeeDocumentService";
import { DocumentItem } from "../types/employeeDocument";

export const useEmployeeDocument = () => {
    return useQuery<DocumentItem[]>({
      queryKey: ["employee-documents", "status"],
      queryFn: EmployeeDocumentService.getDraftEmployeeDocument,
    });
  };


export const useSubmitAcknowledgement = () => {
  return useMutation({
    mutationFn: (documentId: string) =>
      AcknowledgementRequiredService.submitAcknowledgement(documentId),
  });
};