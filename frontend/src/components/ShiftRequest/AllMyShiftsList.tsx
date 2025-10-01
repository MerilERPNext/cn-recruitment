import React from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import formatToIndianDate, { formatEndDate } from "../../utils/formatToIndianDate";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";

const MyShiftRowItem: React.FC<{ item: ApiShiftAssignment; index?: number }> = ({
  item,
  index,
}) => {
  const getShiftStatus = (startDate: string, endDate?: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    let end: Date | null = null;
    if (endDate) {
      end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
    }

    if (!end) {
      // Missing end date → treat as ongoing
      if (today >= start) return "Current";
      return "Upcoming";
    }

    if (today < start) return "Upcoming";
    if (today > end) return "Previous";
    return "Current";
  };

  const shiftStatus = getShiftStatus(item.start_date, item.end_date);

  return (
    <div
      key={`${item.name}-${index}`}
      className="my-data-row grid grid-cols-5 gap-4 items-center text-center"
    >
      <div className="my-data-cell font-medium truncate">{item.employee_name}</div>
      <div className="my-data-cell truncate" title={`Shift Time: ${item.start_time} - ${item.end_time}`}>{item.shift_type}</div>
      <div className="my-data-cell">{formatToIndianDate(item.start_date)}</div>
      <div className="my-data-cell">{formatEndDate(item.end_date)}</div>
      <div className="my-data-cell flex justify-center">
        <StatusBadge status={shiftStatus} />
      </div>
    </div>
  );
};

const AllMyShiftsList: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useShiftAssignments();

  // ✅ Filter only self shifts
  const myShifts = data?.filter((shift) => shift.is_self === 1) ?? [];

  return (
    <div className="w-full mx-auto pb-20">
      <HeaderBar title="All My Shifts" onBack={() => navigate(-1)} />
      <div className="overflow-x-auto mt-6 mx-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="my-table-header grid grid-cols-5 gap-4">
          <span className="my-table-header-text flex items-center justify-center">
            EMPLOYEE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            SHIFT TYPE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            START DATE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            END DATE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            STATUS
          </span>
        </div>
        <div>
          {myShifts.length > 0 ? (
            myShifts.map((shift, index) => (
              <MyShiftRowItem key={shift.name} item={shift} index={index} />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No shifts found for you.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default AllMyShiftsList;

