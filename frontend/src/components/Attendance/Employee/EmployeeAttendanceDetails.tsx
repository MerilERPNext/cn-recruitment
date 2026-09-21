import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { endOfDay, format, startOfDay, isValid, isWithinInterval, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAllEmployeeCheckIns,
  useAllAttendanceRequests,
  useGetOvertimeJournal,
  useAttendanceRequestAttachments,
} from "../../../hooks/useAttendance";
import {
  AttendanceRecord,
  AttendanceRequest,
  EmployeeCheckInLog,
} from "../../../types/attendance";
import { LeaveApplication } from "../../../types/leaves";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { Plus, X } from "lucide-react";
import {
  useGetButtonsStatus,
  useReplaceLeave,
  useRevokeApprovedLeave,
} from "../../../hooks/useLeaves";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import ReplaceLeaveModal from "../../Leaves/ReplaceLeaveModal";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import CircularLoader from "../../shared/atoms/CircularLoader";
import { useRequestLeaveModal } from "../../Leaves/RequestLeaveModalContext";
import { LeaveDetailsCard } from "./LeaveDetailsCard";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import ApprovalFlow from "./ApprovalFlow";
import Badge from "../../shared/Badge";
import { getBadgePropsByStatus } from "../../../utils/helperUtils";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import formatToIndianDate, { formatTime, formatToIndianDateWithTime } from "../../../utils/formatToIndianDate";
import OvertimeJournal from "./OvertimeJournal";
import { useQuery } from "@tanstack/react-query";
import FrappeAPI from "../../../utils/frappeAPI";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";

interface EmployeeAttendanceDetailsProps {
  date?: Date;
  status?: string;
  onClose?: () => void;
  data?: AttendanceRecord;
  events?: AttendanceRecord[];
  isWeeklyOff?: boolean;
}

