import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTimesheet, updateTimesheet, getWeeklyTimesheetData, createOrUpdateTimesheetEntries } from "../services/timesheetService";
import { TimesheetPayload, WeeklyTimesheetParams, TimesheetEntryPayload } from "../types/timesheet";

export const useCreateTimesheet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: TimesheetPayload) => createTimesheet(payload),
    onSuccess: () => {
      // Invalidate any timesheet-related queries to refetch data if necessary
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-timesheet-data"] });
    },
  });
};

export const useUpdateTimesheet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: Partial<TimesheetPayload> }) =>
      updateTimesheet(name, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["document", "Timesheet", data.data.name] });
      queryClient.invalidateQueries({ queryKey: ["weekly-timesheet-data"] });
    },
  });
};

export const useWeeklyTimesheetData = (params: WeeklyTimesheetParams, enabled = true) => {
  return useQuery({
    queryKey: ["weekly-timesheet-data", params.employee_id, params.week_start_date],
    queryFn: () => getWeeklyTimesheetData(params),
    enabled: enabled && !!params.employee_id && !!params.week_start_date,
  });
};

export const useCreateOrUpdateTimesheetEntries = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TimesheetEntryPayload) => createOrUpdateTimesheetEntries(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-timesheet-data"] });
    }
  });
};

