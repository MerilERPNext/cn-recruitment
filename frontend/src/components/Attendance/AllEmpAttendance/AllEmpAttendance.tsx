import { useNavigate } from "react-router";
import LayoutHeader from "../../shared/LayoutHeader";
import { ChevronLeft, ChevronRight, LogIn, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  format,
  parse,
  isValid as isValidDate,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";
import { getStatusGradient } from "../../../utils/helperUtils";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Modal from "../../shared/Modal";
import EmployeeAttendanceDetails from "../Employee/EmployeeAttendanceDetails";
import { AttendanceRecord } from "../../../types/attendance";
import { Typography } from "../../shared/atoms/Typography";
import Button from "../../shared/atoms/Button";
import { useQueryClient } from "@tanstack/react-query";

/* -------------------- Helpers -------------------- */

const formatTimeSafe = (timeStr?: string) => {
  if (!timeStr) return "--:--";
  try {
    const parsed = parse(timeStr, "HH:mm:ss", new Date());
    if (!isValidDate(parsed)) return "--:--";
    return format(parsed, "HH:mm");
  } catch {
    return "--:--";
  }
};

const getStatusColor = (status: string, isUnpaid: boolean) => {
  if (isUnpaid) return "bg-orange-100 text-orange-600";

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
      return "bg-blue-100 text-blue-700";
    case "weekly off":
      return "bg-gray-200 text-gray-700";
    case "not marked":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-50 text-gray-700";
  }
};

/* -------------------- Component -------------------- */

const AllEmpAttendance = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const queryClient = useQueryClient();

  /* 🔑 Single month state */
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const [showDetailsFor, setShowDetailsFor] = useState<{
    date: Date;
    status: string;
    data: AttendanceRecord;
  } | null>(null);

  /* Auto refresh */
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["get-All-Events-And-Attendance"],
      exact: false,
    });
  }, [queryClient]);

  /* API range */
  const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const {
    data: allEventsAndAttendance,
    isError,
    error,
  } = useGetAllEventsAndAttendance({ start, end });

  /* 🔥 Generate full month data (NO FEATURE LOSS) */
  const completeMonthData = useMemo(() => {
    if (!allEventsAndAttendance) return [];

    const allDates = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const dataByDate = new Map<string, AttendanceRecord[]>();

    allEventsAndAttendance.forEach((item) => {
      const key = format(new Date(item.start), "yyyy-MM-dd");
      if (!dataByDate.has(key)) dataByDate.set(key, []);
      dataByDate.get(key)?.push(item);
    });

    const priority: Record<string, number> = {
      Holiday: 1,
      "Attendance Request": 2,
      Attendance: 3,
    };

    const result: AttendanceRecord[] = [];

    allDates.forEach((date) => {
      const key = format(date, "yyyy-MM-dd");
      const items = dataByDate.get(key);

      if (items?.length) {
        const sorted = [...items].sort(
          (a, b) => (priority[a.doctype] || 99) - (priority[b.doctype] || 99),
        );
        result.push(...sorted);
      } else {
        result.push({
          name: `placeholder-${key}`,
          doctype: "Attendance",
          start: key,
          end: key,
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

    return result;
  }, [allEventsAndAttendance, currentMonth]);

  /* Error state */
  if (isError) {
    return (
      <>
        <LayoutHeader tab="All Attendance" onBack={() => navigate(-1)} />
        <div className="h-screen flex flex-col items-center justify-center gap-3">
          <Typography color="error">
            {error?.message || "Failed to load attendance"}
          </Typography>
          <Button size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <LayoutHeader tab="All Attendance" onBack={() => navigate(-1)} />

      {/* 🔁 Month Navigation */}
      <div className="relative flex items-center py-3 px-4">
        {/* 🔙 Back Icon — LEFT CORNER */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 flex items-center text-gray-600 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* 📅 Month Navigation — CENTER */}
        <div className="mx-auto flex items-center gap-4">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Typography variant="bodyMedium" className="font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </Typography>

          <Button
            size="sm"
            variant="subtle"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Attendance List */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {completeMonthData.map((item, index) => {
          const dateObj = new Date(item.start);
          const date = dateObj.getDate();
          const day = dateObj.toLocaleString("default", {
            weekday: "short",
          });

          if (item.doctype === "Attendance Request") return null;

          return (
            <div
              key={index}
              onClick={() => {
                if (item.status?.toLowerCase() !== "weekly off") {
                  setShowDetailsFor({
                    date: dateObj,
                    data: item,
                    status: item.status?.toLowerCase(),
                  });
                }
              }}
              className="flex items-center p-4 border border-gray-100 bg-white shadow-sm rounded-xl hover:shadow-md transition cursor-pointer"
            >
              {/* Date Box */}
              <div
                className={`flex flex-col items-center justify-center rounded-md p-4 w-14 ${getStatusColor(
                  item.status?.toLowerCase(),
                  item.custom_auto_created === 1,
                )}`}
                style={
                  item.status?.toLowerCase() === "half day"
                    ? getStatusGradient(
                        item.half_day_status_first_half || "",
                        item.half_day_status_second_half || "",
                      )
                    : {}
                }
              >
                <div className="text-lg font-bold">{date}</div>
                <div className="text-sm capitalize">{day}</div>
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col gap-1 ml-4">
                <div className="flex justify-between items-center">
                  <Typography className="font-semibold">
                    {item.status}
                  </Typography>
                  {item.shift && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Shift {item.shift}
                    </span>
                  )}
                </div>

                {item.doctype === "Attendance" && (
                  <div className="flex justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <LogIn
                        className={`h-4 w-4 ${
                          item.in_time ? "text-green-600" : "text-gray-600"
                        }`}
                      />
                      {formatTimeSafe(item.in_time)}
                    </div>
                    <div className="flex items-center gap-2">
                      <LogOut
                        className={`h-4 w-4 ${
                          item.out_time ? "text-red-600" : "text-gray-600"
                        }`}
                      />
                      {formatTimeSafe(item.out_time)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      {showDetailsFor && (
        <Modal
          isOpen
          onClose={() => setShowDetailsFor(null)}
          size={isDesktop ? "sm" : "full"}
        >
          <EmployeeAttendanceDetails
            data={showDetailsFor.data}
            date={showDetailsFor.date}
            status={showDetailsFor.status}
            onClose={() => setShowDetailsFor(null)}
          />
        </Modal>
      )}
    </>
  );
};

export default AllEmpAttendance;
