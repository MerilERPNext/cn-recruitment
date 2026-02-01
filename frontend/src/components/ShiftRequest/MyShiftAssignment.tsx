import React from "react";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import getShiftStatus from "../../utils/getShiftStatus";
import StatusBadge from "../shared/atoms/statusBadge";

const ShiftAssignmentItem: React.FC<{ item: ApiShiftAssignment }> = ({
  item,
}) => {
  const shiftStatus = getShiftStatus(item.start_date, item.end_date);

  return (
    <div className="w-full px-1">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="card-title">{item.shift_type}</h2>
          <span className="text-xs text-gray-500">
            <StatusBadge status={shiftStatus} />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex flex-col gap-1">
            <span className="card-title">From</span>
            <span className="card-subtitle">
              {`${formatToIndianDate(item.start_date)}`}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <span className="card-title">To</span>
            <span className="card-subtitle">
              {`${formatEndDate(item.end_date)}`}
            </span>
          </div>
          <div className="flex flex-col text-right gap-1">
            <span className="card-title">Time</span>
            <span className="card-subtitle">
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
