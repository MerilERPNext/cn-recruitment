import { format } from "date-fns"; // Import the format function
import { useEmployeeHolidays } from "../../hooks/useEmployeeHolidays";
import { useParams } from "react-router-dom";

const ShowHolidays = () => {
  const { id: employeeId } = useParams<{ id: string }>();
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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md ">
      <ul className="space-y-4 h-screen bg-gray-50 p-2 rounded-lg">
        {holidays.map((holiday, index) => (
          <li
            key={index}
            className="flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 mb-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-semibold text-xs">
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
                  <span className="text-blue-700 text-sm">{holiday.type}</span>
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
