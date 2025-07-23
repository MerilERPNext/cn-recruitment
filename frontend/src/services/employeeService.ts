import { FrappeAPI } from '../utils/frappeAPI';
import { Employee, EmployeeIdCard, EmployeeListItem } from '../types/employee';

function hasRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown,
  requiredProps: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== 'object') return false;

  const objRecord = obj as Record<string, unknown>;

  return requiredProps.every(prop =>
    prop in objRecord && objRecord[prop as string] !== undefined
  );
}

// Type guards for runtime validation
function isEmployee(obj: unknown): obj is Employee {
  if (!hasRequiredProperties(obj, ['name', 'employee_name', 'first_name', 'date_of_joining', 'date_of_birth', 'gender', 'status'])) {
    return false;
  }
  
  const employee = obj as Record<string, unknown>;
  return typeof employee.name === 'string' &&
    typeof employee.employee_name === 'string' &&
    typeof employee.first_name === 'string' &&
    typeof employee.date_of_joining === 'string' &&
    typeof employee.date_of_birth === 'string' &&
    typeof employee.gender === 'string' &&
    ['Active', 'Inactive', 'Suspended', 'Left'].includes(employee.status as string);
}

function isEmployeeListItem(obj: unknown): obj is EmployeeListItem {
  if (!hasRequiredProperties(obj, ['name', 'employee_name', 'status'])) {
    return false;
  }
  
  const item = obj as Record<string, unknown>;
  return typeof item.name === 'string' &&
    typeof item.employee_name === 'string' &&
    typeof item.status === 'string';
}

function isEmployeeListItemArray(obj: unknown): obj is EmployeeListItem[] {
  return Array.isArray(obj) && obj.every((item: unknown) => isEmployeeListItem(item));
}

// Employee API service
export class EmployeeService {
  
  // Get a single employee by ID/name
  static async getEmployee(employeeId: string): Promise<Employee> {
    const result = await FrappeAPI.callMethod('recruitment.api.get_employee_details', {
      employee_id: employeeId
    });
    
    if (!isEmployee(result)) {
      throw new Error('Invalid employee data received from API');
    }
    
    return result;
  }
  
  // Search employees by name
  static async searchEmployees(searchTerm: string): Promise<EmployeeListItem[]> {
    const result = await FrappeAPI.callMethod('recruitment.api.search_employees', {
      search_term: searchTerm
    });
    
    if (!isEmployeeListItemArray(result)) {
      throw new Error('Invalid employee list data received from API');
    }
    
    return result;
  }

  // Get current user's employee record
  static async getCurrentEmployee(): Promise<Employee | null> {
    try {
      const result = await FrappeAPI.callMethod('recruitment.api.get_current_employee');
      
      if (!isEmployee(result)) {
        console.error('Invalid employee data received from API');
        return null;
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching current employee:', error);
      return null;
    }
  }
  static async getCurrentEmployeeAllDetails(user_id : string): Promise<Employee | null> {
    try {
      const result = await FrappeAPI.getDocumentList("Employee", {
      fields: ["*"],
      filters: [
        ["user_id", "=", user_id]
      ],
    });
    console.log(result,"+++++++++++++++++++++++")
      if (!isEmployee(result.data[0])) {
        console.error('Invalid employee data received from API');
        return null;
      }
      
      return result?.data[0];
    } catch (error) {
      console.error('Error fetching current employee:', error);
      return null;
    }
  }

  // Transform Employee data to EmployeeIdCard format
  static transformToIdCard(employee: Employee): EmployeeIdCard {
    return {
      id: employee.name,
      name: employee.employee_name,
      employee_name: employee.employee_name,
      department: employee.department || 'Not Specified',
      designation: employee.designation,
      location: employee.branch || employee.company || 'Not Specified',
      startDate: employee.date_of_joining,
      avatar: employee.image || '/assets/recruitment/default-avatar.png',
      status: employee.status,
      company: employee.company,
      employee_number: employee.employee_number || employee.name,
      contact: employee.cell_number,
      email: employee.prefered_email || employee.company_email || employee.personal_email
    };
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
      phone: employee.cell_number
    };
    
    return JSON.stringify(qrData);
  }
}

export default EmployeeService;