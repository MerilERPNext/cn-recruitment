import { DocumentApiResponse } from "../types/employeeDocument";
import FrappeAPI from "../utils/frappeAPI";

export const EmployeeDocumentService = {
  getDraftEmployeeDocument: async (): Promise<DocumentApiResponse[]> => {
    const response = await FrappeAPI.getDocumentList("Employee Documents", {
        fields: ["*"],
    });

    return response.data as DocumentApiResponse[];
  },
};