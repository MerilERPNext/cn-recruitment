import { useState } from "react";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import FrappeListView from "../ListView";

interface ShiftAssignmentItem {
  name: string;
  employee: string;
  shift_type: string;
  start_date: string;
  end_date: string;
  status: string;
  modified: string;
}

const formatToIndianDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};



const getShiftStatusLabel = (startDate: string, endDate: string): string => {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const todayDate = today.toISOString().split("T")[0];
  const startDateOnly = start.toISOString().split("T")[0];
  const endDateOnly = end.toISOString().split("T")[0];

  if (todayDate < startDateOnly) {
    return "Upcoming Shift";
  } else if (todayDate > endDateOnly) {
    return "Previous Shift";
  } else {
    return "Current Shift";
  }
};

const ShiftAssignmentItem = ({ item }: { item: ShiftAssignmentItem }) => {
  const shiftLabel = getShiftStatusLabel(item.start_date, item.end_date);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
      <div>
        <h3
          className={`text-xs font-semibold tracking-wide uppercase ${
            shiftLabel === "Current Shift"
              ? "text-green-600"
              : shiftLabel === "Upcoming Shift"
              ? "text-blue-600"
              : "text-gray-500"
          }`}
        >
          {shiftLabel}
        </h3>

        <div className="flex justify-between items-center mt-1">
          <h2 className="text-base font-semibold text-black">
            {item.shift_type}
          </h2>
       
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex gap-1">
          <span className="text-gray-500">From:</span>
          <span className="font-medium text-black">
            {formatToIndianDate(item.start_date)}
          </span>
        </div>
        <div className="flex gap-1">
          <span className="text-gray-500">To:</span>
          {shiftLabel === "Current Shift" ? (
            <span className="font-medium text-black">Present</span>
          ) : (
            <span className="font-medium text-black">
              {formatToIndianDate(item.end_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function MyShiftAssignment() {
  const { data: user_id } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(user_id || "");
  const employee_id = user?.employee;

  const [shiftFilter, setShiftFilter] = useState("All");

  if (!employee_id) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  // Apply filter logic
  const filters: Record<string, unknown> = { employee: employee_id };
  const today = new Date().toISOString().split("T")[0];

  if (shiftFilter === "Current Shift") {
    filters.start_date = ["<=", today];
    filters.end_date = [">=", today];
  } else if (shiftFilter === "Previous Shift") {
    filters.end_date = ["<", today];
  } else if (shiftFilter === "Upcoming Shift") {
    filters.start_date = [">", today];
  }

  return (
    <div className="flex flex-col mb-24 gap-4">
      <FrappeListView<ShiftAssignmentItem>
        doctype="Shift Assignment"
        ItemComponent={ShiftAssignmentItem}
        isSearch={true}
        searchFields={["employee_name","shift_type"]}
        isFilter={false}
        showRefereshButton={true}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultFilters={filters as any}
        infiniteScroll={true}
        PreListComponent={() => (
          <div className="flex justify-start mb-3">
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="All">All Shifts</option>
              <option value="Current Shift">Current Shift</option>
              <option value="Previous Shift">Previous Shift</option>
              <option value="Upcoming Shift">Upcoming Shift</option>
            </select>
          </div>
        )}
        defaultFields={[
          "name",
          "employee",
          "shift_type",
          "start_date",
          "end_date",
          "status",
          "modified",
        ]}
        permissionErrorMessage="You don't have permission to view shift assignments"
      />
    </div>
  );
}
