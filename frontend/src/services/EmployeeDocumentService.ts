import { DocumentItem } from "../types/employeeDocument";
import FrappeAPI from "../utils/frappeAPI";

export const EmployeeDocumentService = {
  getDraftEmployeeDocument: async (employeeId: string): Promise<DocumentItem[]> => {
    const response = await FrappeAPI.getDocumentList("Employee Documents", {
      fields: ["*"],
      filters: [["employee", "=", employeeId]],
      orderBy: "creation desc"
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
        empdoc_id: document_id,
      }
    );

    return response;
  },
};
