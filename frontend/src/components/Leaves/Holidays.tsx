import * as React from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";

type Holiday = {
  name: string;
  date: string;
  optional?: boolean;
};

interface HolidayCardProps {
  holiday: Holiday;
  showApply?: boolean;
  disabledApply?: boolean;
}

const REGULAR_HOLIDAYS: Holiday[] = [
  { name: "Christmas Day", date: "2025-12-25" },
  { name: "New Year’s Day", date: "2025-01-01" },
  { name: "Independence Day", date: "2025-07-04" },
  { name: "Labor Day", date: "2025-09-01" },
];

const OPTIONAL_HOLIDAYS: Holiday[] = [
  { name: "Good Friday", date: "2025-04-18", optional: true },
  { name: "Assumption of Mary", date: "2025-08-15", optional: true },
  { name: "All Saints’ Day", date: "2025-11-01", optional: true },
  { name: "Immaculate Conception", date: "2025-12-08", optional: true },
];

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
          <span className="font-medium text-gray-900">{holiday.name}</span>
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
            })
          }
          className={`text-sm font-medium border p-2 px-4 rounded-lg transition-colors duration-200
            ${
              disabledApply
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

  const [showAllRegular, setShowAllRegular] = React.useState(false);
  const [showAllOptional, setShowAllOptional] = React.useState(false);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingRegular = React.useMemo(() => {
    return REGULAR_HOLIDAYS.filter((h) => new Date(h.date) >= today).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [today]);

  const upcomingOptional = React.useMemo(() => {
    return OPTIONAL_HOLIDAYS.filter((h) => new Date(h.date) >= today).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [today]);

  const displayedRegular = showAllRegular
    ? upcomingRegular
    : upcomingRegular.slice(0, DISPLAY_LIMIT);

  const displayedOptional = showAllOptional
    ? upcomingOptional
    : upcomingOptional.slice(0, DISPLAY_LIMIT);

  return (
    <div className="p-4 min-h-full pb-24">
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          Upcoming Regular Holidays
        </h2>

        {upcomingRegular.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No upcoming regular holidays
          </p>
        ) : (
          <>
            {displayedRegular.map((h) => (
              <HolidayCard
                key={`${h.date}-${h.name}`}
                holiday={h}
                showApply={false}
              />
            ))}

            {upcomingRegular.length > DISPLAY_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllRegular((x) => !x)}
                className="w-full bg-black text-white py-2 my-2 rounded-lg font-medium"
              >
                {showAllRegular
                  ? "View Less"
                  : `View More (${upcomingRegular.length - DISPLAY_LIMIT} more)`}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                navigate("/webapp/leave-app/leaves/holidays/all", {
                  state: { type: "regular" },
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
              Total: <span className="font-semibold">5</span>
            </p>
            <p className="border-x border-black w-full">
              Availed: <span className="font-semibold">3</span>
            </p>
            <p className="w-full">
              Remaining: <span className="font-semibold">2</span>
            </p>
          </div>
        </div>

        {upcomingOptional.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No upcoming optional holidays
          </p>
        ) : (
          <>
            {displayedOptional.map((h) => (
              <HolidayCard key={`${h.date}-${h.name}`} holiday={h} showApply />
            ))}

            {upcomingOptional.length > DISPLAY_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllOptional((x) => !x)}
                className="w-full bg-black text-white py-2 my-2 rounded-lg font-medium"
              >
                {showAllOptional
                  ? "View Less"
                  : `View More (${upcomingOptional.length - DISPLAY_LIMIT} more)`}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                navigate("/webapp/leave-app/leaves/holidays/all", {
                  state: { type: "optional" },
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
