import FrappeAPI from "../utils/frappeAPI";
import {
  TimesheetPayload,
  TimesheetResponse,
  WeeklyTimesheetParams,
  WeeklyTimesheetResponse,
  TimesheetEntryPayload,
  TimesheetSettings,
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
    "cn_leave_shift_managment.cn_leave_shift_managment.timesheet.create_or_update_timesheet_entries ",
    payload as Record<string, unknown>
  );
  return res;
};

export const getTimesheetSettings = async (): Promise<TimesheetSettings> => {
  const res = await FrappeAPI.getDocument("Timesheet Settings", "Timesheet Settings", [
    "show_subtask",
    "hide_holiday_timesheet",
    "allow_weekoff_timesheet",
    "show_select_days_to_submit",
  ]);
  return res as TimesheetSettings;
};
