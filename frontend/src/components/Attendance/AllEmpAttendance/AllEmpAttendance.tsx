import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid as isValidDate,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Edit,
  LogIn,
  MoreVertical,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useGetAllEventsAndAttendance } from "../../../hooks/useAttendance";
import LayoutHeader from "../../shared/LayoutHeader";

import { useQueryClient } from "@tanstack/react-query";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { AttendanceRecord } from "../../../types/attendance";
import { isActionEnabled } from "../../../utils/uiPermission";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import { ViewAll } from "../../shared/atoms/ViewAll";
import DropdownMenu from "../../shared/DropDownMenu";
import Modal from "../../shared/Modal";
import SideDrawer, { DrawerSize } from "../../shared/SideDrawer";
import Tooltip from "../../shared/Tooltip";
import EmployeeAttendanceDetails from "../Employee/EmployeeAttendanceDetails";
import AuditReport from "../Employee/EmployeeAttendence/AuditReport";
import CheckInStatus from "../Employee/EmployeeAttendence/CheckInStatus";
import OvertimeLog from "../Employee/EmployeeAttendence/OvertimeLog";
import RegularizeDrawer from "../Employee/EmployeeAttendence/RegularizeDrawer";
import ViewPolicies from "../Employee/EmployeeAttendence/ViewPolicies";
import { EditAttendance } from "../Team/EditAttendance";
import { AttendanceAdjustmentForm } from "./AttendanceAdjustments/AttendanceAdjustmentForm";
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

/* -------------------- Component -------------------- */