const EmployeeAttendanceDetails = ({
  date: propDate,
  status: propStatus,
  data,
  events,
  onClose,
  isWeeklyOff,
}: EmployeeAttendanceDetailsProps = {}) => {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const dateParam = query.get("date");
  const { targetEmployeeId } = useTargetUser();
  const status =
    propStatus?.toLowerCase().replace(/-/g, " ") ||
    query.get("status")?.toLowerCase().replace(/-/g, " ");
  const [showReqAttendanceCorrection, setShowReqAttendanceCorrection] =
    useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const queryClient = useQueryClient();
  const replaceLeave = useReplaceLeave();
  const { mutate: revokeLeave, isPending: revokePending } =
    useRevokeApprovedLeave();
  const { openModal: openLeaveModal } = useRequestLeaveModal();

  const validDate = useMemo(() => {
    if (propDate) return propDate;
    const d = new Date(dateParam || "");
    return isValid(d) ? d : null;
  }, [propDate, dateParam]);

  // Check if there are leave or attendance request events
  const leaveEvent = useMemo(() => {
    return events?.find((e) => e.doctype === "Leave Request");
  }, [events]);

  const holidayEvent = useMemo(() => {
    return (
      events?.find((e) => ["Holiday", "Holidays"].includes(e.doctype)) ||
      (["Holiday", "Holidays"].includes(data?.doctype || "") ||
      data?.status?.toLowerCase() === "holiday" ||
      data?.status?.toLowerCase() === "weekly off"
        ? data
        : undefined)
    );
  }, [events, data]);

  const isLeaveRecord =
    data?.custom_auto_created === 1 ||
    status === "on leave" ||
    status === "half day" ||
    !!leaveEvent;

  const leaveApplicationName =
    status === "half day"
      ? data?.leave_application
      : data?.leave_application_name || leaveEvent?.name;

  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  // Only fetch leave details if it's a leave record
  const { data: leaveDetails } = useFrappeDocument(
    "Leave Application",
    isLeaveRecord && leaveApplicationName ? leaveApplicationName : null!,
  ) as { data: LeaveApplication | undefined };
  const effectiveEmployeeId =
    data?.employee || targetEmployeeId || currentEmployee?.employee;

  // Check allowed date range for Attendance Adjustment via check_attachment_mandatory API
  const attachmentQueryDate = useMemo(
    () => (validDate ? format(validDate, "yyyy-MM-dd'T'HH:mm:ssXXX") : ""),
    [validDate]
  );
  const { data: attendanceAdjustmentData } = useAttendanceRequestAttachments(
    effectiveEmployeeId || "",
    attachmentQueryDate,
    "Attendance Adjustment",
  );
  const isDateInAllowedRange = useMemo(() => {
    if (!validDate || !attendanceAdjustmentData) return false;
    const fromStr = attendanceAdjustmentData?.allowed_from_date;
    const toStr = attendanceAdjustmentData?.allowed_to_date;
    if (!fromStr || !toStr) return false;
    try {
      const from = startOfDay(parseISO(fromStr));
      const to = endOfDay(parseISO(toStr));
      return isWithinInterval(validDate, { start: from, end: to });
    } catch {
      return false;
    }
  }, [validDate, attendanceAdjustmentData]);

  const { data: buttonStatus } = useGetButtonsStatus(
    effectiveEmployeeId || "",
  );
  // Fetch open approval todos for Leave Application and Attendance Request
  // to get todo_id and custom_doctype_actions for the Act button.
  const { data: leaveApprovalTodos } = useQuery<any[]>({
    queryKey: ["open-approval-todos-leave", effectiveEmployeeId],
    queryFn: async () => {
      const res: any = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.get_open_approval_todos",
        {
          doctype: "Leave Application",
          employee: effectiveEmployeeId,
          filters: JSON.stringify({ employee: effectiveEmployeeId }),
          page_length: 100,
        },
      );
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.message?.data)) return res.message.data;
      return [];
    },
    enabled: !!effectiveEmployeeId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: attendanceApprovalTodos } = useQuery<any[]>({
    queryKey: ["open-approval-todos-attendance", effectiveEmployeeId],
    queryFn: async () => {
      const res: any = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.get_open_approval_todos",
        {
          doctype: "Attendance Request",
          employee: effectiveEmployeeId,
          filters: JSON.stringify({ employee: effectiveEmployeeId }),
          page_length: 100,
        },
      );
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.message?.data)) return res.message.data;
      return [];
    },
    enabled: !!effectiveEmployeeId,
    staleTime: 2 * 60 * 1000,
  });

  const leaveDocName = leaveDetails?.name || leaveApplicationName;
  const leaveTodoItem = useMemo(() => {
    if (!leaveApprovalTodos || !leaveDocName) return undefined;
    return leaveApprovalTodos.find(
      (t: any) =>
        t?.reference_name === leaveDocName ||
        t?.reference_document?.name === leaveDocName ||
        (leaveApplicationName &&
          (t?.reference_name === leaveApplicationName ||
            t?.reference_document?.name === leaveApplicationName))
    );
  }, [leaveApprovalTodos, leaveDocName, leaveApplicationName]);

  const leaveDetailsFromButtonStatusData = buttonStatus?.leave_applications?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) =>
      !!validDate &&
      !!item?.from_date &&
      formatToIndianDate(item.from_date) === formatToIndianDate(validDate),
  );
  const { start, end } = useMemo(() => {
    if (!validDate) return { start: "", end: "" };
    return {
      start: format(startOfDay(validDate), "yyyy-MM-dd HH:mm:ss"),
      end: format(endOfDay(validDate), "yyyy-MM-dd HH:mm:ss"),
    };
  }, [validDate]);

  const { data: empCheckIns, isLoading } = useAllEmployeeCheckIns(
    validDate && effectiveEmployeeId
      ? [
        ["time", "between", [start, end]],
        ["employee", "=", effectiveEmployeeId],
      ]
      : [],
    { enabled: !!validDate && !!effectiveEmployeeId },
  );
  const { data:
    overtimeJournal, isLoading: isOvertimeLoading, isError: isOvertimeError, error: overtimeError } = useGetOvertimeJournal(
      effectiveEmployeeId || "",
      validDate ? format(validDate, "yyyy-MM-dd") : "",
    );

  const { data: attendanceRequests } = useAllAttendanceRequests(
    1000,
    validDate && effectiveEmployeeId
      ? [
        ["employee", "=", effectiveEmployeeId],
        ["from_date", "<=", format(validDate, "yyyy-MM-dd")],
        ["to_date", ">=", format(validDate, "yyyy-MM-dd")],
        // ["docstatus", "!=", 2],
      ]
      : [],
    {
      enabled: !!validDate && !!effectiveEmployeeId,
    },
  );
  const { data: leaveUserUiPermission } = useGetUiPermission(
    "Leaves and Holidays",
  );
  const canRequestLeave = isActionEnabled(
    leaveUserUiPermission,
    "request_leave",
    "My Requests",
  );
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRequestAttendance = isActionEnabled(
    userUiPermission,
    "create_attendance_request",
    "Attendance Summary",
  );
  const canRevokeLeave = isActionEnabled(
    userUiPermission,
    "revoke_leave_request",
    "My Attendance",
  );
  const canReplaceLeave = isActionEnabled(
    userUiPermission,
    "replace_leave_request",
    "My Attendance",
  );
  const canEditLeave = isActionEnabled(
    userUiPermission,
    "edit_leave_request",
    "My Attendance",
  );

  const combinedAttendanceRequests = useMemo(() => {
    const list: AttendanceRequest[] = [...(attendanceRequests || [])];
    const existingNames = new Set(list.map((r) => r.name).filter(Boolean));

    const checkAndAdd = (item?: AttendanceRecord) => {
      if (
        item &&
        ((item as any).doctype === "Attendance Request" || (item as any).doc_type === "Attendance Request") &&
        item.name &&
        !existingNames.has(item.name)
      ) {
        existingNames.add(item.name);
        list.push({
          name: item.name,
          custom_status: item.status || (item as any).custom_status || "Pending",
          custom_request_type: (item as any).request_type || (item as any).custom_request_type,
          from_date: item.start,
          to_date: item.end,
          employee: item.employee,
          employee_name: (item as any).employee_name,
          docstatus: typeof item.docstatus === "number" ? item.docstatus : 0,
        } as AttendanceRequest);
      }
    };

    if (data) checkAndAdd(data);
    events?.forEach(checkAndAdd);
    return list;
  }, [attendanceRequests, events, data]);

  const hasExistingRequest =
    combinedAttendanceRequests && combinedAttendanceRequests.length > 0;

  // Handler for revoking leave
  const handleRevoke = () => {
    if (!leaveDetails?.name) return;

    revokeLeave(leaveDetails.name, {
      onSuccess: () => {
        // Invalidate the attendance calendar query to refetch data
        queryClient.invalidateQueries({
          queryKey: ["get-All-Events-And-Attendance"],
        });
        if (onClose) {
          onClose();
        }
      },
    });
  };

  // Handler for replacing leave
  const handleReplace = (formData: {
    newLeaveType?: string;
    firstHalfType?: string;
    secondHalfType?: string;
    replaceBoth?: boolean;
    description?: string;
    custom_reason?: string;
    attachment?: unknown;
  }) => {
    if (!data?.leave_application_name) return;

    const replaceBoth = formData.replaceBoth === true;
    replaceLeave.mutate(
      {
        leave_application: data.leave_application_name,
        ...(replaceBoth
          ? {
            first_half_leave_type: formData.firstHalfType,
            second_half_leave_type: formData.secondHalfType,
            replaceBoth: true,
          }
          : { new_leave_type: formData.newLeaveType }),
        reason: formData.custom_reason,
        description: formData.description,
        attachment: formData.attachment,
      },
      {
        onSuccess: () => {
          setShowReplaceModal(false);
          // Invalidate the attendance calendar query to refetch data
          queryClient.invalidateQueries({
            queryKey: ["get-All-Events-And-Attendance"],
          });
          if (onClose) {
            onClose();
          }
        },
      },
    );
  };

  // Handler for editing / creating leave
  const handleEdit = () => {
    if (leaveDetails) {
      openLeaveModal({
        // leaveType: leaveDetails.leave_type,
        fromDate: leaveDetails.from_date,
        toDate: leaveDetails.to_date,
        // halfDay: leaveDetails.half_day === 1,
        // halfDayOption: leaveDetails.custom_half_day_type as
        //   | "First Half"
        //   | "Second Half"
        //   | undefined,
        // half_day_date: leaveDetails.half_day_date || "",
        // custom_second_half_day_date:
        //   leaveDetails.custom_second_half_day_date || "",
        // description: leaveDetails.description,
        // custom_reason: leaveDetails.custom_reason || "",
        // custom_attachment: leaveDetails.custom_attachment
        //   ? [{ url: leaveDetails.custom_attachment }]
        //   : undefined,
        // isEdit: true,
        // leave_application: leaveDetails.name,
        source: "other",
      });
    } else {
      const dateStr = validDate
        ? format(validDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");
      openLeaveModal({
        fromDate: dateStr,
        toDate: dateStr,
        source: "other",
      });
    }
  };

  const renderHeader = () => {
    const headerTitle = "Attendance Details";
    return (
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Typography variant="subheading" className="font-semibold ">
            {headerTitle}
          </Typography>
        </div>
        <div className="flex justify-between items-center gap-2 px-4 py-2">

          <OvertimeJournal
            isLoading={isOvertimeLoading}
            isError={isOvertimeError}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error={overtimeError as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={overtimeJournal as any}
            date={validDate ? formatToIndianDate(validDate) : ""}
          />
          {onClose && (
            <Button
              variant="subtle"
              onClick={onClose}
              className="rounded-md hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderLeaveDetailsActions = () => {
    const showButton = buttonStatus?.leave_applications?.find(
      (item) => item?.name === leaveApplicationName,
    );

    return (
      <div className="mt-5 flex flex-col gap-2">
        <div className="flex gap-2">
          {showButton?.show_revoke_button && canRevokeLeave && (
            <Button
              variant="soft"
              size="md"
              onClick={handleRevoke}
              className="w-full"
            >
              {revokePending ? <CircularLoader color="white" /> : "Revoke"}
            </Button>
          )}
          {showButton?.show_replace_button && canReplaceLeave && (
            <Button
              variant="soft"
              size="md"
              onClick={() => setShowReplaceModal(true)}
              className="w-full"
            >
              Replace
            </Button>
          )}
          {showButton?.show_edit_button && canEditLeave && (
            <Button
              variant="soft"
              size="md"
              onClick={() => {
                setShowReqAttendanceCorrection(true);
              }}
              className="w-full whitespace-nowrap"
            >
              Attendance Adjustment
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="flex-grow flex items-center justify-center">
      <div className="animate-spin border-2 border-black border-t-transparent rounded-full w-5 h-5"></div>
    </div>
  );

  const renderCheckInsList = () => (
    <div className="flex flex-col gap-3">
      <Typography variant="subheading" className="font-semibold">
        Check-ins
      </Typography>
      {empCheckIns?.map((record) => (
        <AttendanceCard key={record?.name} record={record} />
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <Typography
      variant="bodyMedium"
      className="text-center text-gray-600 bg-gray-50/30 p-2 rounded-lg"
    >
      No check-ins available for{" "}
      <span className="font-semibold">
        {validDate ? formatToIndianDate(validDate) : "Unknown Date"}
      </span>
    </Typography>
  );

  const renderAbsentMessage = () => {
    if (status !== "absent" || !!leaveDetails) return null;

    return (
      <Typography
        variant="bodySmall"
        color="error"
        className="mt-4 text-center"
      >
        To correct your attendance for this day, submit a request below.
      </Typography>
    );
  };

  const renderLeaveDetails = () => {
    if (!leaveDetails) return null;
    return (
      <div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {leaveDetailsFromButtonStatusData?.map((item: any) => {
          return <LeaveDetailsCard key={item?.name || item?.id} data={item} propStatus={propStatus} />
        })}
        {data?.custom_auto_created === 1 ||
          (leaveEvent && status === "on leave")
          ? renderLeaveDetailsActions()
          : null}
        {/* <div className="border-t-1 border-gray-100 mt-6"></div> */}
        {leaveDetails.name && (
          <ApprovalFlow doctype="Leave Application" docname={leaveDetails.name} />
        )}
        {/* Act button for System Managers */}
        {leaveTodoItem && (
          <div className="mt-4">
            <MyApprovalActionPill
              variant="buttons"
              canNudge={false}
              isPendingStatus={
                ["open", "pending"].includes(
                  (
                    leaveTodoItem?.todo_status ||
                    leaveTodoItem?.reference_document?.custom_status ||
                    leaveDetails?.status ||
                    ""
                  ).toLowerCase()
                )
              }
              todoId={leaveTodoItem?.todo_id}
              requestItem={leaveTodoItem}
              onActionComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["open-approval-todos-leave"] });
                queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
                queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderRegularContent = () => (
    <>
      {empCheckIns && empCheckIns.length > 0
        ? renderCheckInsList()
        : renderEmptyState()}
      {hasExistingRequest || renderAbsentMessage()}
    </>
  );

  const renderWeekOffMessage = (title?: string) => {
    const cleanTitle = title?.startsWith("Holiday: ") ? title.replace(/^Holiday:\s*/, "") : title;
    return (
      <div className="my-2 p-3 bg-gray-100 border border-gray-200 rounded-lg text-center">
        <Typography
          variant="bodySmall"
          className="font-semibold text-gray-800"
        >
          {cleanTitle && cleanTitle !== "WO" ? cleanTitle : "Week off"}
        </Typography>
      </div>
    );
  };

  const renderHolidayMessage = (title?: string) => {
    let displayTitle = title?.trim() || "Holiday";
    if (displayTitle.toLowerCase() !== "holiday" && !/^holiday\s*:/i.test(displayTitle)) {
      displayTitle = `Holiday: ${displayTitle}`;
    }
    return (
      <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <Typography
          variant="bodySmall"
          className="font-semibold text-blue-800"
        >
          {displayTitle}
        </Typography>
      </div>
    );
  };

  // Comp-Off (Co+ earned / Co- applied) + Late Entry / Early Exit details.
  // Sourced from the calendar record/events, which only carry these fields when
  // the "Show Comp-Off and Late Entry Details in Calendar" Attendance Setting is
  // enabled (gated in cn_leave_shift_managment.get_events) — so this section
  // stays hidden unless the feature is on and the day actually has such flags.
  const renderCompoffLateDetails = () => {
    const combined = [data, ...(events ?? [])];
    const earnedRec = combined.find((r) => r?.comp_off === "earned");
    // Co- only for live requests: docstatus 0 (draft) or 1 (submitted), not Rejected
    const appliedRec = combined.find(
      (r) =>
        r?.comp_off === "applied" &&
        [0, 1].includes(Number(r?.docstatus ?? 0)) &&
        r?.status !== "Rejected"
    );
    const compEarned = !!earnedRec;
    const compApplied = !!appliedRec;
    const lateEntry = !!data?.late_entry;
    const earlyExit = !!data?.early_exit;

    if (!compEarned && !compApplied && !lateEntry && !earlyExit) return null;

    const leaveTypeOf = (rec?: AttendanceRecord) =>
      rec?.leave_type_name || rec?.leave_type || "";

    const rows: { label: string; value: string; valueClass: string }[] = [];
    if (compEarned)
      rows.push({
        label: "Compensatory Off",
        value: ["Earned (Co+)", leaveTypeOf(earnedRec)].filter(Boolean).join(" · "),
        valueClass: "text-green-700",
      });
    if (compApplied)
      rows.push({
        label: "Compensatory Off",
        value: ["Applied (Co-)", leaveTypeOf(appliedRec)].filter(Boolean).join(" · "),
        valueClass: "text-red-700",
      });
    if (lateEntry)
      rows.push({ label: "Late Entry", value: "Yes", valueClass: "text-amber-700" });
    if (earlyExit)
      rows.push({ label: "Early Exit", value: "Yes", valueClass: "text-violet-700" });

    return (
      <div className="pt-4 border-t border-gray-100">
        <Typography variant="subheading" className="font-semibold mb-1">
          Comp-Off &amp; Attendance Flags
        </Typography>
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <Typography
                variant="label"
                color="body2"
                className="text-xs text-gray-500 uppercase tracking-wide font-medium"
              >
                {row.label}
              </Typography>
              <span className={`text-sm font-semibold text-right ${row.valueClass}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    const isWeekOffDay =
      status === "week off" ||
      isWeeklyOff ||
      holidayEvent?.weekly_off === 1 ||
      holidayEvent?.status?.toLowerCase() === "weekly off" ||
      data?.weekly_off === 1 ||
      data?.status?.toLowerCase() === "weekly off";

    const isNonWoHoliday =
      !isWeekOffDay &&
      (status === "holiday" ||
        (holidayEvent &&
          holidayEvent.weekly_off !== 1 &&
          holidayEvent.status?.toLowerCase() !== "weekly off") ||
        (data?.doctype === "Holiday" &&
          data?.weekly_off !== 1 &&
          data?.status?.toLowerCase() !== "weekly off"));

    const holidayTitle = holidayEvent?.title || data?.title;

    return (
      <div className="flex-grow overflow-y-auto p-4 space-y-6 ">
        {isWeekOffDay && renderWeekOffMessage(holidayTitle)}
        {isNonWoHoliday && renderHolidayMessage(holidayTitle)}
        {renderCompoffLateDetails()}
        {isLoading ? (
          renderLoadingState()
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderRegularContent()}
          </div>
        )}
        {isLeaveRecord && leaveDetails && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {renderLeaveDetails()}
          </div>
        )}

        {combinedAttendanceRequests && combinedAttendanceRequests.length > 0 && (
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-6">
              {combinedAttendanceRequests.map((req, idx) => {
                const attendanceTodoItem = attendanceApprovalTodos?.find(
                  (t) =>
                    t?.reference_name === req.name ||
                    t?.reference_document?.name === req.name,
                );
                return (
                  <AttendanceRequestInfo
                    key={req.name || idx}
                    data={req}
                    propStatus={propStatus}
                    todoItem={attendanceTodoItem}
                    onActionComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ["open-approval-todos-attendance"] });
                      queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
                      queryClient.invalidateQueries({ queryKey: ["attendance-requests"] });
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFooterButton = () => {
    // if (
    //   data?.custom_auto_created === 1 ||
    //   status === "on leave" ||
    //   !!leaveEvent
    // )
    //   return null;

    const hasActiveAttendanceRequest = combinedAttendanceRequests?.some(
      (x) => x?.custom_status === "Pending" || x?.custom_status === "Approved",
    );
    // leaveDetails?.status === "Open" || leaveDetails?.status === "Approved";
    const hasActiveLeaveRequest = leaveDetailsFromButtonStatusData?.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => ["Open", "Approved"].includes(item.status),
    );

    // each button is only blocked by its own active request
    // attendance pending → hide attendance btn, show leave btn
    // leave pending → hide leave btn, show attendance btn
    const showAttendanceBtn = canRequestAttendance && !hasActiveAttendanceRequest;
    const showLeaveBtn = canRequestLeave && !hasActiveLeaveRequest;

    if ((!showAttendanceBtn && !showLeaveBtn) || propStatus === 'present') return null;

    return (
      <div className="flex items-center justify-center gap-2">
        {showLeaveBtn && (
          <Button
            variant="soft"
            fullWidth
            size="md"
            bgColor="primary"
            onClick={handleEdit}
          >
            <Plus className="w-4 h-4 mr-2" />
            Leave Request
          </Button>
        )}
        {isDateInAllowedRange && (showAttendanceBtn || leaveDetailsFromButtonStatusData?.some(leave => leave.status === 'Open')) && (
          <Button
            variant="soft"
            fullWidth
            size="md"
            bgColor="primary"
            onClick={() => setShowReqAttendanceCorrection(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Attendance Request
          </Button>
        )}
      </div>
    );
  };
  const footerButtonContent = renderFooterButton();

  return (
    <div className="bg-white flex flex-col h-full rounded-lg">
      {renderHeader()}

      {renderMainContent()}

      {footerButtonContent && (
        <div className="p-3 border-t bg-white sticky bottom-0 w-full z-40 mt-auto rounded-bl-lg rounded-br-lg">
          {footerButtonContent}
        </div>
      )}
      {showReqAttendanceCorrection &&
        createPortal(
          <AttendanceRequestFormV2
            onClose={() => setShowReqAttendanceCorrection(false)}
            isFromCalView
            selectedDate={validDate || new Date()}
            latestInAndOutTime={
              empCheckIns && empCheckIns?.length > 0
                ? {
                  in_time: empCheckIns?.[0].time as string,
                  out_time:
                    empCheckIns?.length > 1
                      ? (empCheckIns?.[empCheckIns.length - 1].time as string)
                      : "",
                }
                : undefined
            }
          />,
          document.body,
        )}

      {showReplaceModal &&
        data &&
        createPortal(
          <ReplaceLeaveModal
            isOpen={showReplaceModal}
            onClose={() => setShowReplaceModal(false)}
            onReplace={handleReplace}
            currentLeaveType={leaveDetails?.leave_type}
            currentLeaveName={leaveDetails?.name}
            currentLeaveDays={leaveDetails?.total_leave_days}
            fromDate={leaveDetails?.from_date}
            toDate={leaveDetails?.to_date}
          />,
          document.body,
        )}

      {showEditModal &&
        createPortal(
          <AttendanceRequestFormV2
            onClose={() => setShowEditModal(false)}
            selectedDate={validDate || new Date()}
          />,
          document.body,
        )}
    </div>
  );
};

export default EmployeeAttendanceDetails;

const AttendanceCard = ({ record }: { record: EmployeeCheckInLog }) => {
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 hover-lift transition">
      <div className="flex justify-between items-center">
        <Typography
          variant="bodyMedium"
          className="font-semibold text-gray-800"
        >
          {record.employee}
        </Typography>
        <Badge
          label={record.log_type}
          backgroundColor={
            record.log_type === "IN" ? "bg-success-50" : "bg-error-50"
          }
          textColor={
            record.log_type === "IN" ? "text-success-600" : "text-error-600"
          }
        />
      </div>

      <div className="space-y-1">
        <Typography variant="bodySmall" color="body2">
          {formatToIndianDateWithTime(record.time)}
        </Typography>
      </div>
    </div>
  );
};

export const AttendanceRequestInfo = ({
  data,
  propStatus,
  doctype = "Attendance Request",
  todoItem,
  onActionComplete,
}: {
  data: AttendanceRequest;
  propStatus?: string;
  doctype?: string;
  todoItem?: any;
  onActionComplete?: () => void;
}) => {



  const status = getBadgePropsByStatus(data.custom_status);

  return (
    <div className="mt-2 p-2 pt-4 pb-20 border-t border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-2">

          <Typography variant="subheading" className="font-semibold">
            Attendance Request Info
          </Typography>

          {propStatus === "week-off" && (
            <Badge
              label={"Week Off"}
              backgroundColor={"bg-blue-50"}
              textColor={"text-blue-800"}
            />
          )}
        </div>
        {data.custom_status && (
          <Badge
            label={data.custom_status === "Cancelled" ? "Revoked" : data.custom_status}
            backgroundColor={status.backgroundColor}
            textColor={status.textColor}
          />
        )}
      </div>

      {/* Content */}
      <div>
        {/* Request Type */}
        {data.custom_request_type && (
          <div className="flex items-start justify-between py-3">
            <Typography
              variant="label"
              color="body2"
              className="font-medium text-xs text-gray-500 uppercase tracking-wide block"
            >
              Request Type
            </Typography>
            <Typography
              variant="bodySmall"
              className="font-semibold text-gray-900"
            >
              {data.custom_request_type}
            </Typography>
          </div>
        )}

        {/* Employee */}
        <div className="flex items-start justify-between py-3">
          <Typography
            variant="label"
            color="body2"
            className="font-medium text-xs text-gray-500 uppercase tracking-wide block"
          >
            Employee
          </Typography>
          <Typography
            variant="bodySmall"
            className="font-semibold text-gray-900 text-right"
          >
            {data.employee_name}
            <br />
            <span className="text-xs text-gray-500">{data.employee}</span>
          </Typography>
        </div>

        {/* Department */}
        {data.department && (
          <div className="flex items-start justify-between py-3">
            <Typography
              variant="label"
              color="body2"
              className="font-medium text-xs text-gray-500 uppercase tracking-wide block"
            >
              Department
            </Typography>
            <Typography variant="bodySmall" className="text-gray-900">
              {data.department}
            </Typography>
          </div>
        )}

        {/* Company */}
        {data.company && (
          <div className="flex items-start justify-between py-3">
            <Typography
              variant="label"
              color="body2"
              className="font-medium text-xs text-gray-500 uppercase tracking-wide block"
            >
              Company
            </Typography>
            <Typography variant="bodySmall" className="text-gray-900">
              {data.company}
            </Typography>
          </div>
        )}

        {/* Date */}
        <div className="flex items-start justify-between py-3">
          <Typography
            variant="label"
            color="body2"
            className="text-xs text-gray-500 uppercase tracking-wide block font-medium"
          >
            Date
          </Typography>
          <Typography variant="bodySmall" className="text-gray-900 text-right">
            {formatToIndianDate(data.from_date)} –{" "}
            {formatToIndianDate(data.to_date)}
          </Typography>
        </div>

        {/* Time */}
        <div className="flex items-start justify-between py-3">
          <Typography
            variant="label"
            color="body2"
            className="text-xs text-gray-500 uppercase tracking-wide block font-medium"
          >
            Time
          </Typography>
          <Typography variant="bodySmall" className="text-gray-900 text-right">
            {formatTime(data.custom_from_time)} –{" "}
            {formatTime(data.custom_to_time)}
          </Typography>
        </div>

        {/* Location */}
        {data.custom_location && (
          <div className="flex items-start justify-between py-3">
            <Typography
              variant="label"
              color="body2"
              className="text-xs text-gray-500 uppercase tracking-wide block font-medium"
            >
              Location
            </Typography>
            <Typography variant="bodySmall" className="text-gray-900">
              {data.custom_location}
            </Typography>
          </div>
        )}

        {/* Reason */}
        {data.reason && (
          <div className="flex items-start justify-between py-3">
            <Typography
              variant="label"
              color="body2"
              className="text-xs text-gray-500 uppercase tracking-wide block font-medium"
            >
              Reason
            </Typography>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900"
            >
              {data.reason}
            </Typography>
          </div>
        )}

        {/* Created On */}
        {data.creation && (
          <div className="flex items-start justify-between py-3">
            <Typography
              variant="label"
              color="body2"
              className="text-xs text-gray-500 uppercase tracking-wide block font-medium"
            >
              Created On
            </Typography>
            <Typography variant="bodySmall" className="text-gray-900">
              {formatToIndianDateWithTime(data.creation)}
            </Typography>
          </div>
        )}
      </div>

      {/* Explanation */}
      {data.explanation && data.explanation.trim() && (
        <div className="mt-5">
          <Typography
            variant="label"
            color="body2"
            className="text-xs text-gray-500 font-medium uppercase tracking-wide block mb-2"
          >
            Explanation
          </Typography>
          <Typography
            variant="bodySmall"
            className="text-gray-700 bg-gray-50/30 p-2 rounded-lg leading-relaxed"
          >
            {data.explanation.trim()}
          </Typography>
        </div>
      )}

      {data.name && (
        <ApprovalFlow doctype={doctype} docname={data.name} />
      )}

      {/* Act button for System Managers */}
      {todoItem && (
        <div className="mt-4">
          <MyApprovalActionPill
            variant="buttons"
            canNudge={false}
            isPendingStatus={
              ["open", "pending"].includes(
                (
                  todoItem?.todo_status ||
                  todoItem?.reference_document?.custom_status ||
                  data?.custom_status ||
                  ""
                ).toLowerCase()
              )
            }
            todoId={todoItem?.todo_id}
            requestItem={todoItem}
            onActionComplete={onActionComplete}
          />
        </div>
      )}
    </div>
  );
};
