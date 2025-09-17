import { useMemo, useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import { ArrowLeft, ArrowUpRight, Plus, XCircle } from "lucide-react";
import {
  useGetAllEventsAndAttendance,
  usePlannedOvertimeAllowed,
} from "../../../hooks/useAttendance";
import FrappeListView from "../../ListView";
import { AttendanceRecord, AttendanceRequest } from "../../../types/attendance";
import { useNavigate } from "react-router";
import EmpAttendanceRequestCard from "./EmpAttendanceRequestCard";
import AttndanceRequestForm from "../AttendanceRequest/AttendanceRequestForm";
import { endOfMonth, format, startOfMonth, parse } from "date-fns";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import BottomDrawer from "../../shared/BottomDrawer";
import LeaveRequest from "../LeaveRequest";
import { gradientClassMap } from "../../../utils/helperUtils";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import CreateOvertimeRequest from "../OvertimeRequests/CreateOvertimeRequest";
import EmployeeAttendanceDetails from "./EmployeeAttendanceDetails";
import Modal from "../../shared/Modal";
import { useSidebar } from "../SidebarContext";

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { setSidebarOpen } = useSidebar();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showDetailsFor, setShowDetailsFor] = useState<{
    date: Date;
    status: string;
  } | null>(null);

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

  const AttendanceLegend = ({ isCompact = false }: { isCompact?: boolean }) => {
    const attendanceLegendItems = [
      {
        label: "Present",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
        borderColor: "border-green-200",
      },
      {
        label: "Absent",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        borderColor: "border-red-200",
      },
      {
        label: "On Leave",
        bgColor: "bg-yellow-100",
        textColor: "text-orange-700",
        borderColor: "border-yellow-200",
      },
      {
        label: "WFH",
        bgColor: "bg-purple-100",
        textColor: "text-purple-700",
        borderColor: "border-purple-200",
      },
      {
        label: "Holiday",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
      },
      {
        label: "Week Off",
        bgColor: "bg-gray-200",
        textColor: "text-gray-700",
        borderColor: "border-gray-300",
      },
    ];

    const eventDotLegendItems = [
      { label: "Attendance Request", dotColor: "bg-blue-500" },
      { label: "Leave Request", dotColor: "bg-pink-500" },
      { label: "Overtime Request", dotColor: "bg-orange-500" },
    ];

    const containerClass = isCompact
      ? "flex flex-wrap gap-2 text-xs justify-between px-4"
      : "flex flex-wrap gap-7 text-xs ml-5";

    const itemClass = isCompact
      ? "flex items-center gap-1 px-1 py-1 rounded-lg border"
      : "flex items-center gap-1 px-2 py-1 rounded-lg border";

    return (
      <div className="space-y-3">
        <div className={containerClass}>
          {attendanceLegendItems.map((item, index) => (
            <span
              key={index}
              className={`${itemClass} ${item.bgColor} ${item.textColor} ${item.borderColor}`}
            >
              {item.label}
            </span>
          ))}
        </div>
        <div className={containerClass}>
          <span className="text-gray-700 font-medium mr-2">
            Event Indicators:
          </span>
          {eventDotLegendItems.map((item, index) => (
            <span key={index} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.dotColor}`}></div>
              <span className="text-gray-700">{item.label}</span>
            </span>
          ))}
        </div>
      </div>
    );
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

  const defaultFilters = useMemo(() => {
    if (!currentEmployee?.employee || !selectedDate) return undefined;
    return {
      employee: currentEmployee?.employee,
      creation: ["between", [start, end]],
    };
  }, [currentEmployee, selectedDate, start, end]);

  type AttendanceStatusInfo = {
    status: Status;
    firstHalf?: string;
    secondHalf?: string;
    events: AttendanceRecord[]; // all non-attendance-type records on the same day
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

      records.forEach((record) => {
        const isAttendanceType = ["Attendance", "Holiday", "Holidays"].includes(
          record.doctype
        );

        if (isAttendanceType) {
          // Handle Attendance Request records differently
          if (record.doctype === "Attendance Request") {
            // For attendance requests, use the request type or a pending status
            // You might want to show these as "pending" or based on request type
            const requestStatus = record.status?.toLowerCase().trim();
            if (requestStatus === "approved") {
              // If approved, use the intended status from the request
              status = "present"; // or derive from request details
            } else {
              // For pending/rejected requests, keep current status or mark as pending
              status = status === "default" ? "absent" : status;
            }
          } else {
            // Handle regular Attendance, Holiday records
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
          }
        } else {
          events.push(record);
        }
      });

      statusMap[dateKey] = {
        status,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ...(status === "half-day" ? { firstHalf, secondHalf } : {}),
        events,
      };
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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <XCircle className="w-12 h-12 text-black mx-auto" />
          <h2 className="text-xl font-semibold text-black">
            Error Loading Attendances
          </h2>
          <p className="text-gray-600">{error?.message}</p>
          <button
            onClick={() => {
              navigate(-1);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-2">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex ${showDetailsFor ? "gap-4" : ""}`}>
      <div
        className={`flex flex-col ${
          showDetailsFor ? (isDesktop ? "w-2/3" : "w-full") : "w-full"
        }`}
      >
        {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}

        <div className=" w-full pb-2 bg-white">
          <div className="w-full flex justify-end md:justify-between  items-center border-b-1 border-gray-200 pb-2">
            {/* Desktop: Show legend beside List View, Mobile: Show only List View */}
            {isDesktop && (
              <div className="flex flex-col gap-2 mt-4 mx-5">
                <h4 className="text-sm font-semibold text-gray-700">
                  Attendance Legend:
                </h4>
                <AttendanceLegend />
              </div>
            )}
            <button
              className="text-gray-500 px-2 mt-4 flex gap-1 justify-center items-center"
              onClick={() => {
                navigate("/webapp/attendance/emp-attendance/all");
              }}
            >
              List View
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
          <div className="p-1">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                const attendance = getAttendanceStatus(date as Date);
                if (
                  attendance?.status !== "default" &&
                  attendance?.status !== "week-off" &&
                  attendance?.status !== "holiday"
                ) {
                  setShowDetailsFor({
                    date: date as Date,
                    status: attendance?.status,
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
                  ? "bg-gray-300 text-black border-none rounded-md" // Custom selected day class
                  : "";

                const dayClasses = `${baseClasses} ${highlightClass} ${selectedClass}`;
                const dayBoxStyles = `w-full h-full flex items-center justify-center text-base ${dayClasses}`;

                // Original mobile rendering
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
                              className={`w-2 h-2 rounded-full ${getEventDotColor(
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
          <div className="bg-white p-4 border-b-1 border-gray-200">
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
        <div className="pb-20 px-2 bg-white">
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
            titles={["Request Type", "From Date", "To Date", "Status"]}
          >
            <div>
              <FrappeListView
                doctype="Attendance Request"
                isSearch={false}
                ItemComponent={(props: { item: AttendanceRequest }) => {
                  return (
                    <EmpAttendanceRequestCard
                      data={{
                        ...props?.item,
                        status: props?.item?.custom_status,
                      }}
                      // onClick={() => {
                      //   setShowReqAttendanceCorrection(true);
                      // }}
                    />
                  );
                }}
                showPagination={false}
                SkeletonComponent={CardSkeleton}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                defaultFilters={defaultFilters as any}
                onItemClick={() => {}}
                infiniteScroll={false}
                isFilter={false}
                pageSize={5}
                defaultFields={[
                  "to_date",
                  "from_date",
                  "custom__request_reason",
                  "custom_request_type",
                  "custom_status",
                  "reason",
                  "modified",
                  "creation",
                  "docstatus",
                ]}
              />
            </div>
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
        <BottomDrawer
          isOpen={openDrawer}
          onClose={() => setOpenDrawer(false)}
          children={
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-lg">Raise Request</h2>

              <button
                onClick={() => {
                  setShowLeaveRequest(true);
                  setOpenDrawer(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg transition-colors "
              >
                Leave Request
              </button>
              <div className="border-b border-gray-200 m-0 p-0"></div>
              <button
                onClick={() => {
                  setShowReqAttendanceCorrection(true);
                  setOpenDrawer(false);
                }}
                className="w-full text-left px-4 py-2  hover:bg-gray-200 rounded-lg transition-colors"
              >
                Attendance Request
              </button>
              <div className="border-b border-gray-200 m-0 p-0"></div>

              {plannedOvertimAllowed ? (
                <button
                  onClick={() => {
                    setShowOvertimeRequest(true);
                    setOpenDrawer(false);
                  }}
                  className="w-full text-left px-4 py-2  hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Planned Overtime Request
                </button>
              ) : null}
            </div>
          }
        />
      </div>

      {/* Conditionally render the details component */}
      {showDetailsFor && isDesktop && (
        <div className="w-1/3 h-screen sticky top-0">
          <EmployeeAttendanceDetails
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
