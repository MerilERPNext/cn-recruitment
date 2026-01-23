import React from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { Link, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import WrapperHoverCard from "../shared/WrapperHoverCard";

const TeamShiftRowItem: React.FC<{
  item: ApiShiftAssignment;
  index?: number;
}> = ({ item, index }) => {
  return (
    <div
      key={`${item.name}-${index}`}
      className="my-data-row grid grid-cols-5 gap-4 items-center text-center"
    >
      <Link
        to={`/webapp/employee-profile?target_user=${item?.employee}`}
        target="_blank"
      >
        <div className="my-data-cell font-medium truncate">
          <WrapperHoverCard employeeId={item.employee}>
            {item.employee_name}
          </WrapperHoverCard>
        </div>
      </Link>

      <div
        className="my-data-cell truncate"
        title={`Shift Time: ${item.start_time} - ${item.end_time}`}
      >
        {item.shift_type}
      </div>
      <div className="my-data-cell">{formatToIndianDate(item.start_date)}</div>
      <div className="my-data-cell">{formatEndDate(item.end_date)}</div>
      <div className="my-data-cell flex justify-center">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
};

const AllTeamShiftsList: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useShiftAssignments();

  // ✅ Only take team shifts (is_self = 0)
  const teamShifts = data?.filter((shift) => shift.is_self === 0) ?? [];

  return (
    <div className="w-full mx-auto pb-20">
      <HeaderBar title="All Team Shifts" onBack={() => navigate(-1)} />
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
          {teamShifts.length > 0 ? (
            teamShifts.map((shift, index) => (
              <TeamShiftRowItem key={shift.name} item={shift} index={index} />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No team shifts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTeamShiftsList;
