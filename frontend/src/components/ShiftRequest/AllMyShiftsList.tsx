import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import getShiftStatus from "../../utils/getShiftStatus";
import HeaderBar from "../HeaderBar";
import CardTable from "../shared/CardTable";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

const MyShiftRowItem: React.FC<{
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
        <StatusBadge status={item?.shift_status} />
      </div>
    </div>
  );
};

const ShiftAssignmentItem: React.FC<{ item: ApiShiftAssignment }> = ({
  item,
}) => {
  const shiftStatus = getShiftStatus(item.start_date, item.end_date);

  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b
      border-x-primary/20 border-b-primary/20
      shadow-sm border-primary bg-white rounded-xl mb-4"
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">
              {item?.employee_name ? "Employee Name" : "Employee ID"}
            </Typography>

            <Typography variant="mobileCardValue">
              {item?.employee_name || item?.employee}
            </Typography>
          </div>

          <StatusBadge status={shiftStatus} />
        </div>

        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Shift Type</Typography>
            <Typography variant="mobileCardValue">{item.shift_type}</Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Shift Time</Typography>
            <Typography variant="mobileCardValue">
              {`${item.start_time} - ${item.end_time}`}
            </Typography>
          </div>
        </div>

        {/* Dates */}
        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">From</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(item.start_date)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">To</Typography>
            <Typography variant="mobileCardValue">
              {formatEndDate(item.end_date)}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

const AllMyShiftsList: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useShiftAssignments();
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
                  title="My Shift Assigments"
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
              {isLoading ? (
                <CardSkeleton />
              ) : myShifts.length > 0 ? (
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
            {isLoading ? (
              <CardSkeleton />
            ) : myShifts.length > 0 ? (
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
