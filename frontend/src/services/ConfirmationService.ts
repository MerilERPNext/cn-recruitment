/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";

export const ConfirmationService = async () => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_open_approval_todos",
      { doctype: "Employee Confirmation" }
    ) as { status: string; data: any[] };
  
    return response?.data ?? []; // always return array
  };
  

  export const ConfirmationEmployeeServic = async () => {
    const response = await FrappeAPI.getDocumentList("Employee Confirmation", {
      fields: ["*"],
    }) as { status: string; data: any[] };
  
    return response.data;   // 👈 Yahi sahi return hai
  };
  
export const ConfirmationEmployeeService = async () => {
    const res = await FrappeAPI.getDocumentList("Employee Confirmation", {
      fields: ["*"],
    });
    return {
      data: res.data,
    };
  };