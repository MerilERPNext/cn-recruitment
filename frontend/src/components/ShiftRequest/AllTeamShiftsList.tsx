import React from "react";
// import { StatusBadge } from "./AllShiftsDashboard";
import { Link, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";

const TeamShiftRowItem: React.FC<{
  item: ApiShiftAssignment;
  index?: number;
}> = ({ item, index }) => {
  const gridTemplateColumns = "1fr 1fr 1fr 1fr 1fr";

  return (
    <div
      key={`${item.name}-${index}`}
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns }}
    >
      <Link
        to={`/webapp/employee-profile?target_user=${item?.employee}`}
        target="_blank"
      >
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          {" "}
          <WrapperHoverCard employeeId={item.employee}>
            {item.employee_name}
          </WrapperHoverCard>
        </Typography>
      </Link>

      <Typography
        variant="bodySmall"
        className="font-medium text-center"
        title={`Shift Time: ${item.start_time} - ${item.end_time}`}
      >
        {item.shift_type}
      </Typography>
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item.start_date)}{" "}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatEndDate(item.end_date)}{" "}
      </Typography>

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
      <HeaderBar title="All Team Shifts123" onBack={() => navigate(-1)} />

      <div className="px-4 mt-6">
        <CardTable
          /* ✅ Unified headers */
          titles={[
            "Employee",
            "Shift Type",
            "Start Date",
            "End Date",
            "Status",
          ]}
          /* ✅ Column widths synced with row */
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr"]}
        >
          {teamShifts.length > 0 ? (
            teamShifts.map((shift, index) => (
              <TeamShiftRowItem key={shift.name} item={shift} index={index} />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No team shifts found.
            </div>
          )}
        </CardTable>
      </div>
    </div>
  );
};

export default AllTeamShiftsList;