const AllEmpAttendance = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const queryClient = useQueryClient();
  const [openSidebarFor, setOpenSidebarFor] = useState<{
    isOpen: boolean;
    for: string | null;
    label: string;
    sideBarSize: DrawerSize;
  }>({ isOpen: false, for: null, label: "", sideBarSize: "xl" });

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [editAttendance, setEditAttendance] = useState(false);
  const [showAttendanceAdjustmentForm, setShowAttendanceAdjustmentForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [showDetailsFor, setShowDetailsFor] = useState<{
    date: Date;
    status: string;
    data: AttendanceRecord;
    events?: AttendanceRecord[];
  } | null>(null);

  const [selectedDateKeys, setSelectedDateKeys] = useState<Set<string>>(
    new Set(),
  );

  const onRefetchData = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["get-All-Events-And-Attendance"],
      exact: false,
    });
  }, [queryClient]);

  /* Auto refresh */
  useEffect(() => {
    onRefetchData();
  }, [onRefetchData]);

  /* API range */
  const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const {
    data: allEventsAndAttendance,
    isError,
    error,
  } = useGetAllEventsAndAttendance({ start, end });
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRegularize = isActionEnabled(
    userUiPermission,
    "regularize_attendance",
    "My Attendance",
  );
  const canEditAttendance = isActionEnabled(
    userUiPermission,
    "edit_attendance",
    "My Attendance",
  );

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const currentDateParam = searchParams.get("date");
    const newDateISO = currentMonth?.toISOString() || "";

    if (currentDateParam !== newDateISO) {
      setSearchParams({ date: newDateISO }, { replace: true });
    }
  }, [currentMonth, setSearchParams, searchParams]);

  /* 🔥 Types and helper functions from EmployeeAttendance */
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
    return createAttendanceStatusGetter(allEventsAndAttendance ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEventsAndAttendance]);

  /* 🔥 Generate complete month data for list view */
  const completeMonthData = useMemo(() => {
    const allDates = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    // Build list of dates with their attendance and events
    const items: Array<{
      date: Date;
      statusInfo: AttendanceStatusInfo;
    }> = [];

    allDates.forEach((date) => {
      const statusInfo = getAttendanceStatus(date);

      // Always add an item for each date (even if no data)
      items.push({
        date,
        statusInfo,
      });
    });

    return items;
  }, [getAttendanceStatus, currentMonth]);

  const selectedRows = useMemo(
    () => completeMonthData.filter((item) =>
      selectedDateKeys.has(format(item.date, "yyyy-MM-dd")),
    ),
    [completeMonthData, selectedDateKeys],
  );

  const allSelected =
    completeMonthData.length > 0 &&
    selectedDateKeys.size === completeMonthData.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDateKeys(new Set());
    } else {
      setSelectedDateKeys(
        new Set(completeMonthData.map((item) => format(item.date, "yyyy-MM-dd"))),
      );
    }
  };

  const toggleRow = (dateKey: string) => {
    setSelectedDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  /* Error state */
  if (isError) {
    return (
      <div className="bg-white">
        <LayoutHeader tab="All Attendance" onBack={() => navigate(-1)} />
        <div className="h-screen flex flex-col items-center justify-center gap-3">
          <Typography color="error">
            {error?.message || "Failed to load attendance"}
          </Typography>
          <Button size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <LayoutHeader tab="All Attendance" onBack={() => navigate(-1)} />

      {/* 🔁 Month Navigation */}
      <div className="relative flex justify-between items-center py-3 px-4 ">
        {/* 🔙 Back Icon — LEFT CORNER */}
        {isDesktop && (
          <button
            onClick={() => navigate("/webapp/attendance/emp-attendance")}
            className="flex items-center text-gray-600 hover:text-black transition-colors w-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* 📅 Month Navigation — CENTER */}
        <div className="mx-auto flex items-center justify-center gap-2 w-full">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Typography
            variant={isDesktop ? "bodyMedium" : "bodySmall"}
            className="font-semibold text-center"
          >
            {format(currentMonth, "MMM yyyy")}
          </Typography>

          <Button
            size="sm"
            variant="subtle"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2 justify-end items-center w-full">
          <ViewAll
            title={isDesktop ? "Calendar View" : "Cal View"}
            className="text-gray-500 px-2 flex gap-1 justify-center items-center text-nowrap"
            onClick={() => {
              navigate("/webapp/attendance/emp-attendance");
            }}
          />
          <div className="flex gap-2">
            {canRegularize && <RegularizeDrawer />}

            <DropdownMenu
              placement={"bottom-left"}
              items={[
                {
                  label: "View Policies",
                  icon: <Shield className="h-4 w-4" />,
                  onClick: () => {
                    setOpenSidebarFor({
                      isOpen: true,
                      for: "policies",
                      label: "View Policies",
                      sideBarSize: "xl",
                    });
                  },
                },
                {
                  label: "Check In Status",
                  icon: <LogIn className="h-4 w-4" />,
                  onClick: () => {
                    setOpenSidebarFor({
                      isOpen: true,
                      for: "checkInStatus",
                      label: "Check In Status",
                      sideBarSize: "xxl",
                    });
                  },
                },
                {
                  label: "Audit Report",
                  icon: <ClipboardPlus className="h-4 w-4" />,
                  onClick: () => {
                    setOpenSidebarFor({
                      isOpen: true,
                      for: "auditReport",
                      label: "Audit Report",
                      sideBarSize: "xxl",
                    });
                  },
                },
                {
                  label: "Overtime Log",
                  icon: <ClipboardPlus className="h-4 w-4" />,
                  onClick: () => {
                    setOpenSidebarFor({
                      isOpen: true,
                      for: "overtimeLog",
                      label: "Overtime Log",
                      sideBarSize: "xxl",
                    });
                  },
                },
              ]}
            >
              <button className="p-1 border-1 rounded-lg hover:bg-gray-200">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenu>
          </div>
          <SideDrawer
            open={openSidebarFor.isOpen}
            onClose={() =>
              setOpenSidebarFor({
                isOpen: false,
                for: null,
                label: "",
                sideBarSize: "xl",
              })
            }
            side="right"
            title={openSidebarFor.label}
            size={openSidebarFor.sideBarSize}
          >
            <div className="pb-20">
              {openSidebarFor.for === "policies" && <ViewPolicies />}
              {openSidebarFor.for === "checkInStatus" && <CheckInStatus />}
              {openSidebarFor.for === "auditReport" && <AuditReport />}
              {openSidebarFor.for === "overtimeLog" && <OvertimeLog />}
            </div>
          </SideDrawer>
        </div>
      </div>

      {/* Attendance List */}
      <div className="px-4 pb-4">

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  Requests
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  Shift
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  Check In
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  Check Out
                </th>
                {canEditAttendance && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {completeMonthData.map((item, index) => {
                const { date, statusInfo } = item;
                const record = statusInfo.record;

                // Map status to display string
                const getStatusDisplay = (status: Status): string => {
                  switch (status) {
                    case "present":
                      return "Present";
                    case "absent":
                      return "Absent";
                    case "on-leave":
                      return "On Leave";
                    case "half-day":
                      return "Half Day";
                    case "work-from-home":
                      return "Work From Home";
                    case "holiday":
                      return "Holiday";
                    case "week-off":
                      return "Weekly Off";
                    case "unpaid":
                      return "On Leave";
                    case "default":
                      return "Not Marked";
                    default:
                      return status;
                  }
                };

                // Get event badge color
                const getEventColor = (
                  doctype: string,
                  statusLabel?: string,
                ): string => {
                  const normalizedStatus = statusLabel?.toLowerCase().trim();

                  if (
                    normalizedStatus === "leave approval" ||
                    normalizedStatus === "leave approval pending"
                  ) {
                    return "bg-yellow-50 text-yellow-700 border border-yellow-200";
                  }

                  if (normalizedStatus === "approved" || normalizedStatus === "leave approved") {
                    return "bg-green-50 text-green-700 border border-green-200";
                  }

                  if (normalizedStatus === "rejected") {
                    return "bg-red-50 text-red-700 border border-red-200";
                  }

                  if (normalizedStatus === "revoked") {
                    return "bg-gray-50 text-gray-700 border border-gray-200";
                  }

                  if (normalizedStatus === "out duty") {
                    return "bg-purple-50 text-purple-700 border border-purple-200";
                  }

                  if (normalizedStatus === "attendance adjustment") {
                    return "bg-blue-50 text-blue-700 border border-blue-200";
                  }

                  switch (doctype) {
                    case "Attendance Request":
                      return "bg-blue-50 text-blue-700 border border-blue-200";
                    case "Leave Request":
                      return "bg-pink-50 text-pink-700 border border-pink-200";
                    case "Overtime Request":
                      return "bg-orange-50 text-orange-700 border border-orange-200";
                    case "Out Duty":
                      return "bg-purple-50 text-purple-700 border border-purple-200";
                    default:
                      return "bg-blue-50 text-blue-700 border border-blue-200";
                  }
                };

                // Get status color
                const getStatusColor = (status: Status): string => {
                  switch (status) {
                    case "present":
                      return "bg-green-100 text-green-700";
                    case "absent":
                      return "bg-red-100 text-red-700";
                    case "on-leave":
                    case "unpaid":
                    case "half-day":
                      return "bg-orange-100 text-orange-700";
                    case "week-off":
                    case "holiday":
                      return "bg-blue-100 text-blue-700";
                    case "default":
                      return "bg-gray-100 text-gray-700";
                    default:
                      return "bg-gray-100 text-gray-700";
                  }
                };

                // // Filter out approved attendance requests (they're already reflected in attendance)
                // const displayEvents = statusInfo.events.filter(
                //   (event) => !(event.doctype === "Attendance Request" && event.status === "Approved")
                // );

                // Skip weekly offs for modal

                return (
                  <tr
                    key={`${format(date, "yyyy-MM-dd")}-${index}`}
                    onClick={() => {
                      setShowDetailsFor({
                        date: date,
                        data:
                          record ||
                          ({
                            name: `placeholder-${format(date, "yyyy-MM-dd")}`,
                            doctype: "Attendance",
                            start: format(date, "yyyy-MM-dd"),
                            end: format(date, "yyyy-MM-dd"),
                            title: "No Data",
                            status: getStatusDisplay(statusInfo.status),
                            docstatus: "",
                            employee: "",
                          } as AttendanceRecord),
                        status: statusInfo.status.replace(/-/g, " "),
                        events: statusInfo.events,
                      });
                    }}
                    className={`hover:bg-primary-50 transition-colors cursor-pointer`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedDateKeys.has(format(date, "yyyy-MM-dd"))}
                        onChange={() => toggleRow(format(date, "yyyy-MM-dd"))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(date, "dd MMM yyyy, EEE")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(statusInfo.status)}`}
                      >
                        {getStatusDisplay(statusInfo.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-normal text-sm text-gray-700">
                      {statusInfo.events.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {statusInfo.events.map((event, i) => {
                            const eventType =
                              event.doctype === "Attendance Request" &&
                                event.request_type === "Out Duty"
                                ? event.request_type
                                : event.doctype;
                            const eventLabel =
                              event?.custom_status || event?.status;
                            return (
                              <Tooltip content={eventType}>
                                <span
                                  key={i}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEventColor(eventType, eventLabel)}`}
                                >
                                  {eventLabel}
                                </span>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {record?.shift ? `${record.shift}` : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {record?.doctype === "Attendance"
                        ? formatTimeSafe(record.in_time)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {record?.doctype === "Attendance"
                        ? formatTimeSafe(record.out_time)
                        : "-"}
                    </td>
                    {canEditAttendance && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <Button
                          variant="subtle"
                          size="sm"
                          contentAlign="start"
                          disabled={record?.doctype !== "Attendance"}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (record && record.doctype === "Attendance") {
                              setSelectedRecord(record);
                              setEditAttendance(true);
                            }
                          }}
                        >
                          <Tooltip content="Edit">
                            <Edit size={16} />
                          </Tooltip>
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selectedRows?.length > 0 && (
          <div className=" w-full sticky bottom-6 left-0 right-0 flex justify-center items-center z-50">
            <div className="px-4 py-3 w-[100%] flex justify-between bg-white items-center shadow-lg rounded-md gap-2">

              {selectedRows.length > 0 && <Typography variant="bodySmall" className="text-primary-600 font-medium">
                {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected
              </Typography>}


              <div className="flex items-center gap-2">

                <Button
                  variant="subtle"
                  onClick={() => setSelectedDateKeys(new Set())}
                >
                  Clear
                </Button>
                <Button
                  variant="contain"
                  bgColor="primary"
                  size="md"
                  onClick={() => setShowAttendanceAdjustmentForm(true)}
                >
                  Adjustment Adjustment
                </Button>
              </div>
            </div>
          </div>
        )}
        {showAttendanceAdjustmentForm &&
          <AttendanceAdjustmentForm
            selectedRows={selectedRows || []}
            onCancel={() => {
              setShowAttendanceAdjustmentForm(false);
            }}
            onSuccess={() => {
              setShowAttendanceAdjustmentForm(false);
              onRefetchData();
              setSelectedDateKeys(new Set());
            }}
          />}
        <EditAttendance
          employeeId={selectedRecord?.employee || ""}
          employeeName={selectedRecord?.employee_name || ""}
          onClose={() => {
            setEditAttendance(false);
            setSelectedRecord(null);
          }}
          open={editAttendance}
          requestId={selectedRecord?.name}
          onRefetchData={onRefetchData}
        />
        {/* Details Modal */}
        {showDetailsFor && (
          <Modal
            isOpen
            onClose={() => setShowDetailsFor(null)}
            size={isDesktop ? "sm" : "full"}
          >
            <EmployeeAttendanceDetails
              data={showDetailsFor.data}
              events={showDetailsFor.events}
              date={showDetailsFor.date}
              status={showDetailsFor.status}
              onClose={() => setShowDetailsFor(null)}
            />
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AllEmpAttendance;
