import { useState } from "react";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useScreenSize } from "../../hooks/useScreenSize";
import { queryClient } from "../../providers/QueryProvider";
import { LeaveCardProps } from "../../types/leaves";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../utils/sanitizeToPlainText";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";
import MyApprovalActionPill from "../shared/atoms/MyApprovalActionPill";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import Tooltip from "../shared/Tooltip";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import { getAssignedUsersCell } from "../../utils/getAssignedUsersCell";

// Update the interface to include the new prop
interface EmpLeaveRequestCardProps extends LeaveCardProps {
  onRevokeApproved?: () => void;
  showRejectReason?: boolean;
  onOpenReplaceModal?: () => void;
}
const EmpLeaveRequestCard = ({
  data,
  buttonStatus,
  onOpenReplaceModal,
  showRejectReason,
  onRevokeApproved,
}: EmpLeaveRequestCardProps) => {
  const { isDesktop } = useScreenSize();
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [isActed, setIsActed] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const formattedCreationDate = formatToIndianDate(data?.reference_document?.creation ?? "");

  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();

  const { openModal } = useRequestLeaveModal();
  const { data: currentUser } = useCurrentUser();


  const leaveButtonConfig = buttonStatus?.leave_applications?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app: any) => app.name === data?.reference_name,
  );

  const isPending = data?.reference_document?.status === "Open";
  const isApproved = data?.reference_document?.status === "Approved";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fromDate = data?.reference_document?.from_date ? new Date(data.reference_document.from_date) : new Date();
  fromDate.setHours(0, 0, 0, 0);
  const isFutureLeave = fromDate > today;

  const isResubmit =
    isPending &&
    data?.can_edit &&
    data?.send_back_user === currentUser?.name;
  const allowEdit = leaveButtonConfig?.show_edit_button || isResubmit;
  const allowReplace = leaveButtonConfig?.show_replace_button;
  const allowRevoke = leaveButtonConfig?.show_revoke_button;

  const handleRevokeClick = () => {
    setShowRevokeConfirm(true);
  };

  const executeRevoke = () => {
    if (isApproved && onRevokeApproved) {
      onRevokeApproved();
      setIsActed(true);
      setShowRevokeConfirm(false);
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
            queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
            queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
            queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["custom-api"] });
            setTimeout(() => {
              setRefetchAttendance(true);
            }, 2000);
            toast.success("Leave revoked successfully");
            setShowRevokeConfirm(false);
          },
          onError: () => {
            setShowRevokeConfirm(false);
          }
        },
      );
    }
  };

  const handleReplaceClick = () => {
    if (onOpenReplaceModal) {
      onOpenReplaceModal();
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


  const cleanDescription = sanitizeToPlainText(
    data?.reference_document?.description,
  );
  const truncatedDescription = truncateByChars(cleanDescription);


  return (
    <>
      {isDesktop ? (
        <div
          style={{ gridTemplateColumns: showRejectReason ? "1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr  1fr 1fr 1.5fr 1fr" : "1fr 1.5fr 1fr   1fr 1fr 1fr 1.5fr 1fr 1fr 1fr 1.5fr" }}
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        >
          <Tooltip
            content={data?.reference_document?.name || ""}
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {data?.reference_document?.name}
            </Typography>
          </Tooltip>

          <Typography variant="bodySmall" className="font-medium text-center">
            {getAssignedUsersCell(data)}
          </Typography>

          <Tooltip
            content={`${data?.reference_document?.custom_leave_type_name}`}
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {data?.reference_document?.custom_leave_type_name}
            </Typography>
          </Tooltip>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document.to_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formattedCreationDate}
          </Typography>
          <Tooltip
            content={cleanDescription}
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {truncatedDescription}
            </Typography>
          </Tooltip>
          <Tooltip
            content={data?.reference_document?.reason_name || "--"}
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {data?.reference_document?.reason_name || "--"}
            </Typography>
          </Tooltip>
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.total_leave_days > 1
              ? data?.reference_document?.total_leave_days + " Days"
              : data?.reference_document?.total_leave_days + " Day"}
          </Typography>
          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              RoleAssignedUsers={data?.role_assigned_users}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              role={data?.role}
              position="left"
            >

              <StatusBadge status={data?.custom_allow_revoke && data?.reference_document?.docstatus === 2 && data?.todo_status.toLowerCase() === "cancelled" ? "Revoked" : data?.reference_document?.status} />


            </AllocatedToTooltip>
          </div>
          {showRejectReason && (
            <div className="flex items-center justify-center w-full min-w-0 pr-2">
              {data?.reference_document?.status === "Rejected" && data?.reference_document?.custom_rejection_reason && (
                <Tooltip
                  content={data?.reference_document?.custom_rejection_reason}
                  triggerClassName="w-full truncate min-w-0 block"
                >
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center truncate block w-full"
                  >
                    {data?.reference_document?.custom_rejection_reason}
                  </Typography>
                </Tooltip>
              )}
            </div>
          )}
          <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
            <MyApprovalActionPill
              uiPermission={{
                app: "Leaves and Holidays",
                page: "My Requests",
                actionKeysMap: {
                  revoke: "revoke",
                  replace: "replace",
                  edit: "edit",
                }
              }}
              canRevoke={
                ((isPending && data?.custom_allow_revoke) || (isApproved && !!allowRevoke && isFutureLeave)) && !isActed
              }
              canEdit={allowEdit && !isActed}
              isResubmit={isResubmit}
              canReplace={allowReplace && (isPending || isApproved) && !isActed}
              revokeLoading={revokeEventMutation.isPending}
              onRevoke={handleRevokeClick}
              onEdit={handleEditClick}
              onReplace={handleReplaceClick}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl"
        >
          <div className="p-4 flex flex-col gap-3 w-full">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Leave Id</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.name}
                </Typography>
              </div>
              <StatusBadge status={data?.custom_allow_revoke && data?.reference_document?.docstatus === 2 && data?.todo_status.toLowerCase() === "cancelled" ? "Revoked" : data?.reference_document?.status} />

            </div>

            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Leave Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.custom_leave_type_name}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Leave Days</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.total_leave_days > 1
                    ? data?.reference_document?.total_leave_days + " Days"
                    : data?.reference_document?.total_leave_days + " Day"}
                </Typography>
              </div>
            </div>

            {/* Dates + Days */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Duration</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document.from_date)} to{" "}
                  {formatToIndianDate(data?.reference_document.to_date)}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Posting Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document.posting_date)}
                </Typography>
              </div>
            </div>

            <div className="relative">
              <Typography variant="mobileCardLabel">Description</Typography>

              <Typography
                variant="mobileCardValue"
                className="text-gray-700 line-clamp-1 pr-16"
              >
                {cleanDescription}
              </Typography>

              {cleanDescription.length > 40 && (
                <button
                  onClick={() => setShowDescriptionModal(true)}
                  className="absolute bottom-0 right-0 text-primary text-sm bg-white pl-1"
                >
                  Read more
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Reason</Typography>
              <Typography variant="mobileCardValue">
                {data?.reference_document?.reason_name || "--"}
              </Typography>
            </div>

            {data?.reference_document?.status === "Rejected" && data?.reference_document?.custom_rejection_reason && (
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Reject Reason</Typography>
                <Typography variant="mobileCardValue" className="text-red-500 text-sm whitespace-normal">
                  {data?.reference_document?.custom_rejection_reason}
                </Typography>
              </div>
            )}
            <div>
              <Typography variant="mobileCardLabel">Assigned To</Typography>
              <Typography variant="mobileCardValue">
                {getAssignedUsersCell(data)}
              </Typography>
            </div>

            <div className={isActed ? "pointer-events-none opacity-50" : ""}>
              <MyApprovalActionPill
                uiPermission={{
                  app: "Leaves and Holidays",
                  page: "My Requests",
                  actionKeysMap: {
                    revoke: "revoke",
                    replace: "replace",
                    edit: "edit",
                  }
                }}
                variant="buttons"
                canRevoke={
                  ((isPending && data?.custom_allow_revoke) || (isApproved && !!allowRevoke && isFutureLeave)) && !isActed
                }
                canEdit={allowEdit && !isActed}
                isResubmit={isResubmit}
                canReplace={allowReplace && (isPending || isApproved) && !isActed}
                revokeLoading={revokeEventMutation.isPending}
                onRevoke={handleRevokeClick}
                onEdit={handleEditClick}
                onReplace={handleReplaceClick}
              />
            </div>
          </div>
          {showDescriptionModal && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
              <div className="bg-white w-full rounded-t-xl p-4 max-h-[80vh] overflow-y-auto">
                <Typography variant="h4" className="mb-2">
                  Description
                </Typography>

                <Typography variant="bodySmall" className="whitespace-pre-wrap">
                  {cleanDescription}
                </Typography>

                <Button
                  className="mt-4"
                  fullWidth
                  onClick={() => setShowDescriptionModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        size="sm"
      >
        <div className="p-6">
          <Typography variant="h4" className="mb-4">
            Confirm Revocation
          </Typography>
          <Typography variant="bodyMedium" className="mb-6 text-gray-600">
            Are you sure you want to revoke this leave request? This action cannot be undone.
          </Typography>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRevokeConfirm(false)}
              disabled={revokeEventMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={executeRevoke}
              loading={revokeEventMutation.isPending}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EmpLeaveRequestCard;
