/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";

export const ConfirmationService = async (doctype: string, todo_status: "Open" | "Closed") => {
  const response = await FrappeAPI.callMethod(
    "cn_leave_shift_managment.api.get_open_approval_todos",
    { doctype: doctype, order_by: "modified desc", todo_status }
  ) as { status: string; data: any[] };

  return response?.data ?? []; // always return array
};

export const ConfirmationEmployeeService = async () => {
  const res = await FrappeAPI.getDocumentList("Employee Confirmation", {
    fields: ["*"],
  });
  return {
    data: res.data,
  };
};