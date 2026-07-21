import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import {
  useAllowApplicationOfOptionalHolidaysForPastDates,
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
import CustomDropdown from "../shared/CustomDropdown";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import StatusBadge from "../shared/atoms/statusBadge";

interface HolidayWithType extends Holiday {
  type_name?: string;
}

interface DateBadgeProps {
  date: string;
  type: string;
}

const DateBadge: React.FC<DateBadgeProps> = ({ date, type }) => {
  const dateObj = new Date(date);
  const day = format(dateObj, "dd");
  const month = format(dateObj, "MMM").toUpperCase();

  const isOptional = type === "Optional" || type === "Optional Holiday";
  const colorClass = isOptional
    ? "bg-blue-50 text-blue-600"
    : "bg-primary/10 text-primary";

  return (
    <div
      className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${colorClass} font-semibold`}
    >
      <span className="text-lg leading-none">{day}</span>
      <span className="text-[10px] mt-0.5 opacity-80">{month}</span>
    </div>
  );
};

const HolidayRow: React.FC<{
  holiday: HolidayWithType;
  statusLabel?: string | null;
  canRequest?: boolean;
  index: number;
}> = ({ holiday, statusLabel, canRequest }) => {
  const { openModal } = useRequestLeaveModal();
  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");

  const canApplyPermission = isActionEnabled(
    userUiPermission,
    "optional_holiday_apply",
    "Holidays",
  );

  const showRequestButton = canRequest && !statusLabel && canApplyPermission;

  const dateObj = new Date(holiday.date);
  const weekday = format(dateObj, "EEEE");

  const renderStatus = () => {
    if (!statusLabel) return null;
    return <StatusBadge status={statusLabel} />;
  };

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-4 pl-4 pr-3 align-middle">
        <DateBadge
          date={holiday.date}
          type={holiday.type_name || holiday.type}
        />
      </td>
      <td className="py-4 px-3 align-middle">
        <span className="text-gray-900 font-medium text-sm sm:text-base">
          {holiday.holiday_name}
        </span>
      </td>
      <td className="py-4 px-3 align-middle">
        <span className="text-gray-600 text-sm">{weekday}</span>
      </td>
      <td className="py-4 px-3 align-middle text-sm text-gray-600">
        {holiday.type_name === "Mandatory"
          ? "Holiday"
          : holiday.type_name || "Holiday"}
      </td>
      <td className="py-4 px-3 align-middle">{renderStatus()}</td>
      <td className="py-4 pl-3 pr-4 align-middle text-right">
        {showRequestButton && (
          <button
            onClick={() =>
              openModal({
                fromDate: holiday.date,
                toDate: holiday.date,
                leaveType: holiday.leave_type,
                leaveTypeName: holiday.leave_type_name,
                source: "holiday",
                hideHalfDayToggle: true,
              })
            }
            className="px-4 py-1.5 rounded-md border border-primary-200 text-primary text-sm font-medium hover:bg-purple-50 transition-colors"
          >
            Request
          </button>
        )}
      </td>
    </tr>
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
  const {
    data: allowPastOptionalHolidayRequests,
    isLoading: isPastOptionalHolidayRuleLoading,
  } = useAllowApplicationOfOptionalHolidaysForPastDates();

  console.log(
    "allowPastOptionalHolidayRequests",
    allowPastOptionalHolidayRequests,
  );

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
    useGetLeaveBalance(employee?.name, selectedYearDate);

  const regularHolidays: HolidayWithType[] = useMemo(() => {
    if (!holidaysData) return [];
    return holidaysData
      .filter(
        (g: HolidayGroup) =>
          g.type_name === "National Holiday" || g.type_name === "Mandatory",
      )
      .flatMap((g: HolidayGroup) =>
        g.holidays.map((h) => ({ ...h, type_name: g.type_name })),
      );
  }, [holidaysData]);

  const optionalHolidays: HolidayWithType[] = useMemo(() => {
    const group = holidaysData?.find(
      (g: HolidayGroup) => g.type_name === "Optional",
    );
    if (!group) return [];
    return group.holidays.map((h) => ({ ...h, type_name: "Optional Holiday" }));
  }, [holidaysData]);

  const allHolidays: HolidayWithType[] = useMemo(
    () =>
      [...regularHolidays, ...optionalHolidays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [regularHolidays, optionalHolidays],
  );

  const optionalBalance = leaveBalance?.leave_balance?.find(
    (b) => b.optional_leave === 1,
  );

  const getHolidayStatus = (date: string) => {
    const req = leaveRequests?.find(
      (r) => r.from_date === date && r.to_date === date,
    );
    if (!req) return null;
    if (req.status === "Approved") return "Approved";
    if (req.status === "Rejected") return "Rejected";
    if (req.status === "Open") return "Pending";
    return null;
  };

  const listToShow: HolidayWithType[] = showOptionalOnly
    ? optionalHolidays
    : allHolidays;

  if (
    isUserLoading ||
    isEmployeeLoading ||
    isHolidayLoading ||
    isLeaveReqLoading ||
    isBalanceLoading ||
    isPastOptionalHolidayRuleLoading
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
    <div className="px-3 py-4 sm:p-6 min-h-full pb-24 flex bg-white/50">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <CustomDropdown
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            variant="outline"
          />
          <button
            type="button"
            onClick={() => setShowOptionalOnly((prev) => !prev)}
            className="text-xs sm:text-sm text-primary font-semibold hover:underline"
          >
            {showOptionalOnly ? "Show All Holidays" : "Show Optional Holidays"}
          </button>
        </div>

        {showOptionalOnly && attendancePolicy && (
          <div className="flex justify-between text-center py-2.5 rounded-xl bg-primary/5 border border-primary/10 mb-6 text-xs sm:text-sm">
            <p className="w-full">
              Entitled:{" "}
              <span className="font-bold text-primary">
                {optionalBalance?.entitled ?? 0}
              </span>
            </p>
            <p className="w-full border-x border-primary/10">
              Availed:{" "}
              <span className="font-bold text-primary">
                {optionalBalance?.availed ?? 0}
              </span>
            </p>
            <p className="w-full text-primary/80">
              Balance:{" "}
              <span className="font-bold text-primary">
                {optionalBalance?.balance ?? 0}
              </span>
            </p>
          </div>
        )}

        {!attendancePolicy && showOptionalOnly && (
          <p className="text-center text-red-500 mb-6 text-sm flex items-center justify-center gap-2 bg-red-50 py-2 rounded-lg border border-red-100">
            <span className="font-bold">!</span> Please contact HR to assign an
            attendance policy
          </p>
        )}

        {listToShow.length === 0 ? (
          <NoDataFound
            title="No Holidays Found"
            subtitle="There are no holidays available for the selected year."
          />
        ) : (
          <div className="rounded-2xl border border-gray-100 overflow-x-auto bg-white shadow-sm ring-1 ring-gray-900/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 pl-4 pr-3 text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="py-4 px-3 text-sm font-semibold text-gray-900">
                    Occasion
                  </th>
                  <th className="py-4 px-3 text-sm font-semibold text-gray-900">
                    Day
                  </th>
                  <th className="py-4 px-3 text-sm font-semibold text-gray-900">
                    Holiday Type
                  </th>
                  <th className="py-4 px-3 text-sm font-semibold text-gray-900">
                    Request Status
                  </th>
                  <th className="py-4 pl-3 pr-4 text-sm font-semibold text-gray-900 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listToShow.map((h, i) => (
                  <HolidayRow
                    key={h.name}
                    holiday={h}
                    statusLabel={getHolidayStatus(h.date)}
                    canRequest={
                      h?.type === "Optional" &&
                      (h.date >= today ||
                        Boolean(allowPastOptionalHolidayRequests))
                    }
                    index={i}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Holidays;
