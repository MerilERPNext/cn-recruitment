import { FrappeAPI } from "../utils/frappeAPI";

export interface Holiday {
  type: string;
  date: string;
  holiday_name?: string;
}

export const getEmployeeHolidays = async (
  employee: string
): Promise<Holiday[]> => {
  try {
    const response = await FrappeAPI.getMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.overrides.employee.get_employee_holidays",
      {
        employee: employee,
      }
    );
    return response as Holiday[];
  } catch (error) {
    console.error("📡 Error fetching quick attendance summary:", error);
    throw error;
  }
};
