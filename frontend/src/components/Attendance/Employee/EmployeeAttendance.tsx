import { useCallback, useEffect, useMemo, useState } from "react";

import { differenceInCalendarDays, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { useNavigate } from "react-router";
import {
  useGetAllEventsAndAttendance,
  usePlannedOvertimeAllowed,
} from "../../../hooks/useAttendance";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { AttendanceRecord, MyAttendanceRequest } from "../../../types/attendance";

import LeaveRequest from "../LeaveRequest";

import { useScreenSize } from "../../../hooks/useScreenSize";
import Modal from "../../shared/Modal";
import CreateOvertimeRequest from "../OvertimeRequests/CreateOvertimeRequest";
import { useSidebar } from "../SidebarContext";
import EmployeeAttendanceDetails from "./EmployeeAttendanceDetails";

import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import AttendanceError from "./EmployeeAttendence/AttendanceError";
import AttendanceLegend from "./EmployeeAttendence/AttendanceLegend";
import ListView from "./EmployeeAttendence/ListView";

import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import Button from "../../shared/atoms/Button";
import { Card } from "../../shared/atoms/Card";
import { Typography } from "../../shared/atoms/Typography";
import { ViewAll } from "../../shared/atoms/ViewAll";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import AttendanceCalendar from "./EmployeeAttendence/AttendanceCalendar";
import BottomDrowerForAttendance from "./EmployeeAttendence/BottomDrower";
import Cardtable from "./EmployeeAttendence/CardTable";
import DesktopAttendanceCalendar from "./EmployeeAttendence/DesktopAttendanceCalendar";

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "custom_request_type",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.custom_request_type ?? "",
  },
  { sortable: false },
  {
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.from_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.to_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: MyAttendanceRequest) => item.due_date ?? "",
  },
  {
    sortable: true,
    type: "number",
    field: "duration",
    getValue: (item: MyAttendanceRequest) => {
      const from = item.reference_document?.from_date;
      const to = item.reference_document?.to_date;
      if (!from || !to) return 0;
      return differenceInCalendarDays(new Date(to), new Date(from)) + 1;
    },
  },
  {
    sortable: false,
  },
  { sortable: false },
];


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
    isWeeklyOff?: boolean;
  } | null>(null);
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  // Update sidebar context when showDetailsFor changes
  useEffect(() => {
    setSidebarOpen(!!showDetailsFor && isDesktop);
  }, [showDetailsFor, isDesktop, setSidebarOpen]);

  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
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

  const handleCloseAttendanceRequest = useCallback(() => {
    setShowReqAttendanceCorrection(false);
  }, []);

  const handleCancelLeaveRequest = useCallback(() => {
    setShowLeaveRequest(false);
  }, []);

  const handleCancelOvertimeRequest = useCallback(() => {
    setShowOvertimeRequest(false);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetailsFor(null);
  }, []);

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
    isWeeklyOff?: boolean;
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
      let isWeeklyOff = false;

      records.forEach((record) => {
        const isAttendanceType = ["Attendance", "Holiday", "Holidays"].includes(
          record.doctype,
        );
        const isHoliday = ["Holiday", "Holidays"].includes(record.doctype);

        if (isHoliday && record.weekly_off === 1) {
          isWeeklyOff = true;
        }

        if (isAttendanceType) {
          // Actual Attendance record takes priority over Holiday (e.g. working on a week-off)
          if (isHoliday && attendanceRecord?.doctype === "Attendance") return;
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
          isWeeklyOff,
        };
      } else {
        statusMap[dateKey] = { status, events, record: attendanceRecord, isWeeklyOff };
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
        className={`flex p-0 md:p-2 flex-col ${showDetailsFor ? (isDesktop ? "w-2/3" : "w-full") : "w-full"
          }`}
      >
        {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}

        <ListView />
        <Card className="pb-2 rounded-tl-lg rounded-tr-lg sm:rounded-lg lg:rounded-lg mt-0 pt-0">
          {
            isDesktop ? <DesktopAttendanceCalendar
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              getAttendanceStatus={getAttendanceStatus}
              setShowDetailsFor={setShowDetailsFor}
            /> :
              <AttendanceCalendar
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getAttendanceStatus={getAttendanceStatus}
                setShowDetailsFor={setShowDetailsFor}
              />
          }

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
            columnWidths={["1.5fr", "1fr", "1fr", "1fr", "1fr", "0.8fr", "1fr", "1fr", "1fr"]}
            titles={[
              "Request Type",
              "Assigned To",
              "From Date",
              "To Date",
              "Due Date",
              "Created At",
              "Duration",
              "Status",
              "Actions",
            ]}
            columnSortConfig={COLUMN_SORT_CONFIG}
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
          <AttendanceRequestFormV2 onClose={handleCloseAttendanceRequest} />
        )}
        {showLeaveRequest && (
          <LeaveRequest onCancel={handleCancelLeaveRequest} />
        )}
        {showOvertimeRequest && (
          <CreateOvertimeRequest onCancel={handleCancelOvertimeRequest} />
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
            isWeeklyOff={showDetailsFor.isWeeklyOff}
            onClose={handleCloseDetails}
          />
        </div>
      )}

      {/* Modal for mobile devices */}
      {showDetailsFor && !isDesktop && (
        <Modal isOpen={true} onClose={handleCloseDetails} size="full">
          <EmployeeAttendanceDetails
            data={showDetailsFor?.data}
            events={showDetailsFor?.events}
            date={showDetailsFor.date}
            status={showDetailsFor.status}
            isWeeklyOff={showDetailsFor.isWeeklyOff}
            onClose={handleCloseDetails}
          />
        </Modal>
      )}
    </div>
  );
};

export default EmployeeAttendance;
