import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import {
  useGetAttendancePolicyForDate,
  useGetHolidays,
  useGetLeaveBalance,
  useMyLeaveRequests,
} from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { HolidayCardSkeletonList } from "./LeaveSkeletons";
import { Holiday, HolidayGroup } from "../../types/leaves";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { Typography } from "../shared/atoms/Typography";
import CustomDropdown from "../shared/CustomDropdown";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import Button from "../shared/atoms/Button";

interface HolidayCardProps {
  holiday: Holiday;
  statusLabel?: string | null;
  showOptionalLabel?: boolean;
  canRequest?: boolean;
}

export const HolidayCard: React.FC<HolidayCardProps> = ({
  holiday,
  statusLabel,
  showOptionalLabel,
  canRequest,
}) => {
  const dateObj = new Date(holiday.date);
  const month = format(dateObj, "MMM");
  const day = format(dateObj, "dd");
  const weekday = format(dateObj, "EEEE");

  const { openModal } = useRequestLeaveModal();
  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");

  const canApplyPermission = isActionEnabled(
    userUiPermission,
    "optional_holiday_apply",
    "Holidays",
  );

  const showRequestButton =
    canRequest &&
    !statusLabel &&
    canApplyPermission &&
    holiday.leave_type?.toLowerCase() === "optional holiday";

  return (
    <div
      className={`flex items-center justify-between px-3 py-3 sm:px-4 sm:py-4 border-b last:border-b-0`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
          <span className="text-base leading-none">{day}</span>
          <span className="mt-0.5">{month}</span>
        </div>

        <div className="flex flex-col min-w-0">
          <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
            {holiday.holiday_name}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 truncate">
            {weekday}
            {showOptionalLabel &&
              holiday?.leave_type.toLowerCase() === "optional holiday"
              ? " | Optional Holiday"
              : ""}
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 pl-2">
        {showRequestButton && (
          <Button
            bgColor="gray-500"
            onClick={() =>
              openModal({
                fromDate: holiday.date,
                toDate: holiday.date,
                leaveType: holiday.leave_type,
                source: "holiday",
                hideHalfDayToggle: true,
              })
            }
            className="text-xs sm:text-sm font-medium rounded-full border border-gray-300 px-3 py-1 text-gray-700 bg-white hover:bg-gray-50"
          >
            Request
          </Button>
        )}

        {statusLabel && (
          <span
            className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium
              ${statusLabel === "Taken" || statusLabel === "Applied"
                ? "bg-primary/10 text-primary"
                : statusLabel === "Rejected"
                  ? "bg-red-100 text-red-600"
                  : "bg-yellow-100 text-yellow-700"
              }`}
          >
            {statusLabel === "Taken" ? "Applied" : statusLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const Holidays: React.FC = () => {
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
  const { data: employee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(userId);

  const { setRefetch } = useLeaveRequestRefresh();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [showOptionalOnly, setShowOptionalOnly] = useState(false);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const y = currentYear - 2 + i;
      return {
        value: String(y),
        label: `Year ${y} - ${(y + 1).toString().slice(-2)}`,
      };
    });
  }, [currentYear]);

  const {
    data: holidaysData,
    isLoading: isHolidayLoading,
    isError: isHolidayError,
  } = useGetHolidays(employee?.name, year);

  const {
    data: leaveRequests,
    isLoading: isLeaveReqLoading,
    refetch,
  } = useMyLeaveRequests(employee?.name);

  useEffect(() => {
    const unsub = setRefetch(refetch);
    return unsub;
  }, [refetch, setRefetch]);

  const today = new Date().toISOString().split("T")[0];
  const selectedYearDate = useMemo(() => `${year}-01-01`, [year]);

  const { data: attendancePolicy } = useGetAttendancePolicyForDate(
    employee?.name,
    today,
  );

  const { data: leaveBalance, isLoading: isBalanceLoading } =
    useGetLeaveBalance(employee?.name, selectedYearDate, "Optional Holiday");

  const regularHolidays: Holiday[] = useMemo(() => {
    if (!holidaysData) return [];
    return holidaysData
      .filter(
        (g: HolidayGroup) =>
          g.type_name === "National Holiday" || g.type_name === "Mandatory",
      )
      .flatMap((g: HolidayGroup) => g.holidays);
  }, [holidaysData]);

  const optionalHolidays: Holiday[] = useMemo(() => {
    return (
      holidaysData?.find((g: HolidayGroup) => g.type_name === "Optional")
        ?.holidays || []
    );
  }, [holidaysData]);

  const allHolidays: Holiday[] = useMemo(
    () =>
      [...regularHolidays, ...optionalHolidays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [regularHolidays, optionalHolidays],
  );

  const optionalBalance = leaveBalance?.leave_balance?.find((b) =>
    b.type.toLowerCase().includes("optional"),
  );

  const getHolidayStatus = (date: string) => {
    const req = leaveRequests?.find(
      (r) => r.from_date === date && r.to_date === date,
    );
    if (!req) return null;
    if (req.status === "Approved") return "Taken";
    if (req.status === "Rejected") return "Rejected";
    if (req.status === "Open") return "Applied";
    return null;
  };

  const listToShow: Holiday[] = showOptionalOnly
    ? optionalHolidays
    : allHolidays;

  if (
    isUserLoading ||
    isEmployeeLoading ||
    isHolidayLoading ||
    isLeaveReqLoading ||
    isBalanceLoading
  ) {
    return (
      <div className="p-4 sm:p-6">
        <HolidayCardSkeletonList count={6} />
      </div>
    );
  }

  if (isHolidayError) {
    return (
      <div className="p-4 sm:p-6 text-center text-red-500">
        Failed to load holidays
      </div>
    );
  }

  return (
    <div className="px-3 py-4 sm:p-6 min-h-full pb-24 flex bg-none">
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <CustomDropdown
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            variant="outline"
          />
          <button
            type="button"
            onClick={() => setShowOptionalOnly((prev) => !prev)}
            className="text-xs sm:text-sm text-primary font-semibold"
          >
            {showOptionalOnly ? "Show All Holidays" : "Show Optional Holidays"}
          </button>
        </div>

        {showOptionalOnly && attendancePolicy && (
          <div className="flex justify-between text-center py-2 rounded-lg bg-primary/10 mb-3 text-xs sm:text-sm">
            <p className="w-full">
              Entitled:{" "}
              <span className="font-semibold">
                {optionalBalance?.entitled ?? 0}
              </span>
            </p>
            <p className="w-full border-x border-blue-100">
              Availed:{" "}
              <span className="font-semibold">
                {optionalBalance?.availed ?? 0}
              </span>
            </p>
            <p className="w-full">
              Balance:{" "}
              <span className="font-semibold">
                {optionalBalance?.balance ?? 0}
              </span>
            </p>
          </div>
        )}

        {!attendancePolicy && showOptionalOnly && (
          <p className="text-center text-red-500 mt-2 text-sm">
            ! Please contact HR to assign an attendance policy
          </p>
        )}

        {listToShow.length === 0 ? (
          <NoDataFound title="No Holidays Found" subtitle="There are no holidays available for the selected year." />
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            {listToShow.map((h) => (
              <HolidayCard
                key={h.name}
                holiday={h}
                statusLabel={getHolidayStatus(h.date)}
                showOptionalLabel={
                  h?.leave_type?.toLowerCase() === "optional holiday"
                }
                canRequest={h?.leave_type?.toLowerCase() === "optional holiday"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Holidays;
