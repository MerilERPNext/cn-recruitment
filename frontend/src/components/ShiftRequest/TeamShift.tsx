import React from "react";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import { StatusBadge } from "./AllShiftsDashboard";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import { User } from "lucide-react";

const TeamShiftItemComponent: React.FC<{ item: ApiShiftAssignment }> = ({
  item,
}) => {
  return (
    <div className="w-full px-1">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4 flex gap-4">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
          <User size={24} className="text-gray-600" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h2 className="card-title mb-1">
              {item.employee_name || item.employee || "N/A"}
            </h2>
            <StatusBadge status={item.status} />
          </div>

          <h3 className="card-title">{item.shift_type}</h3>
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
    </div>
  );
};

const TeamShift: React.FC = () => {
  const { data } = useShiftAssignments();

  const teamShifts = data?.filter((shift) => shift.is_self === 0) ?? [];

  return (
    <div className="pb-24 w-full mx-auto mt-4">
      {teamShifts.length > 0 ? (
        teamShifts.map((shift) => (
          <TeamShiftItemComponent key={shift.name} item={shift} />
        ))
      ) : (
        <div className="p-6 text-center text-gray-500">
          No team shifts found.
        </div>
      )}
    </div>
  );
};

export default TeamShift;
