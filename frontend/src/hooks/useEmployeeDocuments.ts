import { useMutation, useQuery } from "@tanstack/react-query";
import { AcknowledgementRequiredService, EmployeeDocumentService } from "../services/EmployeeDocumentService";
import { DocumentItem } from "../types/employeeDocument";

export const useEmployeeDocument = (employeeId: string) => {
    return useQuery<DocumentItem[]>({
      queryKey: ["employee-documents", employeeId],
      queryFn: () => EmployeeDocumentService.getDraftEmployeeDocument(employeeId),
    });
  };


export const useSubmitAcknowledgement = () => {
  return useMutation({
    mutationFn: (documentId: string) =>
      AcknowledgementRequiredService.submitAcknowledgement(documentId),
  });
};