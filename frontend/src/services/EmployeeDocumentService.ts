import { DocumentItem, CreateEmployeeDocumentPayload } from "../types/employeeDocument";
import { FilterCondition } from "../types/frappe";
import FrappeAPI from "../utils/frappeAPI";


export const EmployeeDocumentService = {
  getDraftEmployeeDocument: async (
    employeeId: string,
    limit: number = 10,
    limitStart: number = 0,
    extraFilters: FilterCondition[] = []
  ): Promise<DocumentItem[]> => {
    const filters: FilterCondition[] = [
      ["employee", "=", employeeId],
      ...extraFilters,
    ];

    const response = await FrappeAPI.getDocumentList("Employee Documents", {
      fields: ["*"],
      filters,
      orderBy: "creation desc",
      limit,
      limitStart,
    });

    return response.data as DocumentItem[];
  },

  getEmployeeDocumentCount: async (
    employeeId: string,
    extraFilters: FilterCondition[] = []
  ): Promise<number> => {
    // Convert array filters to Record format for getDocumentCount
    // For "=" operator, use direct value; for others (e.g. "!="), use ["op", value]
    const countFilters: Record<string, unknown> = { employee: employeeId };
    for (const [field, op, value] of extraFilters) {
      countFilters[field] = op === "=" ? value : [op, value];
    }

    return FrappeAPI.getDocumentCount("Employee Documents", countFilters);
  },

  createEmployeeDocument: async (
    payload: CreateEmployeeDocumentPayload
  ): Promise<DocumentItem> => {
    const response = await FrappeAPI.createDocument(
      "Employee Documents",
      payload as unknown as Record<string, unknown>
    );
    return response as DocumentItem;
  },

  uploadDocumentFile: async (
    file: File,
    docName: string
  ): Promise<{ file_url: string; name: string }> => {
    return FrappeAPI.uploadFile(
      file,
      file.name,
      docName,
      "Employee Documents",
      undefined,
      "0"
    );
  },

  updateEmployeeDocumentFileName: async (
    name: string,
    file_name: string
  ): Promise<unknown> => {
    return FrappeAPI.updateDocument("Employee Documents", name, { file_name });
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
