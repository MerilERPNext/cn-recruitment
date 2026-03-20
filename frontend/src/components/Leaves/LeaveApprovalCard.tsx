/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  useIsRejectionReasonMandatory,
  useUpdateRejectionReason,
} from "../../hooks/useLeaves";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import Button from "../shared/atoms/Button";
import StatusBadge from "../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../shared/MobileAllocatedTo";
import Tooltip from "../shared/Tooltip";
import WrapperHoverCard from "../shared/WrapperHoverCard";

type LeaveApprovalCardProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled: boolean;
  showRejectReason?: boolean;
};
const LeaveApprovalCard = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
  showRejectReason,
}: LeaveApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const updateRejectionReasonMutation = useUpdateRejectionReason();
  const { data: rejectionMandatoryData } = useIsRejectionReasonMandatory();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [pendingActionData, setPendingActionData] = useState<{
    action: string;
    data: any;
  } | null>(null);

  const handleActionClick = (action: string, actionData: any) => {
    if (action.toLowerCase() === "reject") {
      const isMandatory = rejectionMandatoryData ?? true;
      if (isMandatory && !rejectionComment.trim()) {
        setPendingActionData({ action, data: actionData });
        setShowCommentModal(true);
        return;
      }
    }

    onAction(action, actionData);
    if (action.toLowerCase() === "reject") {
      setRejectionComment("");
    }
  };

  const handleSaveComment = async () => {
    if (!rejectionComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      await updateRejectionReasonMutation.mutateAsync({
        id: data?.reference_document?.name || "",
        reason: rejectionComment,
      });

      setShowCommentModal(false);

      if (pendingActionData) {
        onAction(pendingActionData.action, pendingActionData.data);
        setPendingActionData(null);
        setRejectionComment("");
      }
    } catch (error) {
      console.error("Failed to save comment", error);
    }
  };

  const handleCancelComment = () => {
    setShowCommentModal(false);
    setPendingActionData(null);
  };

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const gridTemplateColumns = isBulkSelectEnabled
    ? (showRejectReason ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr" : "0.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr 1fr 1fr 1fr")
    : (showRejectReason ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr" : "1.5fr 1.5fr 1.5fr 1.5fr 1fr 1fr 1fr 1fr");
  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          {isBulkSelectEnabled && (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                className="accent-primary"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect?.(data?.todo_id)}
                disabled={
                  isDisabled ||
                  actionsWithForm?.includes("Approve") ||
                  actionsWithForm?.includes("Reject")
                }
              />
            </div>
          )}

          <Link
            to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
            target="_blank"
            className="text-center"
          >
            <WrapperHoverCard employeeId={data?.reference_document?.employee}>
              <Typography
                variant="bodySmall"
                className="font-medium text-center truncate"
              >
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </Typography>
            </WrapperHoverCard>
          </Link>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.custom_leave_type_name}
          </Typography>

          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.to_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.total_leave_days > 1
              ? data?.reference_document?.total_leave_days + " Days"
              : data?.reference_document?.total_leave_days + " Day"}
          </Typography>

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              role={data?.role}
              position="left"
            >
              <StatusBadge status={data?.reference_document?.status} />
            </AllocatedToTooltip>
          </div>
          {showRejectReason && (
            <div className="flex items-center justify-center w-full min-w-0 pr-2">
              {data?.reference_document?.status === "Rejected" && data?.reference_document?.custom_rejection_reason && (
                <Tooltip content={data?.reference_document?.custom_rejection_reason}>
                  <Typography variant="bodySmall" className="font-medium text-center truncate">
                    {data?.reference_document?.custom_rejection_reason}
                  </Typography>
                </Tooltip>
              )}
            </div>
          )}
          <div className="flex items-center justify-center">
            <TeamApprovalActionPill
              actions={actions}
              status={data?.reference_document?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => handleActionClick(action, data)}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b 
             border-x-primary/20 border-b-primary/20 
             shadow-sm border-primary bg-white rounded-xl"
          onClick={() => {
            if (onClick) {
              onClick(data);
            }
          }}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            {isBulkSelectEnabled && (
              <input
                type="checkbox"
                className="mt-1 accent-blue-500"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelect?.(data?.todo_id)}
                disabled={
                  isDisabled ||
                  actionsWithForm?.includes("Approve") ||
                  actionsWithForm?.includes("Reject")
                }
              />
            )}

            <div className="w-full">
              <div className="flex items-start justify-between p-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    {data?.reference_document?.employee_name
                      ? "Employee Name"
                      : "Employee ID"}
                  </Typography>

                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.employee_name ||
                      data?.reference_document?.employee}
                  </Typography>
                </div>

                <StatusBadge status={data?.reference_document?.status} />
              </div>

              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel">
                      Leave Type
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.leave_type}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <MobileAllocatedTo
                      users={data?.allocated_to}
                      roles={data?.allocated_roles}
                      username={data?.username}
                      role={data?.role}
                      align="right"
                    />
                  </div>
                </div>

                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel">Duration</Typography>
                    <Typography variant="mobileCardValue">
                      {`${formatToIndianDate(data?.reference_document?.from_date)} to ${formatToIndianDate(data?.reference_document?.to_date)}`}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel">
                      Leave Days
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.total_leave_days > 1
                        ? data?.reference_document?.total_leave_days + " Days"
                        : data?.reference_document?.total_leave_days + " Day"}
                    </Typography>
                  </div>
                </div>
              </div>

              {data?.reference_document?.status === "Rejected" && data?.reference_document?.custom_rejection_reason && (
                <div className="flex flex-col gap-1 px-1 pb-3">
                  <Typography variant="mobileCardLabel">Reject Reason</Typography>
                  <Typography variant="mobileCardValue" className="text-red-500 text-sm whitespace-normal">
                    {data?.reference_document?.custom_rejection_reason}
                  </Typography>
                </div>
              )}

              <TeamApprovalActionPill
                variant="buttons"
                actions={actions}
                status={data?.reference_document?.status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => handleActionClick(action, data)}
              />
            </div>
          </div>
        </div>
      )}
      {showCommentModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comment Required
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please add a comment before rejecting this leave request.
            </p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                REJECTION REASON *
              </label>
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleCancelComment}
                size="sm"
                bgColor="disabled"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveComment}
                size="sm"
                bgColor="primary"
                disabled={
                  !rejectionComment.trim() ||
                  updateRejectionReasonMutation.isPending
                }
              >
                {updateRejectionReasonMutation.isPending ? (
                  <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveApprovalCard;
