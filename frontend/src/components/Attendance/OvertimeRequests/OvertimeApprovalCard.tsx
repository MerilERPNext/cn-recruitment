/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useUpdateOvertimeRejectionReason } from "../../../hooks/useAttendance";
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
  actionsEdnabled: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
  isActed?: boolean;
};
const OvertimeApprovalCard = ({
  actionsEdnabled,
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
  const updateRejectionReasonMutation = useUpdateOvertimeRejectionReason();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingActionData, setPendingActionData] = useState<{
    action: string;
    data: any;
  } | null>(null);

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

  const cleanDescription = sanitizeToPlainText(data?.description);
  const truncatedDescription = truncateByChars(cleanDescription);

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1fr 1.5fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1.5fr 1fr 1fr";

  return (
    <>
      {isDesktop ? (
        <div
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
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
              <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </WrapperHoverCard>
            </Typography>
          </Link>

          <Tooltip content={cleanDescription}>
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              {truncatedDescription}
            </Typography>
          </Tooltip>
          <Typography variant="bodySmall" className="font-medium text-center">
            {getAssignedUsersCell(data)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>

          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              RoleAssignedUsers={data?.role_assigned_users}
              position="left"
            >
              <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.status !== "Rejected" ? "Approved" : data?.reference_document?.status} />
            </AllocatedToTooltip>
          </div>
          <div className="flex items-center justify-center">
            {data?.reference_document?.status === "Open" && !isActed ? <TeamApprovalActionPill
              actionsEdnabled={actionsEdnabled}
              actions={actions}
              status={data?.reference_document?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => handleActionClick(action, data)}
            /> : <div className="flex items-center justify-center">
              <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                Action Taken
              </div>
            </div>}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x-1 border-b-1 
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
                  <div className="flex flex-col gap-1">
                    <Typography
                      variant="mobileCardLabel"
                      className="text-gray-500"
                    >
                      {data?.reference_document?.employee_name
                        ? "Employee Name"
                        : "Employee ID"}
                    </Typography>

                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.employee_name ||
                        data?.reference_document?.employee}
                    </Typography>
                  </div>
                </div>
                <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.status !== "Rejected" ? "Approved" : data?.reference_document?.status} />
              </div>

              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <MobileAllocatedTo
                    users={data?.allocated_to}
                    roles={data?.allocated_roles}
                    username={data?.username}
                    RoleAssignedUsers={data?.role_assigned_users}
                  />
                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel" className="block">
                      Due Date
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.due_date)}
                    </Typography>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Typography variant="mobileCardLabel" className="block">
                    Description
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {truncateByChars(cleanDescription, 40)}
                  </Typography>
                </div>
              </div>
              <div >
                <Typography variant="mobileCardLabel">Assigned To</Typography>
                <Typography variant="mobileCardValue">
                  {getAssignedUsersCell(data)}
                </Typography>
              </div>
              {data?.reference_document?.status === "Open" && !isActed ? <TeamApprovalActionPill
                actionsEdnabled={actionsEdnabled}
                variant="buttons"
                actions={actions}
                status={data?.reference_document?.status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => handleActionClick(action, data)}
              /> : <div className="flex items-center justify-center">
                <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                  Action Taken
                </div>
              </div>}
            </div>
          </div>
        </div>
      )}
      <RejectionReasonModal
        isOpen={showCommentModal}
        isPending={updateRejectionReasonMutation.isPending}
        description="Please add a comment before rejecting this overtime request."
        onCancel={handleCancelComment}
        onSave={handleSaveComment}
      />
    </>
  );
};

export default OvertimeApprovalCard;
