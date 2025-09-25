/* eslint-disable @typescript-eslint/no-explicit-any */
import { Employee } from "../types/employee";
import { GenderResponse, IField } from "../types/profile";
import FrappeAPI from "../utils/frappeAPI";

export const profileService = {
  getGenders: async (): Promise<GenderResponse> => {
    try {
      console.log("Fetching genders list");

      const result = (await FrappeAPI.getDocumentList("Gender", {
        fields: ["name"],
        limit: 1000,
      })) as GenderResponse;

      return result;
    } catch (error) {
      console.error("Failed to fetch genders:", error);
      throw error;
    }
  },

  getEmployeeFieldPermissions: async ({
    docname,
    doctype,
    include_breaks,
    all_fields,
    include_values,
    detailed,
  }: {
    doctype: string;
    docname?: string;
    include_breaks?: number;
    all_fields?: number;
    detailed?: number;
    include_values?: number;
  }): Promise<IField[]> => {
    const response = await FrappeAPI.callMethod(
      "nextai.api.doctype_meta.get_fields",
      {
        fields: ["*"],
        doctype: doctype,
        docname: docname,
        include_breaks: include_breaks,
        all_fields: all_fields,
        detailed: detailed,
        include_values: include_values,
        orderBy: "creation desc",
      }
    );
    return response as IField[];
  },
  getEmployeeDetailsByEmpId: async (
    employee_id: string
  ): Promise<Employee | null> => {
    try {
      const result = await FrappeAPI.getDocument("Employee", employee_id);
      // Handle different response structures

      return result as Employee;
    } catch (e) {
      throw new Error(
        `Some error occured while fetching employee details.- ${e}`
      );
    }
  },
};
