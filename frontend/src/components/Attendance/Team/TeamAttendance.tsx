import DatePicker from "react-datepicker";
import EmployeeStatusCard from "./EmployeeStatusCard";
import FrappeListView from "../../ListView";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import { EmployeeStatus } from "../../../types/attendance";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TeamAttendance = () => {
  const { isDesktop } = useScreenSize();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [refetchFn, setRefetchFn] = useState<(() => void) | null>(null);

  const [searchParams] = useSearchParams();

  // Parse filters from URL on mount
  useEffect(() => {
    const filtersParam = searchParams.get("filters");
    if (filtersParam) {
      try {
        const filters = JSON.parse(decodeURIComponent(filtersParam));
        if (filters.attendance_date) {
          setSelectedDate(new Date(filters.attendance_date));
        }
      } catch (err) {
        console.error("Invalid filter format in URL", err);
      }
    }
  }, [searchParams]);

  const clearFilters = () => {
    setSelectedDate(new Date());
    navigate("/webapp/attendance/team-attendance"); // Remove query entirely
  };

  const hasFilters = searchParams.has("filters");

  const navigate = useNavigate();

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse">
      <div className="px-4 py-2 flex gap-2">
        <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white">
      <div className="flex flex-col gap-2 pb-4">
        {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}
        <div className="bg-white w-full border-b-1 border-gray-200">
          <div className="employee_datepicker--small flex items-end flex-col p-1">
            <DatePicker
              inline
              selected={selectedDate}
              showPopperArrow={false}
              showMonthDropdown={false}
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="flex items-center justify-between px-2 py-2">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="p-1 rounded-md border-1 border-gray-200 bg-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-semibold">
                    {date.toLocaleString("default", { month: "long" })}{" "}
                    {date.getFullYear()}
                  </span>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="p-1 rounded-md border-1 border-gray-200 bg-gray-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
              onChange={(date) => {
                if (!date) return;
                const localDateStr = date.toISOString().split("T")[0];
                setSelectedDate(date);
                const filters = {
                  attendance_date: localDateStr,
                };
                navigate(
                  "/webapp/attendance/team-attendance?filters=" +
                    encodeURIComponent(JSON.stringify(filters))
                );
              }}
              dayClassName={(date) => {
                const isSelected =
                  date.toDateString() === selectedDate?.toDateString();
                const baseClasses = "transition-all duration-200";

                if (isDesktop) {
                  // Desktop styling
                  if (isSelected) {
                    return `${baseClasses} border-2 font-bold border-black text-black rounded-md`;
                  }
                  return `${baseClasses} hover:!bg-gray-50 !text-gray-700 border border-transparent rounded-lg hover:border-gray-200 hover:shadow-sm`;
                } else {
                  // Mobile styling
                  return isSelected
                    ? "border-2 font-bold border-black text-black rounded-md"
                    : "transparent";
                }
              }}
              renderDayContents={(day, date) => {
                const isSelected =
                  date.toDateString() === selectedDate?.toDateString();

                if (isDesktop) {
                  return (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-1">
                      <span className={`text-sm text-black font-semibold`}>
                        {day}
                      </span>
                    </div>
                  );
                }

                // Mobile rendering for selected day
                return (
                  <div
                    className={`relative  w-full h-full flex justify-center items-center p-1 ${
                      isSelected ? "font-bold rounded-md text-black" : ""
                    }`}
                  >
                    {day}
                  </div>
                );
              }}
            />

            {/* Clear Button */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className={`top-2 right-2 pb-2 pr-2 text-gray-500 hover:text-black transition `}
                title="Today"
              >
                Today
              </button>
            )}
          </div>
        </div>
        {/* ------------------------------------------------- Calendar End ---------------------------------------------- */}

        {/* <EmployeeStatusCard /> */}
        <div className="bg-white pt-4 border-gray-200 p-4 mb-10">
          <FrappeListView
            doctype="Attendance"
            ItemComponent={(props: { item: EmployeeStatus }) => {
              return (
                <EmployeeStatusCard
                  data={props?.item}
                  onRefetchData={refetchFn}
                />
              );
            }}
            SkeletonComponent={CardSkeleton}
            onItemClick={() => {}}
            infiniteScroll={true}
            isFilter={false}
            onRefetchAvailable={useCallback((refetch: () => void) => {
              setRefetchFn(() => refetch);
            }, [])}
            defaultFilters={{
              attendance_date: new Date(selectedDate || "").toISOString(),
            }}
            defaultFields={[
              "shift",
              "working_hours",
              "employee_name",
              "status",
              "in_time",
              "out_time",
              "name",
              "employee",
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default TeamAttendance;
