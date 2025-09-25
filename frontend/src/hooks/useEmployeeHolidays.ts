import { useQuery } from "@tanstack/react-query";
import { getEmployeeHolidays, Holiday } from "../services/holidayService";

export const useEmployeeHolidays = (employee?: string) => {
  return useQuery<Holiday[]>({
    queryKey: ["employee-holidays", employee],
    queryFn: () => getEmployeeHolidays(employee!),
    enabled: !!employee,
  });
};
