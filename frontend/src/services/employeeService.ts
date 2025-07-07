import { FrappeAPI } from '../utils/frappeAPI';
import { Employee, EmployeeIdCard, EmployeeListItem } from '../types/employee';

// Employee API service
export class EmployeeService {
  
  // Get a single employee by ID/name
  static async getEmployee(employeeId: string): Promise<Employee> {
    return await FrappeAPI.callMethod<Employee>('recruitment.api.get_employee_details', {
      employee_id: employeeId
    });
  }

  // Get list of active employees
  static async getEmployeeList(filters: Record<string, unknown> = {}): Promise<EmployeeListItem[]> {
    const defaultFilters = {
      status: 'Active',
      ...filters
    };

    const fields = [
      'name', 'employee_name', 'department', 'designation', 'status', 'image'
    ];

    return await FrappeAPI.getDocumentList<EmployeeListItem>('Employee', {
      fields,
      filters: defaultFilters,
      orderBy: 'employee_name asc',
      limit: 100
    });
  }

  // Search employees by name
  static async searchEmployees(searchTerm: string): Promise<EmployeeListItem[]> {
    return await FrappeAPI.callMethod<EmployeeListItem[]>('recruitment.api.search_employees', {
      search_term: searchTerm
    });
  }

  // Get current user's employee record
  static async getCurrentEmployee(): Promise<Employee | null> {
    try {
      return await FrappeAPI.callMethod<Employee>('recruitment.api.get_current_employee');
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

  // Get employee by employee number
  static async getEmployeeByNumber(employeeNumber: string): Promise<Employee | null> {
    try {
      const employees = await FrappeAPI.getDocumentList<Employee>('Employee', {
        filters: { employee_number: employeeNumber },
        fields: [
          'name', 'employee_name', 'first_name', 'middle_name', 'last_name',
          'employee_number', 'designation', 'department', 'company', 'branch',
          'date_of_joining', 'date_of_birth', 'gender', 'image', 'status',
          'cell_number', 'personal_email', 'company_email', 'prefered_email',
          'current_address', 'person_to_be_contacted', 'emergency_phone_number',
          'blood_group', 'custom_aadhar_no', 'employment_type'
        ],
        limit: 1
      });

      return employees.length > 0 ? employees[0] : null;
    } catch (error) {
      console.error('Error fetching employee by number:', error);
      return null;
    }
  }
}

export default EmployeeService; 