import { Repeat1, RotateCcw, SquarePen } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useRevokeEvent } from "../../hooks/userApprovalList";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useScreenSize } from "../../hooks/useScreenSize";
import { queryClient } from "../../providers/QueryProvider";
import { LeaveCardProps } from "../../types/leaves";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../utils/sanitizeToPlainText";
import { isActionEnabled } from "../../utils/uiPermission";
import Button from "../shared/atoms/Button";
import MyApprovalActionPill from "../shared/atoms/MyApprovalActionPill";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import Tooltip from "../shared/Tooltip";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";

// Update the interface to include the new prop
interface EmpLeaveRequestCardProps extends LeaveCardProps {
  onOpenReplaceModal?: () => void;
  onRevokeApproved?: () => void;
}

const EmpLeaveRequestCard = ({
  data,
  buttonStatus,
  onOpenReplaceModal,
}: EmpLeaveRequestCardProps) => {
  const { isDesktop } = useScreenSize();
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const revokeEventMutation = useRevokeEvent();
  const { setRefetchAttendance } = useGlobalStore();

  const { openModal } = useRequestLeaveModal();

  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");
  const canRequestLeave = isActionEnabled(
    userUiPermission,
    "revoke_replace_edit",
    "My Requests",
  );

  const leaveButtonConfig = buttonStatus?.leave_applications?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app: any) => app.name === data?.reference_name,
  );

  const allowEdit = leaveButtonConfig?.show_edit_button;
  const allowReplace = leaveButtonConfig?.show_replace_button;

  const handleRevokeClick = () => {
    if (data?.todo_id) {
      revokeEventMutation.mutate(
        {
          docname: data?.reference_name,
          doctype: data?.reference_type,
          todo: data?.todo_id,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
            setRefetchAttendance(true);
            toast.success("Leave revoked successfully");
          },
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
    openModal({
      fromDate: data?.reference_document?.from_date,
      toDate: data?.reference_document?.to_date,
      leaveType: data?.reference_document?.leave_type,
      description: data?.reference_document?.description,
      custom_reason: data?.reference_document?.custom_reason,
      halfDay: data?.reference_document?.half_day,
      custom_attachment: data?.reference_document?.custom_attachment,
      half_day_date: data?.reference_document?.half_day_date,
      custom_second_half_day_date:
        data?.reference_document?.custom_second_half_day_date,
      source: "other",
      hideHalfDayToggle: false,
      isEdit: true,
      leave_application: data?.reference_document?.name,
    });
  };

  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();
    if (status === "open")
      return { label: "Pending", statusColor: "bg-yellow-100 text-yellow-800" };
    if (status === "approved")
      return {
        label: "Approved",
        statusColor: "bg-success/10 text-success",
      };

    if (status === "rejected")
      return { label: "Rejected", statusColor: "bg-red-500/10 text-red-500" };
    return {
      label: rawStatus || "Unknown",
      statusColor: "bg-gray-100 text-gray-800",
    };
  };

  const status = getStatus(data?.reference_document?.status);

  const cleanDescription = sanitizeToPlainText(
    data?.reference_document?.description,
  );
  const truncatedDescription = truncateByChars(cleanDescription);

  const isPending = data?.reference_document?.status === "Open";
  const isApproved = data?.reference_document?.status === "Approved";

  const showEdit = allowEdit && isPending;
  const showRevoke = isPending && data?.custom_allow_revoke && canRequestLeave;
  const showReplace = allowReplace && (isPending || isApproved);

  return (
    <>
      {isDesktop ? (
        <div
          style={{ gridTemplateColumns: "1fr 1fr 1fr 1.5fr 1fr 1fr 1fr" }}
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        >
          <Typography
            variant="bodySmall"
            className="font-medium text-center truncate"
          >
            {data?.reference_document?.leave_type}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document.to_date)}
          </Typography>

          <Tooltip content={cleanDescription}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedDescription}
            </Typography>
          </Tooltip>
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.total_leave_days > 1
              ? data?.reference_document?.total_leave_days + " Days"
              : data?.reference_document?.total_leave_days + " Day"}
          </Typography>
          <div className="flex items-center justify-center">
            <Tooltip
              content={
                status?.label === "Pending"
                  ? `Allocated to : ${data?.allocated_to}`
                  : ""
              }
            >
              <StatusBadge status={data?.reference_document?.status} />
            </Tooltip>
          </div>
          <div className="flex items-center justify-center">
            <MyApprovalActionPill
              isPending={isPending}
              canRevoke={
                isPending && data?.custom_allow_revoke && canRequestLeave
              }
              // optional
              canEdit={allowEdit}
              canReplace={allowReplace && (isPending || isApproved)}
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
                <Typography variant="mobileCardLabel">Allocated To</Typography>
                <Typography variant="mobileCardValue">
                  {data?.username || data?.allocated_to}
                </Typography>
              </div>

              <StatusBadge status={data?.reference_document?.status} />
            </div>

            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Leave Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.leave_type}
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

            {/* Bottom Actions */}
            {(showEdit || showRevoke || showReplace) && (
              <div className="flex gap-2 mt-3">
                {showEdit && (
                  <Button
                    fullWidth
                    size="md"
                    variant="contain"
                    onClick={handleEditClick}
                    icon={<SquarePen className="w-4 h-4" />}
                  >
                    Edit
                  </Button>
                )}

                {showReplace && (
                  <Button
                    fullWidth
                    size="md"
                    variant="contain"
                    onClick={handleReplaceClick}
                    icon={<Repeat1 className="w-4 h-4" />}
                  >
                    Replace
                  </Button>
                )}

                {showRevoke && (
                  <Button
                    fullWidth
                    size="md"
                    variant="contain"
                    onClick={handleRevokeClick}
                    disabled={revokeEventMutation.isPending}
                    icon={<RotateCcw className="w-4 h-4" />}
                  >
                    {revokeEventMutation.isPending ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </div>
            )}
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
    </>
  );
};

export default EmpLeaveRequestCard;
