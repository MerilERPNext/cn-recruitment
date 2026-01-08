import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { endOfDay, format, startOfDay, isValid } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAllEmployeeCheckIns,
  useAllAttendanceRequests,
} from "../../../hooks/useAttendance";
import {
  AttendanceRecord,
  AttendanceRequest,
  EmployeeCheckInLog,
} from "../../../types/attendance";
import { LeaveApplication } from "../../../types/leaves";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
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
import RequestLeave from "../../Leaves/RequestLeave";
import { useRequestLeaveModal } from "../../Leaves/RequestLeaveModalContext";
import { LeaveDetailsCard } from "./LeaveDetailsCard";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import Badge from "../../shared/Badge";
import { getBadgePropsByStatus } from "../../../utils/helperUtils";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";

interface EmployeeAttendanceDetailsProps {
  date?: Date;
  status?: string;
  onClose?: () => void;
  data?: AttendanceRecord;
}

const EmployeeAttendanceDetails = ({
  date: propDate,
  status: propStatus,
  data,
  onClose,
}: EmployeeAttendanceDetailsProps = {}) => {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const dateParam = query.get("date");
  const { targetEmployeeId } = useTargetUser();

  const status = propStatus || query.get("status");
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

  // If this is a leave record (custom_auto_created === 1), fetch leave details
  const isLeaveRecord =
    data?.custom_auto_created === 1 || status === "on-leave";

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  // Only fetch leave details if it's a leave record
  const { data: leaveDetails } = useFrappeDocument(
    "Leave Application",
    isLeaveRecord && data?.leave_application_name
      ? data.leave_application_name
      : null!
  ) as { data: LeaveApplication | undefined };

  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;

  const { data: buttonStatus } = useGetButtonsStatus(
    currentEmployee?.employee || ""
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
      : []
  );

  const { data: attendanceRequests } = useAllAttendanceRequests(
    1000,
    validDate && effectiveEmployeeId
      ? [
        ["employee", "=", effectiveEmployeeId],
        ["from_date", "<=", format(validDate, "yyyy-MM-dd")],
        ["to_date", ">=", format(validDate, "yyyy-MM-dd")],
        ["docstatus", "!=", 2],
      ]
      : []
  );

  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRequestAttendance = isActionEnabled(
    userUiPermission,
    "create_attendance_request",
    "Attendance"
  );
  const canRevokeLeave = isActionEnabled(
    userUiPermission,
    "revoke_leave_request",
    "My Attendance"
  );
  const canReplaceLeave = isActionEnabled(
    userUiPermission,
    "replace_leave_request",
    "My Attendance"
  );
  const canEditLeave = isActionEnabled(
    userUiPermission,
    "edit_leave_request",
    "My Attendance"
  );

  const hasExistingRequest =
    attendanceRequests && attendanceRequests.length > 0;

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
  }) => {
    if (!data?.leave_application_name) return;

    replaceLeave.mutate(
      {
        leave_application: data.leave_application_name,
        new_leave_type: formData.newLeaveType,
        first_half_leave_type: formData.firstHalfType,
        second_half_leave_type: formData.secondHalfType,
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
      }
    );
  };

  // Handler for editing leave
  const handleEdit = () => {
    if (!leaveDetails) return;

    openLeaveModal({
      leaveType: leaveDetails.leave_type,
      fromDate: leaveDetails.from_date,
      toDate: leaveDetails.to_date,
      halfDay: leaveDetails.half_day === 1,
      halfDayOption: leaveDetails.custom_half_day_type as
        | "First Half"
        | "Second Half"
        | undefined,
      half_day_date: leaveDetails.half_day_date || "",
      custom_second_half_day_date:
        leaveDetails.custom_second_half_day_date || "",
      description: leaveDetails.description,
      custom_reason: leaveDetails.custom_reason || "",
      custom_attachment: leaveDetails.custom_attachment
        ? [{ url: leaveDetails.custom_attachment }]
        : undefined,
      isEdit: true,
      leave_application: leaveDetails.name,
    });
    setShowEditModal(true);
  };

  const renderHeader = () => {
    let headerTitle = "Attendance Details";
    if (status === "holiday") {
      headerTitle = "Holiday Details";
    } else if (data?.custom_auto_created === 1 || status === "on-leave") {
      headerTitle = "Leave Details";
    }
    return (
      <div className="flex justify-between items-center p-4 border-b">
        <Typography variant="h3" className="font-semibold text-gray-900">{headerTitle}</Typography>
        {onClose && (
          <Button
            variant="subtle"
            size="sm"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        )}
      </div>
    );
  };

  const renderLeaveDetailsActions = () => {
    const showButton = buttonStatus?.leave_applications?.find(
      (item) => item?.name === data?.leave_application_name
    );

    return (
      <div className="mt-10 flex gap-2">
        {showButton?.show_revoke_button && canRevokeLeave && (
          <Button size="md" fullWidth onClick={handleRevoke}>
            {revokePending ? <CircularLoader color="white" /> : "Revoke"}
          </Button>
        )}
        {showButton?.show_replace_button && canReplaceLeave && (
          <Button size="md" fullWidth onClick={() => setShowReplaceModal(true)}>
            Replace
          </Button>
        )}
        {showButton?.show_edit_button && canEditLeave && (
          <Button size="md" fullWidth onClick={handleEdit}>
            Edit
          </Button>
        )}
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
      <Typography variant="bodyMedium" className="font-semibold mb-1">Check-ins</Typography>
      {empCheckIns?.map((record) => (
        <AttendanceCard key={record?.name} record={record} />
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <Typography variant="bodyMedium" className="text-center text-gray-600">
      No check-ins available for{" "}
      <span className="font-semibold">
        {validDate ? format(validDate, "dd/MM/yyyy") : "Unknown Date"}
      </span>
    </Typography>
  );

  const renderAbsentMessage = () => {
    if (status !== "absent") return null;

    return (
      <Typography variant="bodySmall" color="error" className="mt-4 text-center">
        To correct your attendance for this day, submit a request below.
      </Typography>
    );
  };

  const renderLeaveDetails = () => {
    if (!leaveDetails) return null;
    return (
      <div>
        <LeaveDetailsCard data={leaveDetails} />
        {data?.custom_auto_created === 1 ? renderLeaveDetailsActions() : null}
        <div className="border-t-2 border-gray-100 mt-6"></div>

        {hasExistingRequest ? <AttendanceRequestInfo data={attendanceRequests?.[0]} /> : null}

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
  const renderMainContent = () => {
    if (isLeaveRecord) {
      return (
        <div className="flex-grow overflow-y-auto p-4">
          {renderLeaveDetails()}
        </div>
      );
    }

    if (isLoading) {
      return renderLoadingState();
    }
    if (data?.status.toLowerCase() === "holiday" && data?.title) {
      return (
        <div className="p-2">

          <div className="my-4 p-4 bg-primary-50 border border-primary-200 rounded-lg text-center">
            <Typography variant="bodySmall" className="font-semibold text-primary-800">
              {data.title}
            </Typography>
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="flex-grow overflow-y-auto p-4">
          {renderRegularContent()}
          <div className="border-t-2 border-gray-100 mt-6"></div>
          {hasExistingRequest ? <AttendanceRequestInfo data={attendanceRequests?.[0]} /> : null}
        </div>
      </>
    );
  };

  const renderFooterButton = () => {
    if (isLeaveRecord) return null;
    if (!canRequestAttendance) return null;
    const isButtonDisabled =
      status !== "absent" && status !== "half-day" && status !== "half day";

    if (hasExistingRequest) {
      return (
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm font-medium">
            Attendance Request is already submitted for this date.
          </p>
        </div>
      );
    }

    return (
      <Button
        variant="contain"
        fullWidth
        disabled={isButtonDisabled}
        bgColor="primary"
        onClick={() => setShowReqAttendanceCorrection(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Attendance Request
      </Button>
    );
  };

  return (
    <div className="bg-white flex flex-col h-full rounded-lg">
      {renderHeader()}

      {renderMainContent()}

      <div className="p-3 border-t bg-white sticky bottom-0 w-full z-40 mt-auto rounded-bl-lg rounded-br-lg">
        {renderFooterButton()}
      </div>

      {showReqAttendanceCorrection &&
        createPortal(
          <AttendanceRequestFormV2
            onClose={() => setShowReqAttendanceCorrection(false)}
            selectedDate={validDate || new Date()}
          />,
          document.body
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
          document.body
        )}

      {showEditModal &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden shadow-xl">
              <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                <Typography variant="h3" className="font-semibold text-gray-900">
                  Edit Leave Application
                </Typography>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <RequestLeave
                  onSuccess={() => {
                    setShowEditModal(false);
                    queryClient.invalidateQueries({
                      queryKey: ["get-All-Events-And-Attendance"],
                    });
                    if (onClose) {
                      onClose();
                    }
                  }}
                  onCancel={() => setShowEditModal(false)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EmployeeAttendanceDetails;

const AttendanceCard = ({ record }: { record: EmployeeCheckInLog }) => {
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-200 hover:shadow-lg transition">
      <div className="flex justify-between items-center">
        <Typography variant="bodyMedium" className="font-semibold text-gray-800">
          {record.employee}
        </Typography>
        <Badge
          label={record.log_type}
          backgroundColor={
            record.log_type === "IN" ? "bg-success-100" : "bg-error-100"
          }
          textColor={
            record.log_type === "IN" ? "text-success-800" : "text-error-800"
          }
        />
      </div>

      <div className="space-y-1">
        <Typography variant="bodySmall" color="body2">
          {format(new Date(record.time), "hh:mm a, dd/MM/yyyy")}
        </Typography>
      </div>
    </div>
  );
};

export const AttendanceRequestInfo = ({ data }: { data: AttendanceRequest }) => {
  const formatDate = (dateString: string | number | Date) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "-";
    try {
      return format(new Date(`1970-01-01T${timeString}`), "hh:mm a");
    } catch {
      return timeString;
    }
  };
  const status = getBadgePropsByStatus(data.custom_status);

  return (
    <div className="mt-2 pt-2 ">
      <Typography variant="subheading" className="mb-4">Attendance Request Info.</Typography>
      {/* Status Badge */}
      {data.custom_status && (
        <div className="flex justify-end mb-4">
          <Badge label={data.custom_status} backgroundColor={status.backgroundColor} textColor={status.textColor} />
        </div>
      )}

      {/* Main Info Grid */}
      <div className="space-y-4">
        {/* Request Type */}
        {data.custom_request_type && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <Typography variant="label" color="body2" className="font-medium">Request Type</Typography>
            <Typography variant="bodySmall" className="font-semibold text-gray-900">
              {data.custom_request_type}
            </Typography>
          </div>
        )}

        {/* Employee */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <Typography variant="label" color="body2" className="font-medium">Employee</Typography>
          <Typography variant="bodySmall" className="font-semibold text-gray-900 text-right">
            {data.employee_name} <br />
            <span className="text-xs text-gray-500">{data.employee}</span>
          </Typography>
        </div>

        {/* Department */}
        {data.department && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <Typography variant="label" color="body2" className="font-medium">Department</Typography>
            <Typography variant="bodySmall" className="text-gray-900">{data.department}</Typography>
          </div>
        )}

        {/* Company */}
        {data.company && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <Typography variant="label" color="body2" className="font-medium">Company</Typography>
            <Typography variant="bodySmall" className="text-gray-900">{data.company}</Typography>
          </div>
        )}

        {/* Date Range */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <Typography variant="label" color="body2" className="font-medium">Date</Typography>
          <Typography variant="bodySmall" className="text-gray-900 text-right">
            {formatDate(data.from_date).toString()} - {formatDate(data.to_date).toString()}
          </Typography>
        </div>

        {/* Time Range */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <Typography variant="label" color="body2" className="font-medium">Time</Typography>
          <Typography variant="bodySmall" className="text-gray-900 text-right">
            {formatTime(data.custom_from_time)} - {formatTime(data.custom_to_time)}
          </Typography>
        </div>

        {/* Location */}
        {data.custom_location && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <Typography variant="label" color="body2" className="font-medium">Location</Typography>
            <Typography variant="bodySmall" className="text-gray-900">{data.custom_location}</Typography>
          </div>
        )}

        {/* Reason */}
        {data.reason && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <Typography variant="label" color="body2" className="font-medium">Reason</Typography>
            <Typography variant="bodySmall" className="font-medium text-gray-900">{data.reason}</Typography>
          </div>
        )}

        {/* Explanation */}
        {data.explanation && data.explanation.trim() && (
          <div className="pt-3 mt-2 border-t border-gray-200">
            <Typography variant="label" color="body2" className="uppercase tracking-wide block mb-2">
              Explanation
            </Typography>
            <Typography variant="bodySmall" className="text-gray-700 bg-gray-50 p-3 rounded-lg">
              {data.explanation.trim()}
            </Typography>
          </div>
        )}
        {/* Modified Date */}
        {data.creation && (
          <div className="flex items-start justify-between py-2">
            <Typography variant="label" color="body2" className="font-medium">Created On</Typography>
            <Typography variant="bodySmall" className="text-gray-900">
              {formatDate(data.creation).toString()}
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};
