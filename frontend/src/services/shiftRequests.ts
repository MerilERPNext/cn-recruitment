/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";
import { ShiftRequest } from "../types/shift";

export const ShiftRequestService = {
  getDraftShiftRequests: async (): Promise<ShiftRequest[]> => {
    const response = await FrappeAPI.getDocumentList("Shift Request", {
      fields: ["*"],
      filters: [["status", "=", "Draft"]],
      orderBy: "creation desc",
    });

    return response.data as ShiftRequest[];
  },

 
  approveShiftRequest: async (shiftRequestName: string): Promise<any> => {
    await FrappeAPI.callMethod("frappe.client.set_value", {
      doctype: "Shift Request",
      name: shiftRequestName,
      fieldname: "status",
      value: "Approved",
    });

    return await FrappeAPI.callMethod("recruitment.api.shift_submit.submit_shift_request", {
        docname: shiftRequestName, 
      });
  },

 
  rejectShiftRequest: async (shiftRequestName: string): Promise<any> => {
    await FrappeAPI.callMethod("frappe.client.set_value", {
      doctype: "Shift Request",
      name: shiftRequestName,
      fieldname: "status",
      value: "Rejected",
    });

    return await FrappeAPI.callMethod("recruitment.api.shift_submit.submit_shift_request", {
        docname: shiftRequestName, 
      });
  },
};