/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";
import { ShiftRequest,ShiftType, UpdateShiftRequestPayload } from "../types/shift";

export const ShiftRequestService = {
  getDraftShiftRequests: async (): Promise<ShiftRequest[]> => {
    const response = await FrappeAPI.getDocumentList("Shift Request", {
      fields: ["*"],
      filters: [["status", "=", "Draft"]],
      orderBy: "creation desc",
    });

    return response.data as ShiftRequest[];
  },
  
  createShiftRequest: async (payload: Partial<ShiftRequest>): Promise<ShiftRequest> => {
    const response = await FrappeAPI.createDocument("Shift Request", payload);
    return response as ShiftRequest;
  },
 
  updateShiftRequest: async (payload: UpdateShiftRequestPayload): Promise<ShiftRequest> => {
    const response = await FrappeAPI.updateDocument("Shift Request", payload.name ,payload.data );
    return response as ShiftRequest;
  },

  approveShiftRequest: async (shiftRequestName: string): Promise<any> => {
    return await FrappeAPI.callMethod("recruitment.api.shift_submit.process_shift_request", {
      docname: shiftRequestName,
      action: "Approved",
    });
  },
  
  

 
  rejectShiftRequest: async (shiftRequestName: string): Promise<any> => {
    return await FrappeAPI.callMethod("recruitment.api.shift_submit.process_shift_request", {
      docname: shiftRequestName,
      action: "Rejected",
    });
  },
};

export const getAllShiftTypes = async (): Promise<{ data: ShiftType[] }> => {
    const res = await FrappeAPI.getDocumentList("Shift Type", {
      fields: ["name", "start_time", "end_time"],
      orderBy: "creation desc",
    });
    return {
      data: res.data as ShiftType[],
    };
  };

 
  