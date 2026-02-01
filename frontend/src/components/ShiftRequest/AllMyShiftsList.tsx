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
import CardTable from "../shared/CardTable";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";

const MyShiftRowItem: React.FC<{
  item: ApiShiftAssignment;
  index?: number;
}> = ({ item, index }) => {
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
        {formatToIndianDate(item.start_date)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formatEndDate(item.end_date)}
      </Typography>

      <div className="flex items-center justify-center">
        <StatusBadge status={shiftStatus} />
      </div>
    </div>
  );
};

const AllMyShiftsList: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useShiftAssignments();

  // ✅ Only self shifts
  const myShifts = data?.filter((shift) => shift.is_self === 1) ?? [];

  return (
    <div className="w-full mx-auto pb-20">
      <HeaderBar title="All My Shifts" onBack={() => navigate(-1)} />

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
          {myShifts.length > 0 ? (
            myShifts.map((shift, index) => (
              <MyShiftRowItem key={shift.name} item={shift} index={index} />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No shifts found for you.
            </div>
          )}
        </CardTable>
      </div>
    </div>
  );
};

export default AllMyShiftsList;
