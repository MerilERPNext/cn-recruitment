import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaSortAmountDownAlt, FaSortAmountUp } from "react-icons/fa";
import { HolidayCard } from "./Holidays";
import { Holiday } from "../../types/leaves";
import { useMyLeaveRequests } from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { Typography } from "../shared/atoms/Typography";

type HolidayType = "regular" | "optional";

interface LocationState {
  type?: HolidayType;
  holidays?: Holiday[];
}

const HolidaysFull: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();
  const location = useLocation();
  const { setRefetch } = useLeaveRequestRefresh();

  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const { data: leaveRequests, refetch } = useMyLeaveRequests(
    currentEmployee?.name
  );

  useEffect(() => {
    const unsubscribe = setRefetch(refetch);
    return unsubscribe;
  }, [refetch, setRefetch]);

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

  const getHolidayStatus = (holidayDate: string) => {
    if (!leaveRequests) return null;
    const request = leaveRequests.find(
      (req) => req.from_date === holidayDate && req.to_date === holidayDate
    );
    if (!request) return null;
    if (request.status === "Approved") return "Taken";
    if (request.status === "Rejected") return "Rejected";
    if (request.status === "Open") return "Applied";
    return null;
  };

  return (
    <div className="flex flex-col">
      <header className="sticky top-0  shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-1">
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="mr-3 p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
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

            <Typography variant="subheading">
              {holidayType === "optional"
                ? "Optional Holidays"
                : "Regular Holidays"}
            </Typography>
          </div>

          <button
            type="button"
            aria-label={`Sort by ${
              sortOrder === "asc" ? "descending" : "ascending"
            } date`}
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
              return (
                <HolidayCard
                  key={`${h.date}-${h.holiday_name}`}
                  holiday={h}
                  showApply={holidayType === "optional"}
                  statusLabel={
                    holidayType === "optional"
                      ? getHolidayStatus(h.date)
                      : undefined
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
