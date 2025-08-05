import React, { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isBefore, startOfToday } from "date-fns";
import { FaSortAmountDownAlt, FaSortAmountUp } from "react-icons/fa";
import { HolidayCard } from "./Holidays";
import { Holiday } from "../../types/leaves";

const REGULAR_HOLIDAYS: Holiday[] = [
  { name: "New Year's Day", date: "2025-01-01" },
  { name: "Martin Luther King Jr. Day", date: "2025-01-15" },
  { name: "Presidents' Day", date: "2025-02-19" },
  { name: "Memorial Day", date: "2025-05-27" },
  { name: "Juneteenth", date: "2025-06-19" },
  { name: "Independence Day", date: "2025-07-04" },
  { name: "Labor Day", date: "2025-09-01" },
  { name: "Columbus Day", date: "2025-10-14" },
  { name: "Veterans Day", date: "2025-11-11" },
  { name: "Thanksgiving Day", date: "2025-11-28" },
  { name: "Christmas Day", date: "2025-12-25" },
];

const OPTIONAL_HOLIDAYS: Holiday[] = [
  { name: "Makar Sankranti", date: "2025-01-14" },
  { name: "Holi", date: "2025-03-17" },
  { name: "Eid al-Fitr", date: "2025-03-30" },
  { name: "Raksha Bandhan", date: "2025-08-18" },
  { name: "Diwali", date: "2025-10-20" },
];

type HolidayType = "regular" | "optional";

const HolidaysFull: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();
  const location = useLocation();

  const holidayType: HolidayType =
    (location.state as { type?: HolidayType })?.type || "regular";

  const holidays =
    holidayType === "optional" ? OPTIONAL_HOLIDAYS : REGULAR_HOLIDAYS;

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
        <div className="divide-y divide-gray-200">
          {sortedHolidays.map((h) => {
            const dateObj = new Date(h.date);
            return (
              <HolidayCard
                key={`${h.date}-${h.name}`}
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
      </main>
    </div>
  );
};

export default HolidaysFull;
