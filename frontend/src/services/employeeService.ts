import { FrappeAPI } from "../utils/frappeAPI";
import {
  Employee,
  EmployeeIdCard,
  EmployeeListItem,
  IReason,
} from "../types/employee";
import { FilterCondition } from "../types/frappe";

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
    return false;
  }

  const employee = obj as Record<string, unknown>;

  const requiredFields = ["name", "employee_name"];
  for (const field of requiredFields) {
    if (
      !(field in employee) ||
      typeof employee[field] !== "string" ||
      !employee[field]
    ) {
      return false;
    }
  }

  if (
    employee.status &&
    !["Active", "Inactive", "Suspended", "Left"].includes(
      employee.status as string
    )
  ) {
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
  static async getEmployee(employeeId: string): Promise<Employee> {
    try {
      console.log("Fetching employee details for ID:", employeeId);

      let result;

      // Try the primary API method first
      try {
        result = await FrappeAPI.callMethod(
          "recruitment.api.get_employee_details",
          {
            employee_id: employeeId,
          }
        );
        console.log("Primary API response for employee:", result);
      } catch (primaryError) {
        console.warn(
          "Primary API method failed, trying fallback:",
          primaryError
        );

        // Fallback: Try to get employee directly from doctype
        try {
          result = await FrappeAPI.getDocument("Employee", employeeId);
          console.log("Fallback API response for employee:", result);
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

      console.log("Employee data validated successfully:", result);
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

  // Get current user's employee record
  static async getCurrentEmployee(): Promise<Employee | null> {
    try {
      console.log("Fetching current employee details...");

      let result;

      // Try the primary API method first
      try {
        result = await FrappeAPI.callMethod(
          "recruitment.api.get_current_employee"
        );
        console.log("Primary API response for current employee:", result);
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
            console.log(
              "Got current user, fetching employee by user ID:",
              userResult
            );
            const employeeList = await FrappeAPI.getDocumentList("Employee", {
              fields: ["*"],
              filters: [["user_id", "=", userResult]],
              limit: 1,
            });

            if (employeeList.data && employeeList.data.length > 0) {
              result = employeeList.data[0];
              console.log(
                "Fallback API response for current employee:",
                result
              );
            } else {
              console.warn("No employee found for current user:", userResult);
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
    user_id: string
  ): Promise<Employee | null> {
    try {
      const result = await FrappeAPI.getDocumentList("Employee", {
        fields: ["*"],
        filters: [["user_id", "=", user_id]],
      });
      if (!isEmployee(result.data[0])) {
        console.error("Invalid employee data received from API");
        return null;
      }

      return result?.data[0];
    } catch (error) {
      console.error("Error fetching current employee:", error);
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

  // Transform Employee data to EmployeeIdCard format
  static transformToIdCard(employee: Employee): EmployeeIdCard {
    try {
      console.log("Transforming employee data to ID card format:", employee);

      return {
        id: employee.name || "Unknown",
        name: employee.employee_name || employee.first_name || "Unknown",
        employee_name:
          employee.employee_name || employee.first_name || "Unknown",
        department: employee.department || "Not Specified",
        designation: employee.designation || "Not Specified",
        location: employee.branch || employee.company || "Not Specified",
        startDate: employee.date_of_joining || "Not Available",
        avatar: employee.image || undefined, // Don't set default here, let the component handle it
        status: employee.status || "Active",
        company: employee.company || "Not Specified",
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

  static async getAllEmployees(): Promise<Employee[]> {
    const response = FrappeAPI.getDocumentList("Employee", {
      fields: ["name", "employee_name", "company"],
      limit: 20,
      filters: [["status", "=", "Active"]],
    });
    const data = await response;
    if (!response || data?.data?.length === 0) {
      throw new Error("No employee found for this user");
    }
    return data?.data as Employee[];
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
}

export default EmployeeService;
