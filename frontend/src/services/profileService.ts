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
  getAllEmployeeFields: async (employee_id: string): Promise<IField[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.employee_hierarchy.get_meta",
      {
        fields: ["*"],
        employee_id: employee_id,
        orderBy: "creation desc",
      }
    );
    return response as IField[];
  },
  getEmployeeDetailsByEmpId: async (
    employee_id: string
  ): Promise<Employee | null> => {
    try {
      const result = await FrappeAPI.getDocumentList("Employee", {
        fields: ["*"],
        filters: [["employee", "=", employee_id]],
      });
      // Handle different response structures

      return result?.data?.[0] as Employee;
    } catch (e) {
      throw new Error(
        `Some error occured while fetching employee details.- ${e}`
      );
    }
  },
};
