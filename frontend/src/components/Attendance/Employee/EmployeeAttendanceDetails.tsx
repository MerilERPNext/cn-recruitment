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
import ReplaceLeaveModal from "../../Leaves/ReplaceLeaveModal";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import CircularLoader from "../../shared/atoms/CircularLoader";
import RequestLeave from "../../Leaves/RequestLeave";
import { useRequestLeaveModal } from "../../Leaves/RequestLeaveModalContext";
import { LeaveDetailsCard } from "./LeaveDetailsCard";
import AttendanceRequestFormV2 from "../AttendanceRequest/AttendanceRequestFormV2";
import Badge from "../../shared/Badge";
import { getBadgePropsByStatus } from "../../../utils/helperUtils";

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
    validDate
      ? [
        ["time", "between", [start, end]],
        ["employee", "=", currentEmployee?.employee],
      ]
      : []
  );

  const { data: attendanceRequests } = useAllAttendanceRequests(
    1000,
    validDate && currentEmployee?.employee
      ? [
        ["employee", "=", currentEmployee.employee],
        ["from_date", "<=", format(validDate, "yyyy-MM-dd")],
        ["to_date", ">=", format(validDate, "yyyy-MM-dd")],
        ["docstatus", "!=", 2],
      ]
      : []
  );
  console.log("attendanceRequests-------------------------------", attendanceRequests);
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
        <h2 className="text-lg font-semibold text-gray-900">{headerTitle}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
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
        {showButton?.show_revoke_button && (
          <Button size="md" fullWidth onClick={handleRevoke}>
            {revokePending ? <CircularLoader color="white" /> : "Revoke"}
          </Button>
        )}
        {showButton?.show_replace_button && (
          <Button size="md" fullWidth onClick={() => setShowReplaceModal(true)}>
            Replace
          </Button>
        )}
        {showButton?.show_edit_button && (
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
      <h2 className="text-lg font-semibold mb-1">Check-ins</h2>
      {empCheckIns?.map((record) => (
        <AttendanceCard key={record?.name} record={record} />
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <p className="text-center text-gray-600">
      No check-ins available for{" "}
      <span className="font-semibold">
        {validDate ? format(validDate, "dd/MM/yyyy") : "Unknown Date"}
      </span>
    </p>
  );

  const renderAbsentMessage = () => {
    if (status !== "absent") return null;

    return (
      <p className="text-sm mt-4 text-gray-700 text-center">
        To correct your attendance for this day, submit a request below.
      </p>
    );
  };

  const renderLeaveDetails = () => {
    if (!leaveDetails) return null;
    return (
      <div>
        <LeaveDetailsCard data={leaveDetails} />
        {data?.custom_auto_created === 1 ? renderLeaveDetailsActions() : null}
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

          <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm font-semibold text-blue-800">
              {data.title}
            </p>
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
      <button
        disabled={isButtonDisabled}
        className={`w-full flex items-center justify-center py-3 rounded-lg text-md font-medium transition-colors ${isButtonDisabled
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        onClick={() => setShowReqAttendanceCorrection(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Attendance Request
      </button>
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
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Leave Application
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
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
        <h3 className="text-sm font-semibold text-gray-800">
          {record.employee}
        </h3>
        <span
          className={`text-sm font-medium px-2 py-1 rounded-lg
            ${record.log_type === "IN"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
            }`}
        >
          {record.log_type}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>{format(new Date(record.time), "hh:mm a, dd/MM/yyyy")}</p>
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
      <h2 className="text-lg font-semibold mb-4">Attendance Request Info.</h2>
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
            <span className="text-sm text-gray-500 font-medium">Request Type</span>
            <span className="text-sm text-gray-900 font-semibold">
              {data.custom_request_type}
            </span>
          </div>
        )}

        {/* Employee */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Employee</span>
          <span className="text-sm text-gray-900 font-semibold text-right">
            {data.employee_name} <br />
            <span className="text-xs text-gray-500">{data.employee}</span>
          </span>
        </div>

        {/* Department */}
        {data.department && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Department</span>
            <span className="text-sm text-gray-900">{data.department}</span>
          </div>
        )}

        {/* Company */}
        {data.company && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Company</span>
            <span className="text-sm text-gray-900">{data.company}</span>
          </div>
        )}

        {/* Date Range */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Date</span>
          <span className="text-sm text-gray-900 text-right">
            {formatDate(data.from_date).toString()} - {formatDate(data.to_date).toString()}
          </span>
        </div>

        {/* Time Range */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Time</span>
          <span className="text-sm text-gray-900 text-right">
            {formatTime(data.custom_from_time)} - {formatTime(data.custom_to_time)}
          </span>
        </div>

        {/* Location */}
        {data.custom_location && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Location</span>
            <span className="text-sm text-gray-900">{data.custom_location}</span>
          </div>
        )}

        {/* Reason */}
        {data.reason && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Reason</span>
            <span className="text-sm text-gray-900 font-medium">{data.reason}</span>
          </div>
        )}

        {/* Explanation */}
        {data.explanation && data.explanation.trim() && (
          <div className="pt-3 mt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide block mb-2">
              Explanation
            </span>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {data.explanation.trim()}
            </p>
          </div>
        )}
        {/* Modified Date */}
        {data.creation && (
          <div className="flex items-start justify-between py-2">
            <span className="text-sm text-gray-500 font-medium">Created On</span>
            <span className="text-sm text-gray-900">
              {formatDate(data.creation).toString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
