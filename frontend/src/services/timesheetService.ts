import FrappeAPI from "../utils/frappeAPI";
import { TimesheetPayload, TimesheetResponse } from "../types/timesheet";

export const createTimesheet = async (payload: TimesheetPayload): Promise<{ data: TimesheetResponse }> => {
  const res = await FrappeAPI.createDocument("Timesheet", payload as unknown as Record<string, unknown>);
  return { data: (res as unknown as { data: TimesheetResponse }).data };
};
