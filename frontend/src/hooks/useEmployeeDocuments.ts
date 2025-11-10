import { useQuery } from "@tanstack/react-query";
import { EmployeeDocumentService } from "../services/EmployeeDocumentService";
import { DocumentItem } from "../types/employeeDocument";

export const useEmployeeDocument = () => {
    return useQuery<DocumentItem[]>({
      queryKey: ["employee-documents", "status"],
      queryFn: EmployeeDocumentService.getDraftEmployeeDocument,
    });
  };