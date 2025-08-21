// Test file for employee service validation
import { validateEmployeeFields } from '../utils/employeeDebug';

describe('Employee Service Validation', () => {
  describe('validateEmployeeFields', () => {
    test('should validate valid employee data', () => {
      const validEmployee = {
        name: 'EMP001',
        employee_name: 'John Doe',
        department: 'IT',
        status: 'Active'
      };
      
      const result = validateEmployeeFields(validEmployee);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.invalidFields).toHaveLength(0);
    });

    test('should detect missing name field', () => {
      const invalidEmployee = {
        employee_name: 'John Doe',
        department: 'IT'
      };
      
      const result = validateEmployeeFields(invalidEmployee);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('name');
    });

    test('should detect missing employee_name field', () => {
      const invalidEmployee = {
        name: 'EMP001',
        department: 'IT'
      };
      
      const result = validateEmployeeFields(invalidEmployee);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('employee_name');
    });

    test('should detect empty string fields', () => {
      const invalidEmployee = {
        name: '',
        employee_name: 'John Doe'
      };
      
      const result = validateEmployeeFields(invalidEmployee);
      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toContain('name (empty string)');
    });

    test('should detect non-string fields', () => {
      const invalidEmployee = {
        name: 123,
        employee_name: 'John Doe'
      };
      
      const result = validateEmployeeFields(invalidEmployee);
      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toContain('name (expected string, got number)');
    });

    test('should handle null/undefined input', () => {
      const result1 = validateEmployeeFields(null);
      expect(result1.isValid).toBe(false);
      expect(result1.invalidFields).toContain('root object is not valid');

      const result2 = validateEmployeeFields(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.invalidFields).toContain('root object is not valid');
    });
  });
});

// Mock test data for different API response structures
export const mockApiResponses = {
  standardFrappeResponse: {
    data: [
      {
        name: 'EMP001',
        employee_name: 'John Doe',
        department: 'IT',
        status: 'Active'
      }
    ]
  },
  
  directArrayResponse: [
    {
      name: 'EMP001',
      employee_name: 'John Doe',
      department: 'IT',
      status: 'Active'
    }
  ],
  
  singleObjectResponse: {
    name: 'EMP001',
    employee_name: 'John Doe',
    department: 'IT',
    status: 'Active'
  },
  
  emptyResponse: {
    data: []
  },
  
  invalidEmployee: {
    data: [
      {
        // Missing required fields
        department: 'IT',
        status: 'Active'
      }
    ]
  }
};
