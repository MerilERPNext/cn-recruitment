import React from "react";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import { StatusBadge } from "./AllShiftsDashboard";
import getShiftStatus from "../../utils/getShiftStatus";

const ShiftAssignmentItem: React.FC<{ item: ApiShiftAssignment }> = ({
  item,
}) => {
  const shiftStatus = getShiftStatus(item.start_date, item.end_date);

  return (
    <div className="w-full px-1">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            {item.shift_type}
          </h2>
          <span className="text-xs text-gray-500">
            <StatusBadge status={shiftStatus} />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500 font-bold">Date</span>
            <span className="font-medium text-gray-900">
              {`${formatToIndianDate(item.start_date)} - ${formatEndDate(
                item.end_date
              )}`}
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-gray-500 font-bold">Time</span>
            <span className="font-medium text-gray-900">
              {`${item.start_time} - ${item.end_time}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyShiftAssignment: React.FC = () => {
  const { data } = useShiftAssignments();

  // ✅ Only show self shifts
  const myShifts = data?.filter((shift) => shift.is_self === 1) ?? [];

  return (
    <div className="w-full mx-auto pb-20">
      <div className="mt-4">
        {myShifts.length > 0 ? (
          myShifts.map((shift) => (
            <ShiftAssignmentItem key={shift.name} item={shift} />
          ))
        ) : (
          <div className="p-6 text-center text-gray-500">
            No shifts found for you.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShiftAssignment;
