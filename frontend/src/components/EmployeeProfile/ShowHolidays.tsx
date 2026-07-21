import { format } from "date-fns"; // Import the format function
import { useEmployeeHolidays } from "../../hooks/useEmployeeHolidays";
import { useTargetUser } from "../../context/ViewedUserContext";

import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { Typography } from "../shared/atoms/Typography";

const ShowHolidays = () => {
  const { targetEmployeeId } = useTargetUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  // Use targetEmployeeId if viewing another user, otherwise use current user's employee ID
  const employeeId = targetEmployeeId || (isCurrentUserLoading ? null : currentUser?.employee) || "";

  const { data: holidays, isLoading, error } = useEmployeeHolidays(employeeId);

  // Early returns to handle loading, error, and empty holidays states
  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen text-xl text-gray-600">
        <span>Loading holidays...</span>
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen text-xl text-red-500">
        <span>Error loading holidays. Please try again later.</span>
      </div>
    );

  if (!holidays || holidays.length === 0)
    return (
      <div className="flex justify-center items-center min-h-screen text-xl text-gray-600">
        <span>No holidays found for this employee.</span>
      </div>
    );

  return (
    <div className="w-full bg-white rounded-lg px-0 py-3 md:p-6">
      <div className="border-b border-gray-200 pb-2 mb-4 md:pb-4 md:mb-8">
        <div>
          <Typography variant="h4" className="font-bold text-gray-900 mb-2 text-xl sm:text-2xl">
            Employee Holidays
          </Typography>
          <Typography variant="bodyMedium" color="body2" className="max-sm:text-sm">
            Your employee holidays
          </Typography>
        </div>
      </div>

      <ul className="space-y-4 h-auto rounded-lg">
        {holidays.map((holiday) => (
          <li
            key={`${holiday.date}-${holiday.holiday_name}`}
            className="flex hover-lift items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 mb-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 font-semibold text-xs">
                  <span className="uppercase leading-none">
                    {holiday?.date && format(new Date(holiday?.date), "MMM")}
                  </span>
                  <span className="text-md">
                    {holiday?.date && format(new Date(holiday?.date), "dd")}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">
                    {holiday.holiday_name}
                  </span>
                  <span className="text-primary-700 text-sm">{holiday.type}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShowHolidays;
