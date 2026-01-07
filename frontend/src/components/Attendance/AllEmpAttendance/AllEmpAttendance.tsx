import { useNavigate } from "react-router";
import LayoutHeader from "../../shared/LayoutHeader";
import { CalendarDays, CalendarSearch, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import SelectByMonth, { MonthOption } from "./SelectByMonth";

import {
  endOfMonth,
  format,
  parse,
  startOfMonth,
  isValid as isValidDate,
  eachDayOfInterval,
} from "date-fns";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";
import { getStatusGradient } from "../../../utils/helperUtils";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Modal from "../../shared/Modal";
import EmployeeAttendanceDetails from "../Employee/EmployeeAttendanceDetails";
import { AttendanceRecord } from "../../../types/attendance";
import { useMemo } from "react";
import { Typography } from "../../shared/atoms/Typography";
import Button from "../../shared/atoms/Button";

const formatTimeSafe = (timeStr: string | undefined) => {
  if (!timeStr) return "--:--";
  try {
    const parsed = parse(timeStr, "HH:mm:ss", new Date());
    if (!isValidDate(parsed)) return "--:--";
    return format(parsed, "HH:mm");
  } catch {
    return "--:--";
  }
};

const AllEmpAttendance = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const [showSelectByMonth, setShowSelectByMonth] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>({
    label: format(new Date(), "MMM-yyyy"),
    value: format(new Date(), "yyyy-MM"),
  });
  const [showDetailsFor, setShowDetailsFor] = useState<{
    date: Date;
    status: string;
    data: AttendanceRecord;
  } | null>(null);

  const selectedMonthStr =
    selectedMonth?.value ?? format(new Date(), "yyyy-MM");
  const parsedDate = parse(selectedMonthStr, "yyyy-MM", new Date());

  const start = format(startOfMonth(parsedDate), "yyyy-MM-dd");
  const end = format(endOfMonth(parsedDate), "yyyy-MM-dd");
  const {
    data: allEventsAndAttendance,
    isError,
    error,
  } = useGetAllEventsAndAttendance({
    start: start,
    end: end,
  });

  // Generate complete month data with all dates filled in
  const completeMonthData = useMemo(() => {
    if (!allEventsAndAttendance) return [];

    // Generate all dates in the selected month
    const allDatesInMonth = eachDayOfInterval({
      start: startOfMonth(parsedDate),
      end: endOfMonth(parsedDate),
    });

    // Create a map of API data by date for quick lookup
    const dataByDate = new Map<string, AttendanceRecord[]>();
    allEventsAndAttendance.forEach((item) => {
      const dateKey = format(new Date(item.start), "yyyy-MM-dd");
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, []);
      }
      dataByDate.get(dateKey)?.push(item);
    });

    // Generate complete data for all dates
    const completeData: AttendanceRecord[] = [];

    allDatesInMonth.forEach((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const itemsForDate = dataByDate.get(dateKey);

      if (itemsForDate && itemsForDate.length > 0) {
        // If we have data for this date, add ALL items (could be multiple: attendance + requests + holidays)
        // Sort by priority: Holiday/Weekly Off -> Attendance Request -> Attendance
        const priority: Record<string, number> = {
          Holiday: 1,
          "Attendance Request": 2,
          Attendance: 3,
        };
        const sortedItems = itemsForDate.sort((a, b) => {
          return (priority[a.doctype] || 99) - (priority[b.doctype] || 99);
        });

        // Add ALL items for this date
        completeData.push(...sortedItems);
      } else {
        // No data for this date, create a placeholder
        completeData.push({
          name: `placeholder-${dateKey}`,
          doctype: "Attendance",
          start: dateKey,
          end: dateKey,
          title: "No Data",
          status: "Not Marked",
          docstatus: "",
          employee: "",
          half_day_status_first_half: undefined,
          half_day_status_second_half: undefined,
          in_time: undefined,
          out_time: undefined,
          shift: undefined,
        } as AttendanceRecord);
      }
    });

    return completeData;
  }, [allEventsAndAttendance, parsedDate]);

  // Handle error state
  if (isError) {
    return (
      <>
        <HeaderBar
          title="All Employee Attendance"
          onBack={() => navigate(-1)}
          rightSlot={
            (
              <button onClick={() => setShowSelectByMonth(true)}>
                <CalendarDays />
              </button>
            ) as React.ReactNode
          }
        />

        <div className="mx-auto bg-gray-50 h-screen mt-14 px-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">
              Error Loading Attendance Data
            </div>
            <Typography variant="bodySmall" color="body2" className="text-gray-600 mb-4">
              {error?.message || "Unable to load attendance information"}
            </Typography>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              variant="contain"
            >
              Retry
            </Button>
          </div>
        </div>
      </>
    );
  }

  const getStatusColor = (status: string, isUnpaid: boolean) => {
    if (isUnpaid) {
      return "bg-orange-100 text-orange-600";
    }
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "on leave":
        return "bg-yellow-100 text-yellow-600";

      case "work from home":
        return "bg-purple-100 text-purple-700";
      case "holiday":
        return "!bg-blue-100 !text-blue-700";
      case "weekly off":
        return "!bg-gray-200 !text-gray-700";
      case "not marked":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };
  return (
    <>
      <LayoutHeader
        tab={"All Attendance"}
        onBack={() => navigate(-1)}
        children={
          <button onClick={() => setShowSelectByMonth(true)}>
            <CalendarDays />
          </button>
        }
      />

      <div className="mx-auto bg-white h-screen px-4">
        <div className="flex justify-center gap-2 items-center">

          {isDesktop ? (
            <Button
              size="sm"
              variant="subtle"
              className="my-2"
              onClick={() => setShowSelectByMonth(true)}
            >
              <Typography variant="bodyMedium" >
                {selectedMonth?.label}
              </Typography>
              <div
                className=" p-1 rounded-md h-fit"
              >
                <CalendarSearch
                  className="h-5 w-5"
                  key={"desktop-calendar-filter-icon"}
                />
              </div>
            </Button>
          ) :
            <Typography variant="bodyMedium">
              {selectedMonth?.label}
            </Typography>
          }
        </div>

        <div className="flex flex-col gap-2 pb-4">
          {completeMonthData &&
            completeMonthData?.length > 0 &&
            completeMonthData?.map((item, index) => {
              const dateObj = new Date(item?.start);
              const date = dateObj.getDate();
              const day = dateObj.toLocaleString("default", {
                weekday: "short",
              });
              if (item?.doctype === "Attendance Request") {
                return;
              }
              return (
                <div
                  onClick={() => {
                    if (
                      item?.doctype !== "Attendance Request" &&
                      item?.status !== "Weekly Off"
                    ) {
                      setShowDetailsFor({
                        date: dateObj,
                        data: item,
                        status: item?.status?.toLowerCase(),
                      });
                    }
                  }}
                  key={index}
                  className="flex items-center p-4 border border-gray-100 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow space-x-4"
                >
                  {/* Date Box */}
                  <div
                    className={`flex flex-col items-center justify-center rounded-md p-4 w-14 ${getStatusColor(
                      item?.status?.toLocaleLowerCase(),
                      item?.custom_auto_created === 1
                    )}`}
                    style={
                      item?.status?.toLocaleLowerCase() === "half day"
                        ? getStatusGradient(
                          item?.half_day_status_first_half || "",
                          item?.half_day_status_second_half || ""
                        )
                        : {}
                    }
                  >
                    <div className="text-lg leading-none font-bold">{date}</div>
                    <div className="text-sm capitalize leading-tight">
                      {day}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex gap-2 items-center justify-between w-full">
                      <div className="font-semibold text-sm text-gray-800">
                        {item?.status}
                      </div>
                      {item?.shift && (
                        <div className="bg-gray-50 text-gray-700 rounded-xl px-2 py-[2px] h-full text-xs flex items-center justify-center">
                          Shift {item?.shift}
                        </div>
                      )}
                    </div>

                    {item?.doctype === "Attendance" && (
                      <div className="w-full rounded-xl flex justify-between">
                        <div>
                          <Typography variant="label" color="body2">
                            Check In
                          </Typography>
                          <div className="flex justify-center items-center gap-2">
                            <LogIn
                              className={`h-4 w-4 ${item?.in_time
                                ? "text-green-600"
                                : "text-gray-600"
                                }`}
                            />
                            <Typography className="font-semibold text-start">
                              {formatTimeSafe(item?.in_time)}
                            </Typography>
                          </div>
                        </div>
                        <div>
                          <Typography variant="label" color="body2">
                            Check Out
                          </Typography>
                          <div className="flex justify-center items-center gap-2">
                            <LogOut
                              className={`h-4 w-4 ${item?.out_time
                                ? "text-red-600"
                                : "text-gray-600"
                                }`}
                            />
                            <Typography variant="bodyMedium" >
                              {formatTimeSafe(item?.out_time)}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Attendance Details Modal */}
      {showDetailsFor && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetailsFor(null)}
          size={isDesktop ? "sm" : "full"}
        >
          <EmployeeAttendanceDetails
            data={showDetailsFor?.data}
            date={showDetailsFor.date}
            status={showDetailsFor.status}
            onClose={() => setShowDetailsFor(null)}
          />
        </Modal>
      )}

      {showSelectByMonth && (
        <SelectByMonth
          onClose={() => setShowSelectByMonth(false)}
          selected={selectedMonth}
          onChange={(monthObj) => {
            setSelectedMonth(monthObj);
            setShowSelectByMonth(false);
          }}
        />
      )}
    </>
  );
};

export default AllEmpAttendance;
