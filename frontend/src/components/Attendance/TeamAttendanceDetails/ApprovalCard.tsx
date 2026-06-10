import { useState } from "react";
import { Link } from "react-router-dom";
import { useUpdateAttendanceRejectionReason } from "../../../hooks/useAttendance";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import RejectionReasonModal from "../../shared/RejectionReasonModal";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { getAssignedUsersCell } from "../../../utils/getAssignedUsersCell";

type ApprovalCardProps = {
  uiPermission?: {
    app: string;
    page: string;
    actionKey: string;
  };
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
  isActed?: boolean;
};
const ApprovalCard = ({
  uiPermission,
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
  isActed = false,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const updateRejectionReasonMutation = useUpdateAttendanceRejectionReason();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingActionData, setPendingActionData] = useState<{
    action: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleActionClick = (action: string, actionData: any) => {
    if (action.toLowerCase() === "reject") {
      setPendingActionData({ action, data: actionData });
      setShowCommentModal(true);
      return;
    }
    onAction(action, actionData);
  };

  const handleSaveComment = async (reason: string) => {
    try {
      await updateRejectionReasonMutation.mutateAsync({
        id: data?.reference_document?.name || "",
        reason,
      });
      setShowCommentModal(false);
      if (pendingActionData) {
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
    ? "0.5fr 1fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";
  const cleanExplaination = sanitizeToPlainText(
    data?.reference_document?.explanation,
  );
  const truncatedExplaination = truncateByChars(cleanExplaination);
  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          {/* Checkbox */}
          {isBulkSelectEnabled && (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                className="accent-blue-500"
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
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {" "}
              <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </WrapperHoverCard>
            </Typography>
          </Link>
          <Tooltip content={cleanExplaination}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedExplaination}
            </Typography>
          </Tooltip>

          <Typography variant="bodySmall" className="font-medium text-center">
            {getAssignedUsersCell(data)}
          </Typography>
          {/* Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.from_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.to_date)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>

          {/* Status + Actions */}
          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              role={data?.role}
              RoleAssignedUsers={data?.role_assigned_users}
              position="left"
            >
              <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.custom_status !== "Rejected" ? "Approved" : data?.reference_document?.custom_status} />

            </AllocatedToTooltip>
          </div>
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
                uiPermission={uiPermission}
                actions={actions}
                status={data?.reference_document?.custom_status || data?.reference_document?.status}
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
          onClick={() => onClick?.(data)}
        >
          <div className="p-4 flex items-start gap-3 w-full">
            {isBulkSelectEnabled && (
              <input
                type="checkbox"
                className="mt-1 accent-primary"
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
              {/* Header */}
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

                <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.custom_status !== "Rejected" ? "Approved" : data?.reference_document?.custom_status} />
              </div>

              {/* Info Section */}
              <div className="flex flex-col mt-2 p-1 gap-3">
                <div className="flex justify-between w-full">
                  <MobileAllocatedTo
                    users={data?.allocated_to}
                    roles={data?.allocated_roles}
                    username={data?.username}
                    role={data?.role}
                    RoleAssignedUsers={data?.role_assigned_users}
                  />
                  <div className="flex flex-col gap-1 text-right">
                    <Typography variant="mobileCardLabel">Due Date</Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.due_date)}
                    </Typography>
                  </div>
                </div>

                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">From</Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.reference_document?.from_date)}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-1 text-right">
                    <Typography variant="mobileCardLabel">To</Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.reference_document?.to_date)}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Explanation (if exists) */}
              <div className="mt-3 flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Explanation</Typography>
                <Typography variant="mobileCardValue">
                  {truncateByChars(cleanExplaination, 40)}
                </Typography>
              </div>
              <div>
                <Typography variant="mobileCardLabel">Assigned To</Typography>
                <Typography variant="mobileCardValue">
                  {getAssignedUsersCell(data)}
                </Typography>
              </div>
                <div>
                  <Typography variant="mobileCardLabel">Sendback Comment</Typography>
                  <Typography variant="mobileCardValue" className="text-gray-700">
                    {data?.send_back_comment || "--"}
                  </Typography>
                </div>
              {/* Actions */}
              {data?.todo_status === "Open" && !isActed ? (
                <TeamApprovalActionPill
                  uiPermission={uiPermission}
                  variant="buttons"
                  actions={actions}
                  status={data?.reference_document?.custom_status || data?.reference_document?.status}
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
      <RejectionReasonModal
        isOpen={showCommentModal}
        isPending={updateRejectionReasonMutation.isPending}
        description="Please add a comment before rejecting this attendance request."
        onCancel={handleCancelComment}
        onSave={handleSaveComment}
      />
    </>
  );
};

export default ApprovalCard;
