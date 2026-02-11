import React from "react";
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
import { useScreenSize } from "../../hooks/useScreenSize";
import { User } from "lucide-react";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

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
                  title="All Team Shifts"
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
              ) : teamShifts.length > 0 ? (
                teamShifts.map((shift, index) => (
                  <TeamShiftRowItem
                    key={shift.name}
                    item={shift}
                    index={index}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No team shifts found.
                </div>
              )}
            </CardTable>
          </div>
        </div>
      ) : (
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
      )}
    </>
  );
};

export default AllTeamShiftsList;
