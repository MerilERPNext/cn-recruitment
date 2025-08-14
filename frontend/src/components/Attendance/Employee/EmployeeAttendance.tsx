import { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { ArrowLeft, ArrowUpRight, Plus, XCircle } from "lucide-react";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";
import FrappeListView from "../../ListView";
import { AttendanceRecord, AttendanceRequest } from "../../../types/attendance";
import { useNavigate } from "react-router";
import EmpAttendanceRequestCard from "./EmpAttendanceRequestCard";
import AttndanceRequestForm from "../AttendanceRequest/AttendanceRequestForm";
import { endOfMonth, format, startOfMonth } from "date-fns";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import BottomDrawer from "../../shared/BottomDrawer";
import LeaveRequest from "../LeaveRequest";

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  const [showReqAttendanceCorrection, setShowReqAttendanceCorrection] =
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

  const createAttendanceStatusGetter = (
    attendances: AttendanceRecord[] = []
  ) => {
    const statusMap: Record<string, Status> = {};

    const formatDateKey = (date: Date): string =>
      date.toLocaleDateString("en-CA");

    attendances.forEach((record) => {
      const dateKey = formatDateKey(new Date(record.start));
      const rawStatus = record.status?.toLowerCase().trim();

      let status: Status = "default";
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
        case "week off":
          status = "week-off";
          break;
        // case "half-day":
        //   if (record?.custom_half_day_type === "First Half") {
        //     status = "half-day-first-half";
        //   } else if (record?.custom_half_day_type === "Second Half") {
        //     status = "half-day-second-half";
        //   } else {
        //     status = "half-day";
        //   }
        //   break;
        case "work from home":
          status = "work-from-home";
          break;
        case "wfh":
          status = "work-from-home";
          break;
        default:
          status = "default";
      }

      statusMap[dateKey] = status;
    });

    return (date: Date): Status => {
      const key = formatDateKey(date); // avoid UTC shift here too
      return statusMap[key] || "default";
    };
  };

  const getAttendanceStatus = useMemo(() => {
    return createAttendanceStatusGetter(allAttendance ?? []);
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
    <div>
      <div className="flex flex-col">
        {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}

        <div className=" w-full pb-2 bg-white">
          <div className="w-full flex justify-end border-b-1 border-gray-200 pb-2">
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
                const status = getAttendanceStatus(date as Date);
                if (status !== "default" && status !== "holiday") {
                  navigate(
                    `/webapp/attendance/emp-attendance/details?date=${date}&status=${status}`
                  );
                }
              }}
              onMonthChange={(date) => {
                setSelectedDate(date);
              }}
              openToDate={selectedDate as Date}
              inline
              dayClassName={(date) => {
                const status = getAttendanceStatus(date);
                const isSelected =
                  selectedDate?.toDateString() === date.toDateString();
                const baseClasses = "transition-colors duration-200";

                const highlightClass = (() => {
                  switch (status) {
                    case "present":
                      return "!bg-green-100 !text-green-800 rounded-md";
                    case "absent":
                      return "!bg-red-100 !text-red-800 rounded-md";
                    case "on-leave":
                      return "!bg-orange-100 !text-orange-800 rounded-md";
                    case "holiday":
                      return "!bg-blue-100 !text-blue-800 rounded-md";
                    case "week-off":
                      return "!bg-gray-100 !text-gray-800 rounded-md";
                    case "half-day-first-half":
                      return "hard-gradient-green-to-yellow !text-yellow-800 rounded-md";
                    case "half-day-second-half":
                      return "hard-gradient-yellow-to-green !text-yellow-800 rounded-md";
                    case "work-from-home":
                      return "!bg-purple-100 !text-purple-800 border border-purple-200 rounded-md";
                    default:
                      return "hover:!bg-gray-100 !text-gray-700 rounded-md";
                  }
                })();

                // Ignore default "selected" styles
                return `${baseClasses} ${highlightClass} ${
                  isSelected && status === "default"
                    ? "!bg-transparent border-none"
                    : ""
                }`;
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs justify-between px-4">
            <span className="flex items-center gap-1 px-1 py-1 rounded-lg bg-green-100 text-green-800 border border-green-200">
              Present
            </span>

            <span className="flex items-center gap-1 px-1 py-1 rounded-lg bg-red-100 text-red-800 border border-red-200">
              Absent
            </span>

            <span className="flex items-center gap-1 px-1 py-1 rounded-lg bg-orange-100 text-orange-800 border border-orange-200">
              On Leave
            </span>

            <span className="flex items-center gap-1 px-1 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
              WFH
            </span>

            <span className="flex items-center gap-1 px-1 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
              Holiday
            </span>

            <span className="flex items-center gap-1 px-1 py-1 rounded-lg bg-gray-200 text-gray-800 border border-gray-300">
              Week Off
            </span>
          </div>
        </div>
        {/* Legend */}

        {/* ------------------------------------------------- Calendar End---------------------------------------------- */}

        {/* Request Attendance Correction */}

        <div className="bg-white p-4 border-b-1 border-gray-200">
          <div className="flex gap-2">
            <button
              className="w-full bg-gray-900 text-white flex items-center justify-center text-md flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
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

        {/* Request Attendance Correction */}

        {/* My Attendance Requests */}
        <div>
          <div className="flex justify-between items-center w-full p-4 border-b-1 border-b-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 ">
              My Attendance Requests
            </h3>
            <p
              onClick={() => navigate("/webapp/attendance/attendance-request")}
              className="text-sm text-blue-500"
            >
              View All
            </p>
          </div>
          <div className="bg-white px-4">
            <FrappeListView
              doctype="Attendance Request"
              isSearch={false}
              ItemComponent={(props: { item: AttendanceRequest }) => {
                return <EmpAttendanceRequestCard data={props?.item} />;
              }}
              SkeletonComponent={CardSkeleton}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              defaultFilters={defaultFilters as any}
              showRefereshButton={false}
              onItemClick={() => {}}
              infiniteScroll={true}
              isFilter={false}
              pageSize={5}
              defaultFields={["reason", "modified", "creation", "docstatus"]}
            />
          </div>
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
            </div>
          }
        />
      </div>
    </div>
  );
};

export default EmployeeAttendance;
