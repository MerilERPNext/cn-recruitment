// Debug utility for employee data issues
export const debugEmployeeData = (data: unknown, context: string) => {
  console.group(`🔍 Employee Debug - ${context}`);
  
  console.log("Raw data:", data);
  console.log("Data type:", typeof data);
  console.log("Is array:", Array.isArray(data));
  
  if (data && typeof data === 'object') {
    console.log("Object keys:", Object.keys(data));
    
    if ('data' in data) {
      const dataObj = data as { data: unknown };
      console.log("Has 'data' property:", true);
      console.log("Data property:", dataObj.data);
      console.log("Data property type:", typeof dataObj.data);
      console.log("Data is array:", Array.isArray(dataObj.data));
      
      if (Array.isArray(dataObj.data)) {
        console.log("Data array length:", dataObj.data.length);
        if (dataObj.data.length > 0) {
          console.log("First item:", dataObj.data[0]);
          console.log("First item type:", typeof dataObj.data[0]);
          if (dataObj.data[0] && typeof dataObj.data[0] === 'object') {
            console.log("First item keys:", Object.keys(dataObj.data[0]));
          }
        }
      }
    }
  }
  
  console.groupEnd();
};

export const validateEmployeeFields = (employee: unknown): { isValid: boolean; missingFields: string[]; invalidFields: string[] } => {
  const requiredFields = ['name', 'employee_name'];
  const missingFields: string[] = [];
  const invalidFields: string[] = [];
  
  if (!employee || typeof employee !== 'object') {
    return {
      isValid: false,
      missingFields: requiredFields,
      invalidFields: ['root object is not valid']
    };
  }
  
  const emp = employee as Record<string, unknown>;
  
  for (const field of requiredFields) {
    if (!(field in emp)) {
      missingFields.push(field);
    } else if (typeof emp[field] !== 'string') {
      invalidFields.push(`${field} (expected string, got ${typeof emp[field]})`);
    } else if (!emp[field]) {
      invalidFields.push(`${field} (empty string)`);
    }
  }
  
  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields
  };
};
