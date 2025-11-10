import { useQuery } from "@tanstack/react-query";
import { EmployeeDocumentService } from "../services/EmployeeDocumentService";
import { DocumentApiResponse } from "../types/employeeDocument";

export const useEmployeeDocument = () => {
    return useQuery<DocumentApiResponse[]>({
      queryKey: ["employee-documents", "status"],
      queryFn: EmployeeDocumentService.getDraftEmployeeDocument,
    });
  };