/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../../utils/frappeAPI";
  
  export const getSalaryStructureAssignment = async (
    employeeId: string,
  ) => {
    const response = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_structure_assignment.generate_salary_slip", {
      employee: employeeId,
    }) as { status: string; data: any[] };
  
    return response.data;   
  };