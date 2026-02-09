import DatePicker from "react-datepicker";
import EmployeeStatusCard, { EmployeeStatusItem } from "./EmployeeStatusCard";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../../shared/atoms/Button";
import { Card } from "../../shared/atoms/Card";
import {
  useDataOfAttendance,
  useDataOfAttendanceDetails,
} from "../../../hooks/useAttendance";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import CustomFilter from "./SeletedFilter";

const TeamAttendance = () => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const [selectedReporties, setSelectedReporties] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const {
    data: employeeAttendanceDetails,
    isLoading: isEmployeeAttendanceLoading,
    isError: isEmployeeAttendanceError,
  } = useDataOfAttendance(user?.employee || "");

  const {
    data: attendanceData,
    isLoading: isReportiesAttendanceLoading,
    isError: isReportiesAttendanceError,
    refetch: refetchReportiesAttendance, // ✅ added
  } = useDataOfAttendanceDetails(
    selectedReporties,
    selectedDate?.toISOString().split("T")[0] || "",
  );
  console.log(
    "TeamAttendance attendanceData",
    attendanceData,
    isReportiesAttendanceError,
    isEmployeeAttendanceError,
    isEmployeeAttendanceLoading,
  );

  // ✅ refetch when reportee or date changes
  useEffect(() => {
    if (selectedReporties) {
      refetchReportiesAttendance();
    }
  }, [selectedReporties, selectedDate, refetchReportiesAttendance]);

  const filteredAttendanceData = attendanceData?.filter(
    (item: EmployeeStatusItem) =>
      item.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleReportiesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReporties(e.target.value);
  };

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
    navigate("/webapp/attendance/team-attendance");
  };

  const hasFilters = searchParams.has("filters");

  return (
    <div className="h-full overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 p-4">
        {/* ---------------- Calendar ---------------- */}
        <div className="w-full border-gray-200">
          <Card
            radius="xl"
            className="employee_datepicker--small flex items-end flex-col"
          >
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
                  <Button
                    variant="subtle"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="p-1 rounded-md bg-gray-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>

                  <span className="base-title">
                    {date.toLocaleString("default", { month: "long" })}{" "}
                    {date.getFullYear()}
                  </span>

                  <Button
                    variant="subtle"
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="p-1 rounded-md bg-gray-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
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
                    encodeURIComponent(JSON.stringify(filters)),
                );
              }}
              renderDayContents={(day, date) => {
                const isSelected =
                  selectedDate?.toDateString() === date.toDateString();
                return (
                  <div
                    style={{
                      borderRadius: "0.375rem",
                      color: "black",
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: isSelected ? "#f0f0f0" : "transparent",
                    }}
                  >
                    {day}
                  </div>
                );
              }}
            />

            {hasFilters && (
              <Button
                onClick={clearFilters}
                className="top-2 right-2 pb-2 pr-2 text-gray-500 hover:text-black transition"
                size="sm"
                variant="subtle"
              >
                Today
              </Button>
            )}
          </Card>
        </div>

        {/* ---------------- List ---------------- */}
        <Card radius="xl" className="bg-white pt-4 border-gray-200 p-4 mb-10">
          {/* Search + Filter */}
          <div className="flex items-center gap-3 w-full mb-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m1.85-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[42px] rounded border border-gray-200 pl-10 pr-3 tw-py-2 focus:tw-outline-none focus:tw-border-blue-500"
              />
            </div>

            <CustomFilter
              value={selectedReporties}
              onChange={handleReportiesChange}
              options={
                employeeAttendanceDetails?.map(
                  (p: { name: string; employee_name: string }) => ({
                    value: p.name,
                    label: `${p.employee_name} (${p.name})`,
                  }),
                ) || []
              }
            />
          </div>

          {isReportiesAttendanceLoading && (
            <div className="text-center py-4 text-gray-500">
              Loading attendance...
            </div>
          )}

          <div className="border border-gray-200 rounded-lg">
            {!isReportiesAttendanceLoading &&
              filteredAttendanceData?.map((item: EmployeeStatusItem) => (
                <EmployeeStatusCard
                  key={item.employee}
                  data={item}
                  onRefetchData={refetchReportiesAttendance}
                />
              ))}
          </div>

          {!isReportiesAttendanceLoading && attendanceData?.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              No attendance data found
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TeamAttendance;
