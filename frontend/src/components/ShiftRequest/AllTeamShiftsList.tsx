import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import HeaderBar from "../HeaderBar";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import WrapperHoverCard from "../shared/WrapperHoverCard";

import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import { BulkSelectProvider } from "../shared/BulkSelectContext";

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
        {item.shift_name}
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

const TeamShiftItemComponent: React.FC<{ item: ApiShiftAssignment }> = ({
  item,
}) => {
  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b
      border-x-primary/20 border-b-primary/20
      shadow-sm border-primary bg-white rounded-xl mb-4"
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">
              {item?.employee_name ? "Employee Name" : "Employee ID"}
            </Typography>{" "}
            <Typography variant="mobileCardValue">
              {item.employee_name || item.employee || "N/A"}
            </Typography>
          </div>
          <StatusBadge status={item.status} />
        </div>

        {/* Shift Type */}
        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Shift Type</Typography>
            <Typography variant="mobileCardValue">{item.shift_name}</Typography>
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

const AllTeamShiftsList: React.FC = () => {
  const { isDesktop } = useScreenSize();

  const navigate = useNavigate();
  const { data, isLoading } = useShiftAssignments();

  // ✅ Only take team shifts (is_self = 0)
  const teamShifts = data?.filter((shift) => shift.is_self === 0) ?? [];

  return (
    <>
      {isDesktop ? (
        <div className="flex flex-col h-full">
          {isDesktop && (
            <div className="flex-shrink-0">
              <div className="px-4 py-1 md:py-4">
                <HeaderBar
                  title="Team Shift Assignments"
                  onBack={() => navigate(-1)}
                  className="shadow"
                />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
            <BulkSelectProvider>
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
                ) : teamShifts.length > 0 ? (
                  teamShifts.map((shift, index) => (
                    <TeamShiftRowItem
                      key={shift.name}
                      item={shift}
                      index={index}
                    />
                  ))
                ) : (
                  <NoDataFound
                    title="No Team Shift Assignments"
                    subtitle="No team shifts found."
                  />
                )}
              </CardTable>
            </BulkSelectProvider>
          </div>
        </div>
      ) : (
        <div className="pb-24 w-full mx-auto mt-4">
          {isLoading ? (
            <CardSkeleton />
          ) : teamShifts.length > 0 ? (
            teamShifts.map((shift) => (
              <TeamShiftItemComponent key={shift.name} item={shift} />
            ))
          ) : (
            <NoDataFound
              title="No Team Shift Assignments"
              subtitle="No team shifts found."
            />
          )}
        </div>
      )}
    </>
  );
};

export default AllTeamShiftsList;
