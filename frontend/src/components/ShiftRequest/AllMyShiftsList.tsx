import React from "react";
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
import getShiftStatus from "../../utils/getShiftStatus";
import { useScreenSize } from "../../hooks/useScreenSize";

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

const AllMyShiftsList: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useShiftAssignments();
  const { isDesktop } = useScreenSize();

  // ✅ Only self shifts
  const myShifts = data?.filter((shift) => shift.is_self === 1) ?? [];

  return (
    <>
      {isDesktop ? (
        <div className="flex flex-col h-full">
          {isDesktop && (
            <div className="flex-shrink-0">
              <div className="px-4 py-1 md:py-4">
                <HeaderBar
                  title="All My Shifts"
                  onBack={() => navigate(-1)}
                  className="shadow"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
            <CardTable
              titles={[
                "Employee",
                "Shift Type",
                "Start Date",
                "End Date",
                "Status",
              ]}
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
      ) : (
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
      )}
    </>
  );
};

export default AllMyShiftsList;
