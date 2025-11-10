import { DocumentItem } from "../types/employeeDocument";
import FrappeAPI from "../utils/frappeAPI";

export const EmployeeDocumentService = {
  getDraftEmployeeDocument: async (): Promise<DocumentItem[]> => {
    const response = await FrappeAPI.getDocumentList("Employee Documents", {
        fields: ["*"],
    });

    return response.data as DocumentItem[];
  },
};