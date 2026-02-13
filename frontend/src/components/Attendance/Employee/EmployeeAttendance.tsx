import { useMemo, useState, useEffect } from "react";

import {
  useGetAllEventsAndAttendance,
  usePlannedOvertimeAllowed,
} from "../../../hooks/useAttendance";
import { AttendanceRecord } from "../../../types/attendance";
import { useNavigate } from "react-router";
import { endOfMonth, format, startOfMonth, parse } from "date-fns";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";

import LeaveRequest from "../LeaveRequest";

import { useScreenSize } from "../../../hooks/useScreenSize";
import CreateOvertimeRequest from "../OvertimeRequests/CreateOvertimeRequest";
import EmployeeAttendanceDetails from "./EmployeeAttendanceDetails";
import Modal from "../../shared/Modal";
import { useSidebar } from "../SidebarContext";

import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CardTable from "../../shared/CardTable";
import AttendanceLegend from "./EmployeeAttendence/AttendanceLegend";
import AttendanceError from "./EmployeeAttendence/AttendanceError";
import ListView from "./EmployeeAttendence/ListView";

import Cardtable from "./EmployeeAttendence/CardTable";
import AttendanceCalendar from "./EmployeeAttendence/AttendanceCalendar";
import BottomDrowerForAttendance from "./EmployeeAttendence/BottomDrower";
import { ViewAll } from "../../shared/atoms/ViewAll";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import Button from "../../shared/atoms/Button";
import { Card } from "../../shared/atoms/Card";
import { Typography } from "../../shared/atoms/Typography";

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { setSidebarOpen } = useSidebar();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRequestAttendance = isActionEnabled(
    userUiPermission,
    "create_attendance_request",
    "Attendance Summary",
  );

  const [showDetailsFor, setShowDetailsFor] = useState<{
    date: Date;
    status: string;
    data: AttendanceRecord;
    events?: AttendanceRecord[];
  } | null>(null);
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  // Update sidebar context when showDetailsFor changes
  useEffect(() => {
    setSidebarOpen(!!showDetailsFor && isDesktop);
  }, [showDetailsFor, isDesktop, setSidebarOpen]);

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string,
  );
  const start = format(startOfMonth(selectedDate as Date), "yyyy-MM-dd");
  const end = format(endOfMonth(selectedDate as Date), "yyyy-MM-dd");

  const {
    data: allAttendance,
    isError,
    error,
  } = useGetAllEventsAndAttendance({ start: start, end: end });

  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    currentEmployee?.employee || "",
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
    | "unpaid"
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
    attendances: AttendanceRecord[] = [],
  ) => {
    const statusMap: Record<string, AttendanceStatusInfo> = {};
    const groupedByDate: Record<string, AttendanceRecord[]> = {};

    // Helper: expand a start-end date range into all dates
    const expandDateRange = (start: string, end: string): string[] => {
      const days: string[] = [];
      const current = new Date(start);
      const last = new Date(end);

      while (current <= last) {
        days.push(formatDateKey(current));
        current.setDate(current.getDate() + 1);
      }

      return days;
    };

    // First pass → group attendance + range events by date
    attendances.forEach((record) => {
      const isAttendanceType = ["Attendance", "Holiday", "Holidays"].includes(
        record.doctype,
      );

      const hasRange = record.start && record.end;

      // --- If it's an EVENT (not attendance) and has range, expand ---
      if (!isAttendanceType && hasRange) {
        const rangeKeys = expandDateRange(record.start, record.end);

        rangeKeys.forEach((dateKey) => {
          if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
          groupedByDate[dateKey].push(record);
        });

        return;
      }

      // --- Default: single-day add ---
      const dateKey = formatDateKey(parseLocalDate(record.start));
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(record);
    });

    // Second pass → build final statusMap
    Object.entries(groupedByDate).forEach(([dateKey, records]) => {
      let status: Status = "default";
      let firstHalf = "";
      let secondHalf = "";
      const events: AttendanceRecord[] = [];
      let attendanceRecord: AttendanceRecord | undefined = undefined;

      records.forEach((record) => {
        const isAttendanceType = ["Attendance", "Holiday", "Holidays"].includes(
          record.doctype,
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
          // if custom_auto_created is 1 that means its a Unpaid Leave and we treat it like a leave on UI in yellow color
          if (record?.custom_auto_created === 1) {
            status = "unpaid";
          }
        } else {
          // Range-expanded events land here automatically
          events.push(record);
        }
      });

      // Build final object
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

    // Getter
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
    return <AttendanceError error={error?.message} />;
  }

  return (
    <div className={`flex h-full overflow-y-auto min-h-0`}>
      <div
        className={`flex p-0 md:p-2 flex-col ${
          showDetailsFor ? (isDesktop ? "w-2/3" : "w-full") : "w-full"
        }`}
      >
        {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}

        <Card className="pb-2 rounded-tl-lg rounded-tr-lg sm:rounded-lg lg:rounded-lg">
          <ListView />
          <AttendanceCalendar
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            getAttendanceStatus={getAttendanceStatus}
            setShowDetailsFor={setShowDetailsFor}
          />

          {/* Legends - Only show for mobile since desktop shows at top */}
          {!isDesktop && <AttendanceLegend isCompact={true} />}
        </Card>

        {/* Legend */}

        {/* ------------------------------------------------- Calendar End---------------------------------------------- */}

        {/* Request Attendance Correction - Only show for mobile */}
        {!isDesktop && canRequestAttendance && (
          <div className="bg-white p-4 border-b-1 border-gray-200 rounded-bl-lg rounded-br-lg">
            <div className="flex gap-2">
              <Button
                size="lg"
                fullWidth
                onClick={() => {
                  // setOpenDrawer(!openDrawer);
                  setShowReqAttendanceCorrection(!showReqAttendanceCorrection);
                }}
              >
                + Attendance Request
              </Button>
            </div>
          </div>
        )}
        {/* My Attendance Requests */}
        <Card padding="sm" className="p-0 md:pb-20 mt-2 md:mt-4">
          <div className="flex justify-between items-center w-full pb-2">
            <Typography variant="subheading">My Attendance Requests</Typography>

            <ViewAll
              title="View All"
              onClick={() => navigate("/webapp/attendance/attendance-request")}
            />
          </div>
          <CardTable
            columnWidths={[
              "1.5fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
              "1fr",
            ]}
            titles={[
              "Request Type",
              "From Date",
              "To Date",
              "Due Date",
              "Duration",
              "Allocated To",
              "Status",
              "ACTIONS",
            ]}
          >
            <Cardtable
              currentEmployee={
                currentEmployee
                  ? { employee: currentEmployee.employee }
                  : undefined
              }
              refetchAttendance={refetchAttendance}
              setRefetchAttendance={setRefetchAttendance}
            />
          </CardTable>
        </Card>
        {showReqAttendanceCorrection && (
          <AttendanceRequestFormV2
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
            events={showDetailsFor?.events}
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
            events={showDetailsFor?.events}
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
