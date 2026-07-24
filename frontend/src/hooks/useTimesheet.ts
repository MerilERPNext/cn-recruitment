import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTimesheet } from "../services/timesheetService";
import { TimesheetPayload } from "../types/timesheet";

export const useCreateTimesheet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: TimesheetPayload) => createTimesheet(payload),
    onSuccess: () => {
      // Invalidate any timesheet-related queries to refetch data if necessary
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
};
