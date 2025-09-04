import DatePicker from "react-datepicker";
import EmployeeStatusCard from "./EmployeeStatusCard";
import FrappeListView from "../../ListView";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import { EmployeeStatus } from "../../../types/attendance";
import { useScreenSize } from "../../../hooks/useScreenSize";

const TeamAttendance = () => {
  const { isDesktop } = useScreenSize();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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
          <div className="flex items-end flex-col p-1">
            <DatePicker
              inline
              selected={selectedDate}
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
                  // Enhanced desktop styling with light colors
                  if (isSelected) {
                    return `${baseClasses} !bg-blue-50 !text-blue-800 border border-blue-200 rounded-lg shadow-sm hover:shadow-md hover:scale-105`;
                  }
                  return `${baseClasses} hover:!bg-gray-50 !text-gray-700 border border-transparent rounded-lg hover:border-gray-200 hover:shadow-sm`;
                } else {
                  // Original mobile styling
                  return isSelected ? "bg-blue-100" : "transparent";
                }
              }}
              renderDayContents={(day, date) => {
                if (isDesktop) {
                  const isSelected =
                    date.toDateString() === selectedDate?.toDateString();
                  // const isToday =
                  //   date.toDateString() === new Date().toDateString();

                  return (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-1">
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-blue-800" : "text-gray-700"
                        }`}
                      >
                        {day}
                      </span>
                      {/* {isToday && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                        </div>
                      )} */}
                    </div>
                  );
                }
                return <>{day}</>;
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
        <div className="bg-white pt-4 border-gray-200 p-4 ">
          <FrappeListView
            doctype="Attendance"
            ItemComponent={(props: { item: EmployeeStatus }) => {
              return <EmployeeStatusCard data={props?.item} />;
            }}
            SkeletonComponent={CardSkeleton}
            onItemClick={() => {}}
            infiniteScroll={true}
            isFilter={false}
            defaultFilters={{
              attendance_date: new Date().toISOString(),
            }}
            defaultFields={["employee_name", "status", "in_time", "out_time"]}
          />
        </div>
      </div>
    </div>
  );
};

export default TeamAttendance;
