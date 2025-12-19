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

// services/acknowledgementRequired.service.ts
export const AcknowledgementRequiredService = {
  submitAcknowledgement: async (document_id: string) => {
    const response = await FrappeAPI.callMethod(
      "nextai.nextai.doctype.employee_documents.employee_documents.set_acknwolegement",
      {
        empdoc_id: document_id, // 👈 single id
      }
    );

    return response;
  },
};
