import { FrappeAPI } from "../utils/frappeAPI";
import {
  Employee,
  EmployeeIdCard,
  EmployeeListItem,
  EmployeeNode,
  IReason,
  AttendanceFieldPermissions,
  EmployeeIdCardResponse,
} from "../types/employee";
import { FilterCondition } from "../types/frappe";
import {
  debugEmployeeData,
  validateEmployeeFields,
} from "../utils/employeeDebug";
import logger from "../utils/logger";

function hasRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown,
  requiredProps: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== "object") return false;

  const objRecord = obj as Record<string, unknown>;

  return requiredProps.every(
    (prop) => prop in objRecord && objRecord[prop as string] !== undefined
  );
}

// Type guards for runtime validation
function isEmployee(obj: unknown): obj is Employee {
  if (!obj || typeof obj !== "object") {
    console.warn(
      "isEmployee validation failed: object is null, undefined, or not an object"
    );
    return false;
  }

  const employee = obj as Record<string, unknown>;

  const requiredFields = ["name", "employee_name"];
  for (const field of requiredFields) {
    if (!(field in employee)) {
      console.warn(`isEmployee validation failed: missing field '${field}'`);
      return false;
    }
    if (typeof employee[field] !== "string") {
      console.warn(
        `isEmployee validation failed: field '${field}' is not a string, got ${typeof employee[
        field
        ]}`
      );
      return false;
    }
    if (!employee[field]) {
      console.warn(`isEmployee validation failed: field '${field}' is empty`);
      return false;
    }
  }

  if (
    employee.status &&
    !["Active", "Inactive", "Suspended", "Left"].includes(
      employee.status as string
    )
  ) {
    console.warn(
      `isEmployee validation failed: invalid status '${employee.status}'`
    );
    return false;
  }

  return true;
}

function isEmployeeListItem(obj: unknown): obj is EmployeeListItem {
  if (!hasRequiredProperties(obj, ["name", "employee_name", "status"])) {
    return false;
  }

  const item = obj as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    typeof item.employee_name === "string" &&
    typeof item.status === "string"
  );
}

function isEmployeeListItemArray(obj: unknown): obj is EmployeeListItem[] {
  return (
    Array.isArray(obj) && obj.every((item: unknown) => isEmployeeListItem(item))
  );
}

// Employee API service
// Mock employee data for fallback scenarios

