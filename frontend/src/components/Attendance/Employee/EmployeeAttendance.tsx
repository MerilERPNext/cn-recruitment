import { useMemo, useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import {

  ChevronLeft,
  ChevronRight,
  Plus,
 
} from "lucide-react";
import {
  useGetAllEventsAndAttendance,
  usePlannedOvertimeAllowed,
} from "../../../hooks/useAttendance";
import {
  AttendanceRecord,
  
} from "../../../types/attendance";
import { useNavigate } from "react-router";
import AttndanceRequestForm from "../AttendanceRequest/AttendanceRequestForm";
import { endOfMonth, format, startOfMonth, parse } from "date-fns";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import BottomDrawer from "../../shared/BottomDrawer";
import LeaveRequest from "../LeaveRequest";
import { gradientClassMap } from "../../../utils/helperUtils";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CreateOvertimeRequest from "../OvertimeRequests/CreateOvertimeRequest";
import EmployeeAttendanceDetails from "./EmployeeAttendanceDetails";
import Modal from "../../shared/Modal";
import { useSidebar } from "../SidebarContext";

import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CardTable from "../../shared/CardTable";
import AttendanceLegend from "../../EmployeeAttendence/AttendanceLegend";
import AttendanceError from "../../EmployeeAttendence/AttendanceError";
import ListView from "../../EmployeeAttendence/ListView";

import CardTablee from "../../EmployeeAttendence/CardTable";
import AttendanceCalendar from "../../EmployeeAttendence/AttendanceCalendar";
import BottomDrowerForAttendance from "../../EmployeeAttendence/BottomDrower";

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { setSidebarOpen } = useSidebar();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showDetailsFor, setShowDetailsFor] = useState<{
    date: Date;
    status: string;
    data: AttendanceRecord;
  } | null>(null);
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  // Update sidebar context when showDetailsFor changes
  useEffect(() => {
    setSidebarOpen(!!showDetailsFor && isDesktop);
  }, [showDetailsFor, isDesktop, setSidebarOpen]);

  const getEventDotColor = (doctype: string): string => {
    switch (doctype) {
      case "Attendance Request":
        return "bg-blue-500";
      case "Leave Request":
        return "bg-pink-500";
      case "Overtime Request":
        return "bg-orange-500";
      default:
        return "bg-gray-400";
    }
  };


  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const start = format(startOfMonth(selectedDate as Date), "yyyy-MM-dd");
  const end = format(endOfMonth(selectedDate as Date), "yyyy-MM-dd");

  const {
    data: allAttendance,
    isError,
    error, 
  } = useGetAllEventsAndAttendance({ start: start, end: end });

  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    currentEmployee?.employee || ""
  );
  const [showReqAttendanceCorrection, setShowReqAttendanceCorrection] =
    useState<boolean>(false);

  const [showOvertimeRequest, setShowOvertimeRequest] =
    useState<boolean>(false);
  const [showLeaveRequest, setShowLeaveRequest] = useState<boolean>(false);

  const [openDrawer, setOpenDrawer] = useState<boolean>(false);

  // const CardSkeleton = () => (
  //   <CardSkeletons/>
  // );

  
  type Status =
    | "present"
    | "absent"
    | "on-leave"
    | "half-day"
    | "half-day-first-half"
    | "half-day-second-half"
    | "work-from-home"
    | "default"
    | "holiday"
    | "week-off";

  type AttendanceStatusInfo = {
    status: Status;
    firstHalf?: string;
    secondHalf?: string;
    events: AttendanceRecord[]; // all non-attendance-type records on the same day
    record?: AttendanceRecord; // the attendance record whose status is being used
  };

  const parseLocalDate = (dateStr: string): Date =>
    parse(dateStr, "yyyy-MM-dd", new Date());

  const formatDateKey = (date: Date): string => format(date, "yyyy-MM-dd");

  const createAttendanceStatusGetter = (
    attendances: AttendanceRecord[] = []
  ) => {
    const statusMap: Record<string, AttendanceStatusInfo> = {};
    const groupedByDate: Record<string, AttendanceRecord[]> = {};

    attendances.forEach((record) => {
      const dateKey = formatDateKey(parseLocalDate(record.start));
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(record);
    });

    Object.entries(groupedByDate).forEach(([dateKey, records]) => {
      let status: Status = "default";
      let firstHalf = "";
      let secondHalf = "";
      const events: AttendanceRecord[] = [];
      let attendanceRecord: AttendanceRecord | undefined = undefined;

      records.forEach((record) => {
        const isAttendanceType = ["Attendance", "Holiday", "Holidays"].includes(
          record.doctype
        );

        if (isAttendanceType) {
          attendanceRecord = record;
          const rawStatus = record.status?.toLowerCase().trim();
          switch (rawStatus) {
            case "present":
              status = "present";
              break;
            case "absent":
              status = "absent";
              break;
            case "on leave":
            case "leave":
              status = "on-leave";
              break;
            case "holiday":
              status = "holiday";
              break;
            case "weekly off":
              status = "week-off";
              break;
            case "work from home":
              status = "work-from-home";
              break;
            case "half day":
              status = "half-day";
              firstHalf = record.half_day_status_first_half || "";
              secondHalf = record.half_day_status_second_half || "";
              break;
            default:
              status = "default";
          }
        } else {
          events.push(record);
        }
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (status === "half-day") {
        statusMap[dateKey] = {
          status,
          firstHalf,
          secondHalf,
          events,
          record: attendanceRecord,
        };
      } else {
        statusMap[dateKey] = { status, events, record: attendanceRecord };
      }
    });

    return (date: Date): AttendanceStatusInfo => {
      const key = formatDateKey(date);
      return statusMap[key] || { status: "default", events: [] };
    };
  };

  const getAttendanceStatus = useMemo(() => {
    return createAttendanceStatusGetter(allAttendance ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAttendance]);

  if (isError) {
    return <AttendanceError error={error?.message}/>;
  }

  return (
    <div className={`flex  bg-gray-100 `}>
      <div
        className={`flex  bg-gray-100 p-2 flex-col ${
          showDetailsFor ? (isDesktop ? "w-2/3" : "w-full") : "w-full"
        }`}
      >
        {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}

        <div className=" w-full pb-2 bg-white rounded-tl-lg rounded-tr-lg sm:rounded-lg lg:rounded-lg">
          <ListView />
          <AttendanceCalendar
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            getAttendanceStatus={getAttendanceStatus}
            setShowDetailsFor={setShowDetailsFor}
          />
          <div className="p-1 employee-datepicker-lg">
            <DatePicker
              selected={selectedDate}
              showPopperArrow={false}
              showMonthDropdown={false}
              onChange={(date) => {
                setSelectedDate(date);
                const attendance = getAttendanceStatus(date as Date);

                if (
                  attendance?.status !== "default" &&
                  attendance?.status !== "week-off"
                ) {
                  setShowDetailsFor({
                    date: date as Date,
                    status: attendance?.status,
                    data: attendance?.record as AttendanceRecord,
                  });
                } else {
                  setShowDetailsFor(null);
                }
              }}
              onMonthChange={(date) => {
                setSelectedDate(date);
              }}
              openToDate={selectedDate as Date}
              inline
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
              renderDayContents={(day, date) => {
                const attendance = getAttendanceStatus(date);

                const isSelected =
                  selectedDate?.toDateString() === date.toDateString();
                const baseClasses = "transition-all duration-200";
                const highlightClass = (() => {
                  switch (attendance?.status) {
                    case "present":
                      return "!bg-green-100 !text-green-700 rounded-md";
                    case "absent":
                      return "!bg-red-100 !text-red-700 rounded-md";
                    case "on-leave":
                      return "!bg-yellow-100 !text-yellow-700 rounded-md";
                    case "holiday":
                      return "!bg-blue-100 !text-blue-700 rounded-md";
                    case "week-off":
                      return "!bg-gray-200 !text-gray-700 rounded-md";
                    case "work-from-home":
                      return "!bg-purple-100 !text-purple-800 rounded-md";
                    default:
                      return "hover:!bg-gray-100 !text-gray-700 rounded-md";
                  }
                })();
                const selectedClass = isSelected
                  ? "border-2 font-bold border-black rounded-md"
                  : "";

                const dayClasses = `${baseClasses} ${highlightClass} ${selectedClass}`;
                const dayBoxStyles = `w-full h-full flex items-center justify-center text-base ${dayClasses}`;

                if (attendance?.status === "half-day") {
                  const firstColor =
                    gradientClassMap[
                      attendance?.firstHalf?.toLowerCase() || ""
                    ];
                  const secondColor =
                    gradientClassMap[
                      attendance?.secondHalf?.toLowerCase() || ""
                    ];
                  const gradient = `linear-gradient(to bottom right, ${firstColor} 50%, ${secondColor} 50%)`;

                  return (
                    <div
                      className={dayBoxStyles}
                      style={{
                        backgroundImage: gradient,
                        borderRadius: "0.375rem",
                        color: "black",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {day}
                    </div>
                  );
                }
                return (
                  <div className={dayBoxStyles}>
                    <div className="flex flex-col items-center gap-1">
                      <span>{day}</span>
                      {attendance?.events?.length > 0 && (
                        <div className="flex gap-1">
                          {Array.from(
                            new Set(
                              attendance?.events?.map((event) => event.doctype)
                            )
                          ).map((doctype, index) => (
                            <div
                              key={index}
                              className={`w-[6px] h-[6px] rounded-full ${getEventDotColor(
                                doctype
                              )}`}
                              title={doctype}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>

          {/* Legends - Only show for mobile since desktop shows at top */}
          {!isDesktop && <AttendanceLegend isCompact={true} />}
        </div>
        {/* Legend */}

        {/* ------------------------------------------------- Calendar End---------------------------------------------- */}

        {/* Request Attendance Correction - Only show for mobile */}
        {!isDesktop && (
          <div className="bg-white p-4 border-b-1 border-gray-200 rounded-bl-lg rounded-br-lg">
            <div className="flex gap-2">
              <button
                className="w-full flex items-center justify-center text-md flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                onClick={() => {
                  setOpenDrawer(!openDrawer);
                  // setShowReqAttendanceCorrection(!showReqAttendanceCorrection);
                }}
              >
                <Plus className="w-4 h-4 mr-2 font-bold" />
                Raise Request
              </button>
            </div>
          </div>
        )}

        {/* Request Attendance Correction */}

        {/* My Attendance Requests */}
        <div className="pb-20 px-2 bg-white mt-2 rounded-lg">
          <div className="flex justify-between items-center w-full p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 ">
              My Attendance Requests
            </h3>
            <p
              onClick={() => navigate("/webapp/attendance/attendance-request")}
              className="text-sm text-blue-500 cursor-pointer"
            >
              View All
            </p>
          </div>
          <CardTable
            titles={[
              "Request Type",
              "From Date",
              "To Date",
              "Status",
              "Actions",
            ]}
          >
            <CardTablee
              currentEmployee={
                currentEmployee
                  ? { employee: currentEmployee.employee }
                  : undefined
              }
              refetchAttendance={refetchAttendance}
              setRefetchAttendance={setRefetchAttendance}
            />
          </CardTable>
        </div>
        {showReqAttendanceCorrection && (
          <AttndanceRequestForm
            onClose={() => {
              setShowReqAttendanceCorrection(false);
            }}
          />
        )}
        {showLeaveRequest && (
          <LeaveRequest
            onCancel={() => {
              setShowLeaveRequest(false);
            }}
          />
        )}
        {showOvertimeRequest && (
          <CreateOvertimeRequest
            onCancel={() => {
              setShowOvertimeRequest(false);
            }}
          />
        )}
        <BottomDrowerForAttendance
          setShowLeaveRequest={setShowLeaveRequest}
          setOpenDrawer={setOpenDrawer}
          setShowReqAttendanceCorrection={setShowReqAttendanceCorrection}
          setShowOvertimeRequest={setShowOvertimeRequest}
          plannedOvertimAllowed={plannedOvertimAllowed}
          openDrawer={openDrawer}
        />
      </div>

      {/* Conditionally render the details component */}
      {showDetailsFor && isDesktop && (
        <div className="w-1/3 h-screen sticky top-2">
          <EmployeeAttendanceDetails
            data={showDetailsFor?.data}
            date={showDetailsFor.date}
            status={showDetailsFor.status}
            onClose={() => setShowDetailsFor(null)}
          />
        </div>
      )}

      {/* Modal for mobile devices */}
      {showDetailsFor && !isDesktop && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetailsFor(null)}
          size="full"
        >
          <EmployeeAttendanceDetails
            data={showDetailsFor?.data}
            date={showDetailsFor.date}
            status={showDetailsFor.status}
            onClose={() => setShowDetailsFor(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default EmployeeAttendance;
