/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateApprovalComment } from "../../hooks/useCreateApprovalComment";
import useCurrentUser from "../../hooks/useCurrentUser";
import {
  useIsRejectionReasonMandatory,
} from "../../hooks/useLeaves";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import StatusBadge from "../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import MobileAllocatedTo from "../shared/MobileAllocatedTo";
import ActionReasonModal from "../shared/ActionReasonModal";
import Tooltip from "../shared/Tooltip";
import WrapperHoverCard from "../shared/WrapperHoverCard";

type LeaveApprovalCardProps = {
  actionsEnabled?: boolean;
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
  isActed?: boolean;
};
const LeaveApprovalCard = ({
  actionsEnabled,
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
  showRejectReason,
  isActed = false,
}: LeaveApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const approvalCommentMutation = useCreateApprovalComment();
  const { data: user } = useCurrentUser();
  const { data: rejectionMandatoryData } = useIsRejectionReasonMandatory();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingActionData, setPendingActionData] = useState<{
    action: string;
    data: any;
  } | null>(null);

  const handleActionClick = (action: string, actionData: any) => {
    if (["approve", "reject"].includes(action.toLowerCase())) {
      const isMandatory = rejectionMandatoryData ?? true;
      if (action.toLowerCase() === "approve" || isMandatory) {
        setPendingActionData({ action, data: actionData });
        setShowCommentModal(true);
        return;
      }
    }

    onAction(action, actionData);
  };

  const handleSaveComment = async (reason: string | null) => {
    try {
      if (pendingActionData) {
        if (reason !== null) {
          await approvalCommentMutation.mutateAsync({
            comment_type:
              pendingActionData.action.toLowerCase() === "approve"
                ? "Submitted"
                : "Cancelled",
            reference_doctype: "Leave Application",
            reference_name: data?.reference_document?.name || "",
            comment_email: user?.name || "",
            comment_by: user?.name || "",
            content: reason,
            subject: pendingActionData.action.toLowerCase() === "approve" ? "Request Approved" : "Request Rejected",
          });
        }

        setShowCommentModal(false);
        onAction(pendingActionData.action, pendingActionData.data);
        setPendingActionData(null);
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
    ? showRejectReason
      ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1.5fr 1fr"
      : "0.5fr 1fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr 1fr"
    : showRejectReason
      ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1.5fr 1fr"
      : "1fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr 1fr";
  return (
    <>
      {isDesktop ? (
        <div
          className="grid w-full items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer"
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

          <Link
            to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
            target="_blank"
            className="text-center"
          >
            <WrapperHoverCard employeeId={data?.reference_document?.employee}>
              <Typography
                variant="bodySmall"
                className="font-medium text-center truncate max-w-[150px]"
              >
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </Typography>
            </WrapperHoverCard>
          </Link>

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
            {formatToIndianDate(data?.reference_document?.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.to_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.creation)}
          </Typography>
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
              role={data?.role}      /* if action is reject and isMandatory by backend then show */
              position="left"
            >
              <StatusBadge status={data?.reference_document?.status} />
            </AllocatedToTooltip>
          </div>
          {showRejectReason && (
            <div className="flex items-center justify-center w-full min-w-0 pr-2">
              {data?.reference_document?.status === "Rejected" &&
                data?.reference_document?.custom_rejection_reason && (
                  <Tooltip
                    content={data?.reference_document?.custom_rejection_reason}
                  >
                    <Typography
                      variant="bodySmall"
                      className="font-medium text-center truncate"
                    >
                      {data?.reference_document?.custom_rejection_reason}
                    </Typography>
                  </Tooltip>
                )}
            </div>
          )}
          <Tooltip
            content={data?.send_back_comment || "--"}
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full text-gray-700"
            >
              {data?.send_back_comment || "--"}
            </Typography>
          </Tooltip>
          <div className="flex items-center justify-center">
            {data?.todo_status === "Open" && !isActed ? (
              <TeamApprovalActionPill
                actionsEnabled={actionsEnabled}
                actions={actions}
                status={data?.status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => handleActionClick(action, data)}
              />
            ) : (
              <div className="flex items-center justify-center">
                <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                  Action Taken
                </div>
              </div>
            )}
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

            <div className="w-full flex flex-col gap-3">
              <div className="flex items-start justify-between p-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Leave ID</Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="whitespace-nowrap"
                  >
                    {data?.reference_document?.name || "-"}
                  </Typography>
                </div>

                <StatusBadge status={data?.reference_document?.status} />
              </div>

              <div className="flex flex-col gap-1 px-1">
                <Typography variant="mobileCardLabel">
                  {data?.reference_document?.employee_name
                    ? "Employee Name"
                    : "Employee ID"}
                </Typography>
                <Typography
                  variant="mobileCardValue"
                  className="truncate font-bold text-gray-900"
                >
                  {data?.reference_document?.employee_name ||
                    data?.reference_document?.employee}
                </Typography>
              </div>

              <div className="flex justify-between w-full px-1">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <Typography variant="mobileCardLabel">Leave Type</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
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

              <div className="flex justify-between w-full px-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Duration</Typography>
                  <Typography variant="mobileCardValue">
                    {`${formatToIndianDate(data?.reference_document?.from_date)} to ${formatToIndianDate(data?.reference_document?.to_date)}`}
                  </Typography>
                </div>

                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">Due Date</Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data?.due_date)}
                  </Typography>
                </div>
              </div>

              <div className="flex justify-between w-full px-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Initiation Date</Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data?.reference_document?.creation)}
                  </Typography>
                </div>
              </div>

              <div className="flex flex-col gap-1 px-1">
                <Typography variant="mobileCardLabel">Reason</Typography>
                <Typography
                  variant="mobileCardValue"
                  className="whitespace-normal"
                >
                  {data?.reference_document?.reason_name || "-"}
                </Typography>
              </div>

              <div className="px-1 pt-1">
                <MobileAllocatedTo
                  users={data?.allocated_to}
                  roles={data?.allocated_roles}
                  username={data?.username}
                  role={data?.role}
                  RoleAssignedUsers={data?.role_assigned_users}
                />
              </div>

              {data?.reference_document?.status === "Rejected" &&
                data?.reference_document?.custom_rejection_reason && (
                  <div className="flex flex-col gap-1 px-1 pb-3">
                    <Typography variant="mobileCardLabel">
                      Reject Reason
                    </Typography>
                    <Typography
                      variant="mobileCardValue"
                      className="text-red-500 text-sm whitespace-normal"
                    >
                      {data?.reference_document?.custom_rejection_reason}
                    </Typography>
                  </div>
                )}

              <div className="flex flex-col gap-1 px-1">
                <Typography variant="mobileCardLabel">Sendback Comment</Typography>
                <Typography variant="mobileCardValue" className="text-gray-700">
                  {data?.send_back_comment || "--"}
                </Typography>
              </div>

              {data?.todo_status === "Open" && !isActed ? (
                <TeamApprovalActionPill
                  actionsEnabled={actionsEnabled}
                  variant="buttons"
                  actions={actions}
                  status={data?.reference_document?.status}
                  recordId={data?.todo_id}
                  loadingAction={loadingAction}
                  onAction={(action) => handleActionClick(action, data)}
                />
              ) : (
                <div className="flex items-center justify-center">
                  <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                    Action Taken
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ActionReasonModal
        isOpen={showCommentModal}
        isPending={approvalCommentMutation.isPending}
        type={pendingActionData?.action?.toLowerCase() === "approve" ? "approval" : "rejection"}
        title="Comment Required"
        description={`Please add a comment before ${pendingActionData?.action?.toLowerCase() === "approve"
          ? "approving"
          : "rejecting"
          } this leave request.`}
        label={`${pendingActionData?.action?.toLowerCase() === "approve"
          ? "APPROVAL"
          : "REJECTION"
          } COMMENT *`}
        placeholder={`Enter ${pendingActionData?.action?.toLowerCase() === "approve"
          ? "approval"
          : "rejection"
          } comment...`}
        todo_id={data?.todo_id}
        onCancel={handleCancelComment}
        onSave={handleSaveComment}
      />
    </>
  );
};

export default LeaveApprovalCard;
