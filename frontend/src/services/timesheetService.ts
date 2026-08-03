import FrappeAPI from "../utils/frappeAPI";
import {
  TimesheetPayload,
  TimesheetResponse,
  WeeklyTimesheetParams,
  WeeklyTimesheetResponse,
  TimesheetEntryPayload,
} from "../types/timesheet";

export const createTimesheet = async (payload: TimesheetPayload): Promise<{ data: TimesheetResponse }> => {
  const res = await FrappeAPI.createDocument("Timesheet", payload as unknown as Record<string, unknown>);
  return { data: (res as unknown as { data: TimesheetResponse }).data };
};

export const updateTimesheet = async (name: string, payload: Partial<TimesheetPayload>): Promise<{ data: TimesheetResponse }> => {
  const res = await FrappeAPI.updateDocument("Timesheet", name, payload as unknown as Record<string, unknown>);
  return { data: (res as unknown as { data: TimesheetResponse }).data };
};

export const getWeeklyTimesheetData = async (params: WeeklyTimesheetParams): Promise<WeeklyTimesheetResponse> => {
  const res = await FrappeAPI.callMethod(
    "cn_leave_shift_managment.attendance_api.get_weekly_timesheet_data",
    params as unknown as Record<string, unknown>
  );
  return res as unknown as WeeklyTimesheetResponse;
};

export const createOrUpdateTimesheetEntries = async (payload: TimesheetEntryPayload): Promise<unknown> => {
  const res = await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.timesheet.create_or_update_timesheet_entries",
    payload as Record<string, unknown>
  );
  return res;
};

