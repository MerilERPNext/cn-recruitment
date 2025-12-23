/* eslint-disable @typescript-eslint/no-explicit-any */
import { Employee, IDesignationHierarchy, IGetEmpDesignationHierarchyCurrentDetails, Award } from "../types/employee";
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
        doctype: doctype,
        docname: docname,
        include_breaks: include_breaks,
        all_fields: all_fields,
        detailed: detailed,
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
  getEmployeeAppreciations: async (): Promise<Award[] | null> => {
    try {
      const result = await FrappeAPI.getDocumentList("Award", {
        fields: ["*"],
      });

      return (result?.data as unknown as Award[]) || [];
    } catch (e) {
      throw new Error(
        `Some error occured while fetching employee awards.- ${e}`
      );
    }
  },

  getShowAttendanceAssignmentButton: async (
    empId: string,
    currentUser: string
  ): Promise<boolean> => {
    try {
      const res = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.custom_apis.show_attedance_assignment_button",
        {
          employee: empId,
          user: currentUser,
        }
      );
      return res as boolean;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  getDesignationHierarchy: async (
    company: string,
    department: string,
    designation: string
  ): Promise<IDesignationHierarchy> => {
    try {
      const res = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.get_designation_hierarchy_options",
        {
          company: company,
          department: department,
          designation: designation,
        }
      );
      return res as IDesignationHierarchy;
    } catch (error) {
      console.error("📡 Error while fetching designation hierarchy:", error);
      throw error;
    }
  },
  getEmpDesignationHierarchyCurrentDetails: async (
    employee: string
  ): Promise<IGetEmpDesignationHierarchyCurrentDetails> => {
    try {
      const res = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.get_employee_current_details",
        {
          employee: employee,
        }
      );
      return res as IGetEmpDesignationHierarchyCurrentDetails;
    } catch (error) {
      console.error("📡 Error while fetching designation hierarchy:", error);
      throw error;
    }
  },
  addEmployeeHistory: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.update_employee_designation",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while clocking in:", error);
      throw error;
    }
  },
  addEmployeeReportingDetails: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.update_employee_reporting",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while clocking in:", error);
      throw error;
    }
  },


  getEmployeeReportingDetails: async (
    employee: string
  ): Promise<any> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.get_employee_reporting_details",
        {
          employee: employee,
        }
      );
      return response as any;
    } catch (error) {
      console.error("📡 Error while fetching reporting details:", error);
      throw error;
    }
  },

  getEmployeeHierarchyHistory: async (
    employee: string
  ): Promise<any> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.get_employee_hierarchy_history",
        {
          employee: employee,
        }
      );
      return response as any;
    } catch (error) {
      console.error("📡 Error while fetching hierarchy history:", error);
      throw error;
    }
  },


  uploadFile: async (
    file: File,
    doctype?: string,
    docName?: string
  ): Promise<{ file_url: string;[key: string]: any }> => {
    try {
      const result = await FrappeAPI.uploadFile(file, "", docName, doctype);
      return result;
    } catch (error) {
      console.error("Failed to upload file:", error);
      throw error;
    }
  },
};
