import { useState } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { queryClient } from "../../providers/QueryProvider";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import MyApprovalActionPill from "../shared/atoms/MyApprovalActionPill";
import { ButtonStatusResponse, MyLeaveRequestType } from "../../types/leaves";

interface MyLeaveDetailActionsProps {
  data?: MyLeaveRequestType | null;
  buttonStatus?: ButtonStatusResponse;
  onReplaceModalOpen?: (data: MyLeaveRequestType) => void;
  onRevokeApproved?: (name: string) => void;
}

/**
 * Renders MyApprovalActionPill inside the LeaveDetailView modal
 * for "My Requests" — providing revoke / edit / replace actions.
 * Uses the same item data from the list so all action conditions match exactly.
 */
const MyLeaveDetailActions = ({
  data,
  buttonStatus,
  onReplaceModalOpen,
  onRevokeApproved,
}: MyLeaveDetailActionsProps) => {
  const { data: currentUser } = useCurrentUser();
  const { setRefetchAttendance } = useGlobalStore();
  const { openModal } = useRequestLeaveModal();
  const revokeEventMutation = useRevokeEvent();
  const [isActed, setIsActed] = useState(false);

  if (!data) return null;

  const leaveButtonConfig = buttonStatus?.leave_applications?.find(
    (app) => app.name === data.reference_name,
  );

  const isPending = data?.reference_document?.status === "Open";
  const isApproved = data?.reference_document?.status === "Approved";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fromDate = data?.reference_document?.from_date
    ? new Date(data.reference_document.from_date)
    : new Date();
  fromDate.setHours(0, 0, 0, 0);
  const isFutureLeave = fromDate > today;

  const isResubmit =
    isPending &&
    data?.can_edit &&
    data?.send_back_user === currentUser?.name;
  const allowEdit = leaveButtonConfig?.show_edit_button || isResubmit;
  const allowReplace = leaveButtonConfig?.show_replace_button;
  const allowRevoke = leaveButtonConfig?.show_revoke_button;

  const status =
    data?.custom_allow_revoke &&
    data?.reference_document?.docstatus === 2 &&
    data?.todo_status?.toLowerCase() === "cancelled"
      ? "Revoked"
      : data?.reference_document?.status;
  const isPendingStatus = ["pending", "open"].includes(
    status?.toLowerCase(),
  );

  const executeRevoke = () => {
    if (isApproved && onRevokeApproved) {
      onRevokeApproved(data?.reference_document?.name ?? "");
      setIsActed(true);
      return;
    }
    if (data?.todo_id) {
      revokeEventMutation.mutate(
        {
          docname: data?.reference_name,
          doctype: data?.reference_type,
          todo: data?.todo_id,
        },
        {
          onSuccess: () => {
            setIsActed(true);
            queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
            queryClient.invalidateQueries({
              queryKey: ["get-All-Events-And-Attendance"],
            });
            queryClient.invalidateQueries({
              queryKey: ["leave-buttons-status"],
            });
            queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["custom-api"] });
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 2000);
            toast.success("Leave revoked successfully");
          },
        },
      );
    }
  };

  const handleEditClick = () => {
    const existingAttachments =
      data?.attachments && data.attachments.length > 0
        ? data.attachments
        : data?.reference_document?.custom_attachment;

    openModal({
      fromDate: data?.reference_document?.from_date,
      toDate: data?.reference_document?.to_date,
      leaveType: data?.reference_document?.leave_type,
      description: data?.reference_document?.description,
      custom_reason: data?.reference_document?.custom_reason,
      halfDay: data?.reference_document?.half_day,
      custom_attachment: existingAttachments,
      half_day_date: data?.reference_document?.half_day_date,
      custom_second_half_day_date:
        data?.reference_document?.custom_second_half_day_date,
      source: "other",
      hideHalfDayToggle: false,
      isEdit: true,
      isResubmit: isResubmit,
      leave_application: data?.reference_document?.name,
    });
  };

  const handleReplaceClick = () => {
    if (onReplaceModalOpen) {
      onReplaceModalOpen(data);
    }
  };

  return (
    <div
      className={
        isActed ? "pointer-events-none opacity-50" : ""
      }
    >
      <MyApprovalActionPill
        uiPermission={{
          app: "Leaves and Holidays",
          page: "My Requests",
          actionKeysMap: {
            revoke: "revoke",
            replace: "replace",
            edit: "edit",
            nudge: "nudge",
          },
        }}
        isPendingStatus={
          isPendingStatus &&
          data?.todo_status?.toLowerCase() === "open"
        }
        todoId={data?.todo_id}
        variant="buttons"
        canRevoke={
          ((isPending && data?.custom_allow_revoke) ||
            (isApproved && !!allowRevoke && isFutureLeave)) &&
          !isActed
        }
        canEdit={allowEdit && !isActed}
        isResubmit={isResubmit}
        canReplace={
          allowReplace && (isPending || isApproved) && !isActed
        }
        revokeLoading={revokeEventMutation.isPending}
        onRevoke={executeRevoke}
        onEdit={handleEditClick}
        onReplace={handleReplaceClick}
      />
    </div>
  );
};

export default MyLeaveDetailActions;
