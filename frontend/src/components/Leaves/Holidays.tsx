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
import { Card } from "../shared/atoms/Card";
import CustomDropdown from "../shared/CustomDropdown";
import DataNotFoundPng from "../../assets/data-not-found.png";

interface HolidayCardProps {
  holiday: Holiday;
  showApply?: boolean;
  disabledApply?: boolean;
  statusLabel?: string | null;
}

export const HolidayCard: React.FC<HolidayCardProps> = ({
  holiday,
  showApply,
  statusLabel,
}) => {
  const dateObj = new Date(holiday.date);
  const month = format(dateObj, "MMM").toUpperCase();
  const day = format(dateObj, "dd");
  const weekday = format(dateObj, "EEEE");

  const { openModal } = useRequestLeaveModal();
  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");

  const canRequestLeave = isActionEnabled(
    userUiPermission,
    "optional_holiday_apply",
    "Holidays",
  );

  return (
    <Card
      padding="sm"
      radius="xl"
      shadow="sm"
      className="w-full mb-2 flex justify-between items-center hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-semibold text-xs">
          <span className="uppercase leading-none">{month}</span>
          <span className="text-base">{day}</span>
        </div>

        <div className="flex flex-col">
          <Typography variant="subheading">{holiday.holiday_name}</Typography>
          <Typography variant="bodySmall" className="text-primary">
            {weekday}
          </Typography>
        </div>
      </div>

      {showApply && !statusLabel && canRequestLeave && (
        <button
          type="button"
          onClick={() =>
            openModal({
              fromDate: holiday.date,
              toDate: holiday.date,
              leaveType: holiday.leave_type,
              source: "holiday",
              hideHalfDayToggle: true,
            })
          }
          className="text-sm font-medium border px-4 py-2 rounded-lg text-primary border-gray-300 hover:bg-primary/5"
        >
          Apply
        </button>
      )}

      {statusLabel && (
        <span
          className={`text-sm px-4 py-1 rounded-2xl border
            ${
              statusLabel === "Taken"
                ? "text-green-600 bg-green-100 border-green-200"
                : statusLabel === "Rejected"
                  ? "text-red-600 bg-red-100 border-red-200"
                  : "text-yellow-600 bg-yellow-100 border-yellow-200"
            }`}
        >
          {statusLabel}
        </span>
      )}
    </Card>
  );
};

const Holidays: React.FC = () => {
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
  const { data: employee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(userId);

  const { setRefetch } = useLeaveRequestRefresh();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const y = currentYear - 2 + i;
      return { value: String(y), label: String(y) };
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
  const selectedYearDate = useMemo(() => {
    return `${year}-01-01`;
  }, [year]);

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

  if (
    isUserLoading ||
    isEmployeeLoading ||
    isHolidayLoading ||
    isLeaveReqLoading ||
    isBalanceLoading
  ) {
    return (
      <div className="p-4">
        <HolidayCardSkeletonList count={6} />
      </div>
    );
  }

  if (isHolidayError) {
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load holidays
      </div>
    );
  }

  return (
    <div className="p-4 min-h-full pb-24">
      <div className="flex justify-between items-end mb-4">
        <Typography variant="subheading">Regular Holidays</Typography>
        <CustomDropdown
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={yearOptions}
        />
      </div>

      <section className="mb-8">
        {regularHolidays.length === 0 ? (
          <div className=" flex flex-col items-center">
            <img src={DataNotFoundPng} alt="" className="size-60 mt-4" />
            <Typography variant="h3" className="mt-4" color="disabled">
              No regular holidays found
            </Typography>
          </div>
        ) : (
          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
            {regularHolidays.map((h) => (
              <HolidayCard key={h.name} holiday={h} showApply={false} />
            ))}
          </div>
        )}
      </section>

      <section>
        <Typography variant="subheading">Optional Holidays</Typography>

        {attendancePolicy && (
          <div className="flex justify-between text-center py-2 rounded-lg bg-primary/10 my-3 divide-x-1 divide-primary">
            <p className="w-full">
              Entitled:{" "}
              <span className="font-semibold">
                {optionalBalance?.entitled ?? 0}
              </span>
            </p>
            <p className="w-full border-x">
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

        {!attendancePolicy ? (
          <p className="text-center text-red-500 mt-4">
            ! Please contact HR to assign an attendance policy
          </p>
        ) : optionalHolidays.length === 0 ? (
          <div className=" flex flex-col items-center">
            <img src={DataNotFoundPng} alt="" className="size-60 mt-4" />
            <Typography variant="h3" className="mt-4" color="disabled">
              No optional holidays found
            </Typography>
          </div>
        ) : (
          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
            {optionalHolidays.map((h) => (
              <HolidayCard
                key={h.name}
                holiday={h}
                showApply
                statusLabel={getHolidayStatus(h.date)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Holidays;
