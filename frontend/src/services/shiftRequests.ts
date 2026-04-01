/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";
import {
  ShiftRequest,
  ShiftType,
  ShiftTypeTupleResponse,
  UpdateShiftRequestPayload,
} from "../types/shift";

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

  updateShiftRequest: async (payload: Partial<UpdateShiftRequestPayload>): Promise<ShiftRequest> => {
    const response = await FrappeAPI.updateDocument("Shift Request", payload?.name as string, payload?.data as Record<string, any>);

    await FrappeAPI.callMethod("nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.resubmit_approval_event", {
      docname: payload?.name,
      doctype: "Shift Request",
      data: [payload?.data],
    })

    return response as ShiftRequest;
  },

  approveShiftRequest: async (shiftRequestName: string): Promise<any> => {
    return await FrappeAPI.callMethod("recruitment.api.shift_submit.process_shift_request", {
      docname: shiftRequestName,
      action: "Approved",
    });
  },

  getShiftRequestById: async (id: string): Promise<ShiftRequest> => {
    const response = await FrappeAPI.getDocument("Shift Request", id) as Promise<ShiftRequest>;
    return response;
  },

  rejectShiftRequest: async (shiftRequestName: string): Promise<any> => {
    return await FrappeAPI.callMethod("recruitment.api.shift_submit.process_shift_request", {
      docname: shiftRequestName,
      action: "Rejected",
    });
  },

  getShiftRequestConfig: async (
    employee: string,
  ): Promise<{
    shift_change_requests: boolean;
    shift_change_and_attendance_requests: boolean;
  }> => {
    return (await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_shift_request_config",
      {
        employee,
      },
    )) as {
      shift_change_requests: boolean;
      shift_change_and_attendance_requests: boolean;
    };
  },
};

export const getAllShiftTypes = async (): Promise<{ data: ShiftType[] }> => {
  const PAGE_SIZE = 100;
  const allData: ShiftType[] = [];
  let limitStart = 0;

  while (true) {
    const res = await FrappeAPI.getDocumentList("Shift Type", {
      fields: ["name", "custom_shift_name", "start_time", "end_time"],
      orderBy: "creation desc",
      limit: PAGE_SIZE,
      limitStart,
    });

    const page = res.data as ShiftType[];
    allData.push(...page);

    if (page.length < PAGE_SIZE) break; // last page reached
    limitStart += PAGE_SIZE;
  }

  return { data: allData };
};



export const getEmployeeShifts = async (employee: string): Promise<{ data: { shifts: ShiftType[] } }> => {
  const res = await FrappeAPI.callMethod("cn_leave_shift_managment.api.get_employee_shifts", {
    employees: [employee],
    orderBy: "creation desc",
  });
  return {
    data: res as { shifts: ShiftType[] },
  };
};

export const getShiftsForEmployees = async (
  employee: string,
): Promise<ShiftTypeTupleResponse> => {
  const res = await FrappeAPI.callMethod(
    "cn_leave_shift_managment.api.get_shifts_for_employees",
    {
      filters: {
        employees: [employee],
      },
    },
  );
  return {
    message: res as ShiftTypeTupleResponse["message"],
  };
};


