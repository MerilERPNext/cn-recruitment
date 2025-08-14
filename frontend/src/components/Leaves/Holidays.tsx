import React from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import { useGetHolidays } from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { HolidayCardSkeletonList } from "./LeaveSkeletons";

type Holiday = {
  name: string;
  date: string;
  optional?: boolean;
  holiday_name: string;
  type: string;
  description?: string | null;
};

interface HolidayCardProps {
  holiday: Holiday;
  showApply?: boolean;
  disabledApply?: boolean;
}

interface HolidayGroup {
  type_name: string;
  holidays: Holiday[];
}

const DISPLAY_LIMIT = 3;

export const HolidayCard: React.FC<HolidayCardProps> = ({
  holiday,
  showApply,
  disabledApply = false,
}) => {
  const dateObj = new Date(holiday.date);
  const month = format(dateObj, "MMM").toUpperCase();
  const day = format(dateObj, "dd");
  const weekday = format(dateObj, "EEEE");

  const { openModal } = useRequestLeaveModal();

  return (
    <div className="flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 mb-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-semibold text-xs">
          <span className="uppercase leading-none">{month}</span>
          <span className="text-md">{day}</span>
        </div>

        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{holiday.holiday_name}</span>
          <span className="text-blue-700 text-sm">{weekday}</span>
        </div>
      </div>

      {showApply && (
        <button
          type="button"
          disabled={disabledApply}
          onClick={() =>
            openModal({
              fromDate: holiday.date,
              toDate: holiday.date,
              leaveType: "Optional Leave",
              source: "holiday",
              hideHalfDayToggle: true,
            })
          }
          className={`text-sm font-medium border p-2 px-4 rounded-lg transition-colors duration-200
            ${disabledApply
              ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
              : "text-blue-600 border-gray-10 shadow-[0_1px_2px_0_rgba(0,0,0,.1)]"
            }`}
        >
          Apply
        </button>
      )}
    </div>
  );
};

const Holidays: React.FC = () => {
  const navigate = useNavigate();
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(userId);
  const {
    data: holidaysData,
    isLoading,
    isError,
  } = useGetHolidays(currentEmployee?.name);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { upcomingRegular, upcomingOptional, allRegular, allOptional, optionalStats } = React.useMemo(() => {
    if (!holidaysData || !Array.isArray(holidaysData)) {
      return {
        upcomingRegular: [],
        upcomingOptional: [],
        allRegular: [],
        allOptional: [],
        optionalStats: { total: 0, availed: 0, remaining: 0 }
      };
    }

    const regularHolidays: Holiday[] = [];
    const optionalHolidays: Holiday[] = [];
    const allRegularHolidays: Holiday[] = [];
    const allOptionalHolidays: Holiday[] = [];
    let totalOptional = 0;
    const availedOptional = 0;

    holidaysData.forEach((group: HolidayGroup) => {
      if (!group.holidays || !Array.isArray(group.holidays)) return;

      group.holidays.forEach((holiday) => {
        const holidayDate = new Date(holiday.date);

        if (group.type_name === 'Optional') {

          allOptionalHolidays.push({
            ...holiday,
            optional: true
          });

          if (holidayDate >= today) {
            optionalHolidays.push({
              ...holiday,
              optional: true
            });
          }
        } else if (group.type_name === 'Mandatory' || group.type_name === 'National Holiday') {

          allRegularHolidays.push({
            ...holiday,
            optional: false
          });

          if (holidayDate >= today) {
            regularHolidays.push({
              ...holiday,
              optional: false
            });
          }
        }
        if (group.type_name === 'Optional') {
          totalOptional++;
        }
      });
    });

    const sortedRegular = regularHolidays.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const sortedOptional = optionalHolidays.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const sortedAllRegular = allRegularHolidays.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const sortedAllOptional = allOptionalHolidays.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      upcomingRegular: sortedRegular,
      upcomingOptional: sortedOptional,
      allRegular: sortedAllRegular,
      allOptional: sortedAllOptional,
      optionalStats: {
        total: totalOptional,
        availed: availedOptional,
        remaining: totalOptional - availedOptional
      }
    };
  }, [holidaysData, today]);

  const displayedRegular = upcomingRegular.slice(0, DISPLAY_LIMIT);
  const displayedOptional = upcomingOptional.slice(0, DISPLAY_LIMIT);

  if (isLoading || isUserLoading || isEmployeeLoading) {
    return (
      <div className="p-4 min-h-full pb-24">
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Upcoming Regular Holidays
          </h2>
          <HolidayCardSkeletonList count={3} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-4">
              Upcoming Optional Holidays
            </h2>
            <div className="flex justify-between text-center border py-2 rounded-lg mb-4">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          </div>
          <HolidayCardSkeletonList count={3} />
        </section>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 min-h-full pb-24">
        <div className="flex items-center justify-center py-8">
          <div className="text-red-500">Failed to load holidays. Please try again later.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-full pb-24">
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Upcoming Regular Holidays
        </h2>

        {displayedRegular.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No upcoming regular holidays
          </p>
        ) : (
          <>
            {displayedRegular.map((h) => (
              <HolidayCard
                key={`${h.date}-${h.holiday_name}`}
                holiday={h}
                showApply={false}
              />
            ))}

            <button
              type="button"
              onClick={() =>
                navigate("/webapp/leave-app/leaves/holidays/all", {
                  state: {
                    type: "regular",
                    holidays: allRegular
                  },
                })
              }
              className="flex-1 w-full py-3 my-2 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              View All
            </button>
          </>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4">
            Upcoming Optional Holidays
          </h2>
          <div className="flex justify-between text-center border py-2 rounded-lg">
            <p className="w-full">
              Total: <span className="font-semibold">{optionalStats.total}</span>
            </p>
            <p className="border-x border-black w-full">
              Availed: <span className="font-semibold">{optionalStats.availed}</span>
            </p>
            <p className="w-full">
              Remaining: <span className="font-semibold">{optionalStats.remaining}</span>
            </p>
          </div>
        </div>

        {displayedOptional.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No upcoming optional holidays
          </p>
        ) : (
          <>
            {displayedOptional.map((h) => (
              <HolidayCard
                key={`${h.date}-${h.holiday_name}`}
                holiday={h}
                showApply
              />
            ))}

            <button
              type="button"
              onClick={() =>
                navigate("/webapp/leave-app/leaves/holidays/all", {
                  state: {
                    type: "optional",
                    holidays: allOptional
                  },
                })
              }
              className="flex-1 w-full my-2 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              View All
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default Holidays;