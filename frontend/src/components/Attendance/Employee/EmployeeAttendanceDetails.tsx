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
  const isLeaveRecord = data?.custom_auto_created === 1;

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
        ]
      : []
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
    } else if (data?.custom_auto_created === 1) {
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
        {renderLeaveDetailsActions()}
      </div>
    );
  };

  const renderRegularContent = () => (
    <>
      {empCheckIns && empCheckIns.length > 0
        ? renderCheckInsList()
        : renderEmptyState()}
      {renderAbsentMessage()}
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

    if(data?.status.toLowerCase()==="holiday" && data?.title){
      return(
        <p className="text-sm my-4 text-gray-700 text-center">{data.title}</p>
      )
    }
    return (
      <div className="flex-grow overflow-y-auto p-4">
        {renderRegularContent()}
      </div>
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
        className={`w-full flex items-center justify-center py-3 rounded-lg text-md font-medium transition-colors ${
          isButtonDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black hover:bg-gray-800"
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
            ${
              record.log_type === "IN"
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
