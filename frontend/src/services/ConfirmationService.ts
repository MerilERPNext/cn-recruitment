/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";

export const ConfirmationService = async () => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_open_approval_todos",
      { doctype: "Employee Confirmation" }
    ) as { status: string; data: any[] };
  
    return response?.data ?? []; // always return array
  };
  

// export const generateSalarySlip = async (): Promise<any> => {
//   const result = await FrappeAPI.callMethod(
//     "recruitment.payroll_api.generate_salary_slip"
//   );
//   return result;
// };