export class EmployeeService {
  // Get a single employee by ID/name
  static async getEmployee(employeeId: string): Promise<Employee | EmployeeIdCardResponse> {
    try {

      let result;

      // Try the primary API method first
      try {
        result = await FrappeAPI.callMethod(
          "recruitment.api.get_employee_details",
          {
            employee_id: employeeId,
          }
        );
      } catch (primaryError) {
        console.warn(
          "Primary API method failed, trying fallback:",
          primaryError
        );

        // Fallback: Try to get employee directly from doctype
        try {
          result = await FrappeAPI.getDocument("Employee", employeeId);
        } catch (fallbackError) {
          console.error("Fallback API method also failed:", fallbackError);
          throw new Error(
            `No employee found with ID: ${employeeId}. Please verify the employee ID is correct.`
          );
        }
      }

      // Handle undefined/null responses
      if (result === undefined || result === null) {
        console.error(
          "API returned undefined/null for employee ID:",
          employeeId
        );
        throw new Error(
          `No employee data found for ID: ${employeeId}. The employee may not exist.`
        );
      }

      if (!isEmployee(result)) {
        console.error("Employee validation failed for data:", result);
        console.error("Data type:", typeof result);
        console.error("Data content:", JSON.stringify(result));
        throw new Error(
          `Invalid employee data structure received for ID: ${employeeId}`
        );
      }

      return result;
    } catch (error) {
      console.error("Error fetching employee:", error);
      // Re-throw with user-friendly message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        `Failed to fetch employee details for ID: ${employeeId}. Please try again or contact support.`
      );
    }
  }

  // Search employees by name
  static async searchEmployees(
    searchTerm: string
  ): Promise<EmployeeListItem[]> {
    const result = await FrappeAPI.callMethod(
      "recruitment.api.search_employees",
      {
        search_term: searchTerm,
      }
    );

    if (!isEmployeeListItemArray(result)) {
      throw new Error("Invalid employee list data received from API");
    }

    return result;
  }

  static async getEmployeeHierarchy(company: string): Promise<EmployeeNode[]> {
    const result = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.employee_hierarchy.get_employee_hierarchy",
      {
        company: company,
      }
    );
    return result as EmployeeNode[];
  }

  static async getEmployeeSubordinateHierarchy(
    employee: string
  ): Promise<EmployeeNode[]> {
    const result = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.employee_hierarchy.get_employee_subordinates",
      { employee: employee }
    );
    return result as EmployeeNode[];
  }
  static async getEmployeeReportees(): Promise<Employee[]> {
    const result = await FrappeAPI.getMethod(
      "cn_leave_shift_managment.api.get_reportees"
    );
    return result as Employee[];
  }

  // Get current user's employee record
  static async getCurrentEmployee(): Promise<Employee | EmployeeIdCardResponse | null> {
    try {
      let result;

      // Try the primary API method first
      try {
        result = await FrappeAPI.callMethod(
          "recruitment.api.get_current_employee"
        );
      } catch (primaryError) {
        console.warn(
          "Primary API method failed, trying fallback:",
          primaryError
        );

        // Fallback: Try to get employee by current user
        try {
          const userResult = await FrappeAPI.callMethod(
            "frappe.auth.get_logged_user"
          );
          if (userResult && typeof userResult === "string") {
            const employeeList = await FrappeAPI.getDocumentList("Employee", {
              fields: ["*"],
              filters: [["user_id", "=", userResult]],
              limit: 1,
            });

            if (employeeList.data && employeeList.data.length > 0) {
              result = employeeList.data[0];
            } else {
              return null;
            }
          }
        } catch (fallbackError) {
          console.error("Fallback API method also failed:", fallbackError);
          throw primaryError; // Throw the original error
        }
      }

      // Handle undefined/null responses
      if (result === undefined || result === null) {
        console.warn(
          "API returned undefined/null for current employee. User may not have an employee record."
        );
        return null;
      }

      if (!isEmployee(result)) {
        console.error("Current employee validation failed for data:", result);
        console.error("Data type:", typeof result);
        console.error("Data content:", JSON.stringify(result));
        return null;
      }

      console.log("Current employee data validated successfully:", result);
      return result;
    } catch (error) {
      console.error("Error fetching current employee:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : error
      );

      throw error;
    }
  }
  static async getCurrentEmployeeAllDetails(
    user_id: string,
    name?: string,
  ): Promise<Employee | null> {
    try {
      logger.info("Fetching employee details for user_id", { user_id });

      const result = await FrappeAPI.getDocumentList("Employee", {
        fields: ["*"],
        filters: name ? [["name", "=", name]] : [["user_id", "=", user_id]],
      });

      // Debug the API response
      debugEmployeeData(
        result,
        `getCurrentEmployeeAllDetails API response for user_id: ${user_id}`
      );

      // Handle different response structures
      let employeeDataArray: unknown[] = [];

      if (result && "data" in result && Array.isArray(result.data)) {
        // Standard Frappe API response structure
        employeeDataArray = result.data;
      } else if (Array.isArray(result)) {
        // Direct array response
        employeeDataArray = result;
      } else if (result && typeof result === "object") {
        // Single object response
        employeeDataArray = [result];
      } else {
        logger.warn("Unexpected API response structure", {
          user_id,
          resultExists: !!result,
          resultType: typeof result,
          hasDataProperty: result && "data" in result,
          dataIsArray:
            result &&
            typeof result === "object" &&
            "data" in result &&
            Array.isArray((result as { data?: unknown }).data),
        });
        return null;
      }

      // Check if any employee records were found
      if (employeeDataArray.length === 0) {
        logger.warn("No employee found for user_id", { user_id });
        return null;
      }

      const employeeData = employeeDataArray[0];

      // Debug employee data validation
      const validation = validateEmployeeFields(employeeData);
      logger.debug("Employee validation result", validation);

      // Validate the employee data
      if (!isEmployee(employeeData)) {
        logger.employeeError(
          "getCurrentEmployeeAllDetails validation failed",
          user_id,
          new Error("Invalid employee data structure"),
          {
            missingFields: validation.missingFields,
            invalidFields: validation.invalidFields,
            receivedData: employeeData,
          }
        );

        // Try to provide helpful suggestions
        if (
          validation.missingFields.includes("name") &&
          employeeData &&
          typeof employeeData === "object"
        ) {
          const emp = employeeData as Record<string, unknown>;
          logger.debug("Potential name fields found", {
            user_id,
            potentialFields: Object.keys(emp)
              .filter(
                (key) =>
                  key.toLowerCase().includes("name") ||
                  key.toLowerCase().includes("id")
              )
              .map((key) => ({ key, value: emp[key] })),
          });
        }

        return null;
      }

      logger.info("Employee data validated successfully", { user_id });
      return employeeData;
    } catch (error) {
      logger.employeeError("getCurrentEmployeeAllDetails", user_id, error);
      return null;
    }
  }
  static async getCurrentEmployeeAllDetailsWithParams(
    filters: FilterCondition[]
  ): Promise<Employee | null> {
    try {
      logger.info("Fetching employee details for filters", { filters });

      const result = await FrappeAPI.getDocumentList("Employee", {
        fields: ["*"],
        filters: filters,
      });

      // Debug the API response
      debugEmployeeData(
        result,
        `getCurrentEmployeeAllDetails API response for filters: ${filters}`
      );

      // Handle different response structures
      let employeeDataArray: unknown[] = [];

      if (result && "data" in result && Array.isArray(result.data)) {
        // Standard Frappe API response structure
        employeeDataArray = result.data;
      } else if (Array.isArray(result)) {
        // Direct array response
        employeeDataArray = result;
      } else if (result && typeof result === "object") {
        // Single object response
        employeeDataArray = [result];
      } else {
        logger.warn("Unexpected API response structure", {
          resultExists: !!result,
          resultType: typeof result,
          hasDataProperty: result && "data" in result,
          dataIsArray:
            result &&
            typeof result === "object" &&
            "data" in result &&
            Array.isArray((result as { data?: unknown }).data),
        });
        return null;
      }

      // Check if any employee records were found
      if (employeeDataArray.length === 0) {
        logger.warn("No employee found for user_id");
        return null;
      }

      const employeeData = employeeDataArray[0];

      // Debug employee data validation
      const validation = validateEmployeeFields(employeeData);
      logger.debug("Employee validation result", validation);

      // Validate the employee data
      if (!isEmployee(employeeData)) {
        logger.error(
          "getCurrentEmployeeAllDetails validation failed",
          {
            missingFields: validation.missingFields,
            invalidFields: validation.invalidFields,
            receivedData: employeeData,
          }
        );

        // Try to provide helpful suggestions
        if (
          validation.missingFields.includes("name") &&
          employeeData &&
          typeof employeeData === "object"
        ) {
          const emp = employeeData as Record<string, unknown>;
          logger.debug("Potential name fields found", {
            potentialFields: Object.keys(emp)
              .filter(
                (key) =>
                  key.toLowerCase().includes("name") ||
                  key.toLowerCase().includes("id")
              )
              .map((key) => ({ key, value: emp[key] })),
          });
        }

        return null;
      }

      logger.info("Employee data validated successfully");
      return employeeData;
    } catch (error) {
      logger.error("getCurrentEmployeeAllDetails", error);
      return null;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getCurrentEmployeeAddress(user_id: string): Promise<any> {
    try {
      const result = await FrappeAPI.callMethod(
        "recruitment.payroll_api.address_details",
        {
          user_id: user_id,
        }
      );

      return result;
    } catch (error) {
      console.error("Error fetching current employee:", error);
      return null;
    }
  }

  static async updateCurrentEmployeeProfile(
    employeeDetails: unknown
  ): Promise<unknown> {
    try {
      const result = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.profile_change_request.save_profile_change",
        { data: employeeDetails }
      );
      return result;
    } catch (error) {
      console.error("Error updating current employee profile:", error);
      throw error;
    }
  }

  // Transform Employee data to EmployeeIdCard format
  static transformToIdCard(employee: Employee | EmployeeIdCardResponse): EmployeeIdCard {
    try {
      return {
        id: employee.name || "Unknown",
        name: employee.employee_name || employee.first_name || "Unknown",
        employee_name:
          employee.employee_name || employee.first_name || "Unknown",
        department: ('department_name' in employee && employee.department_name) || employee.department || "Not Specified",
        designation: ('designation_name' in employee && employee.designation_name) || employee.designation || "Not Specified",
        location: ('branch_name' in employee && employee.branch_name) || employee.branch || employee.company || "Not Specified",
        startDate: employee.date_of_joining || "Not Available",
        avatar: employee.image || undefined, // Don't set default here, let the component handle it
        status: employee.status || "Active",
        company: ('company_name' in employee && employee.company_name) || employee.company || "Not Specified",
        employee_number: employee.employee_number || employee.name || "N/A",
        contact: employee.cell_number || undefined,
        email:
          employee.prefered_email ||
          employee.company_email ||
          employee.personal_email ||
          undefined,
      };
    } catch (error) {
      console.error("Error transforming employee data:", error, employee);
      throw new Error("Failed to transform employee data for ID card");
    }
  }

  // Generate QR code data for employee
  static generateQRCodeData(employee: Employee): string {
    const qrData = {
      id: employee.name,
      name: employee.employee_name,
      department: employee.department,
      designation: employee.designation,
      company: employee.company,
      email: employee.company_email || employee.personal_email,
      phone: employee.cell_number,
    };

    return JSON.stringify(qrData);
  }

  //get employeId by userID
  static async getEmployeeByUserId(userId: string): Promise<Employee> {
    const response = await FrappeAPI.callMethod("frappe.client.get_list", {
      doctype: "Employee",
      filters: [["user_id", "=", userId]],
      fields: ["name", "employee_name", "department"],
      limit: 1,
    });

    if (!response || !Array.isArray(response) || response.length === 0) {
      throw new Error("No employee found for this user");
    }

    return response[0];
  }

  static async getAllEmployees(
    fields?: string[],
    filters?: FilterCondition[],
    orFilters?: FilterCondition[],
    limit?: number,
    limitStart?: number,
    orderBy?: string,
  ): Promise<Employee[]> {
    const response = FrappeAPI.getDocumentList("Employee", {
      fields: fields && fields.length > 0 ? fields : ["*"],
      limit: limit,
      limitStart: limitStart,
      filters: filters,
      orFilters: orFilters,
      orderBy: orderBy
    });
    const data = await response;
    if (!response || data?.data?.length === 0) {
      throw new Error("No employee found for this user");
    }
    return data?.data as Employee[];
  }
  static async getSearchMembers(
    filters?: string,
    limit?: number
  ): Promise<Employee[]> {
    const response = FrappeAPI.getMethod("cn_hrms_core.cn_hrms_core.apis.employee_search.search_employees", {
      limit: limit,
      status: 'Active',
      query: filters,
    });
    const data = await response;
    return data as Employee[];
  }
  static async getAttendanceFieldReasonAndMessagePermissions(): Promise<AttendanceFieldPermissions> {
    const response = FrappeAPI.getMethod("cn_leave_shift_managment.api.get_attendance_field_settings");
    const data = await response;
    return data as AttendanceFieldPermissions;
  }

  static async getAllReasons(filters?: FilterCondition[]): Promise<IReason[]> {
    const response = FrappeAPI.getDocumentList("Reason", {
      fields: ["name", "reason", "reason_type"],
      filters: filters,
    });
    const data = await response;
    if (!response || data?.data?.length === 0) {
      throw new Error("No reasons found.");
    }
    return data?.data as IReason[];
  }

  static async resetPassword(
    employee: string,
    new_password: string,
    send_mail: boolean
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.employee_directory.reset_employee_password", {
      employee: employee,
      new_password: new_password,
      send_mail: send_mail,
    });
    const data = await response;
    return data;
  }
  static async updateEmployeeSelfService(
    employee?: string,
    status?: string
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.employee_directory.change_employee_self_service_role", {
      employee: employee,
      status: status,
    });
    const data = await response;
    return data as Employee[];
  }
  static async updateProbationPeriod(
    employees: string[],
    probation_period: string
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.employee_directory.change_probation_period", {
      employees: employees,
      probation_period: probation_period,
    });
    const data = await response;
    return data as Employee[];
  }
  static async updateHRBP(
    employees: string[],
    hrbp: string,
    date: string
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.employee_directory.change_hrbp", {
      employees: employees,
      hrbp: hrbp,
      date: date,
    });
    const data = await response;
    return data as Employee[];
  }
  static async updateDottedLineManager(
    employees: string[],
    dotted_line_manager: string,
    date: string
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.employee_directory.change_dotted_line_manager", {
      employees: employees,
      dotted_line_manager: dotted_line_manager,
      date: date,
    });
    const data = await response;
    return data as Employee[];
  }
  static async updateEmployeeWeekOff(
    employee: string,
    new_week_off: string,
    date: string
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.api.change_employee_week_off", {
      employee: employee,
      new_week_off: new_week_off,
      effective_date: date,
    });
    const data = await response;
    return data as Employee[];
  }
  static async deactivateEmployee(
    employees: string[],
    deactivate_reason: string,
    comment: string,
    notice_period_start_date: string
  ) {
    const response = FrappeAPI.callMethod("cn_leave_shift_managment.employee_directory.deactivate_employee", {
      employees: employees,
      deactivate_reason: deactivate_reason,
      comment: comment,
      notice_period_start_date: notice_period_start_date,
    });
    const data = await response;
    return data as Employee[];
  }
}



export default EmployeeService;
