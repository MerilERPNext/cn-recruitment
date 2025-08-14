import React, { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isBefore, startOfToday } from "date-fns";
import { FaSortAmountDownAlt, FaSortAmountUp } from "react-icons/fa";
import { HolidayCard } from "./Holidays";

type Holiday = {
  name: string;
  date: string;
  optional?: boolean;
  holiday_name: string;
  type: string;
  description?: string | null;
};

type HolidayType = "regular" | "optional";

interface LocationState {
  type?: HolidayType;
  holidays?: Holiday[];
}

const HolidaysFull: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as LocationState;
  const holidayType: HolidayType = locationState?.type || "regular";
  const holidays: Holiday[] = useMemo(
    () => locationState?.holidays || [],
    [locationState?.holidays]
  );

  const sortedHolidays = useMemo(() => {
    return [...holidays].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [holidays, sortOrder]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  return (
    <div className="flex flex-col bg-white">
      <header className="sticky top-0 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-1">
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="mr-3 p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h1 className="text-xl font-semibold text-slate-900">
              {holidayType === "optional"
                ? "Optional Holidays"
                : "Regular Holidays"}
            </h1>
          </div>

          <button
            type="button"
            aria-label={`Sort by ${sortOrder === "asc" ? "descending" : "ascending"} date`}
            onClick={toggleSortOrder}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            {sortOrder === "asc" ? (
              <FaSortAmountDownAlt className="w-5 h-5" />
            ) : (
              <FaSortAmountUp className="w-5 h-5" />
            )}
            <span className="ml-1 text-sm">
              {sortOrder === "asc" ? "Earliest" : "Latest"}
            </span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        {holidays.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No holidays available</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedHolidays.map((h) => {
              const dateObj = new Date(h.date);
              return (
                <HolidayCard
                  key={`${h.date}-${h.holiday_name}`}
                  holiday={h}
                  showApply={holidayType === "optional"}
                  disabledApply={
                    holidayType === "optional" &&
                    isBefore(dateObj, startOfToday())
                  }
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default HolidaysFull;



