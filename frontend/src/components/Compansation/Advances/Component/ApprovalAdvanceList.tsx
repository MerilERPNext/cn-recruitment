/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { getActionStyles } from "../../../../utils/actionButtonStyles";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

export type ApprovalRejectionLoanProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  isActed?: boolean;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled: boolean;
};

const ApprovalRejectionAdvanceList = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  isActed = false,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
}: ApprovalRejectionLoanProps) => {
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentUser();
  const commentMutation = useExpenseCommentUpdate();

  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];



  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setComment("");
    setCommentOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    if (!comment.trim()) {
      toast.error("Comment is required");
      return;
    }

    const referenceDoctype =
      data?.reference_document?.doctype || "Employee Advance";
    const referenceName =
      data?.reference_document?.name || data?.reference_name;

    try {
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName,
        content: comment,
        comment_email: user?.name || "",
      });

      onAction(selectedAction, data);

      setComment("");
      setSelectedAction(null);
      setCommentOpen(false);
      toast.success(`${selectedAction} successful`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save comment");
    }
  };

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1fr 1fr 1fr 1fr";

  /* ===================== DESKTOP UI ===================== */
  if (isDesktop) {
    return (
      <>
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
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                {data?.reference_document?.employee_name}
              </WrapperHoverCard>
            </Typography>
          </Link>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data.reference_document.custom_advance_type}
          </Typography>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.advance_amount}
          </Typography>

          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(
              data.reference_document.custom_repayment_start_date,
            )}
          </Typography>

          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data.reference_document.posting_date)}
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

          <div className="flex items-center justify-center">
            {data?.todo_status === "Open" && !isActed ? (
              <TeamApprovalActionPill
                actions={actions}
                status={data?.status}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => handleActionClick(action)}
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

        {/* COMMENT MODAL */}
        {commentOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
            <div className="bg-white w-full max-w-md rounded-xl p-5">
              <Typography variant="h4" className="font-semibold mb-2">
                {selectedAction === "Reject"
                  ? "Reject Reason"
                  : "Approval Comment"}
              </Typography>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Enter comment..."
              />

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  bgColor="gray-200"
                  onClick={() => setCommentOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  bgColor={getActionStyles(selectedAction!).bgColor}
                  variant={getActionStyles(selectedAction!).variant}
                  onClick={handleConfirmAction}
                  disabled={commentMutation.isPending || !comment.trim()}
                >
                  Save & {selectedAction}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ===================== MOBILE UI ===================== */
  return (
    <>
      <div
        className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl"
        onClick={() => onClick?.(data)}
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
            {/* Header — Employee Name + Status */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Employee Name</Typography>
                <Link
                  to={`/webapp/employee-profile?target_user=${data?.reference_document?.custom_employee}`}
                  target="_blank"
                >
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.employee_name}
                  </Typography>
                </Link>
              </div>
              <StatusBadge status={data?.status} />
            </div>

            {/* Amount & Advance Type */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Amount</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.advance_amount}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Advance Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.custom_advance_type}
                </Typography>
              </div>
            </div>

            {/* Start Date & Posting Date */}
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Start Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(
                    data?.reference_document?.custom_repayment_start_date,
                  )}
                </Typography>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Posting Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.posting_date)}
                </Typography>
              </div>
            </div>

            {data?.todo_status === "Open" && !isActed ? (
              <TeamApprovalActionPill
                variant="buttons"
                actions={actions}
                status={data?.status || ""}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={(action) => handleActionClick(action)}
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

      {/* COMMENT MODAL */}
      {commentOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-xl p-5">
            <Typography variant="h4" className="font-semibold mb-2">
              {selectedAction === "Reject"
                ? "Reject Reason"
                : "Approval Comment"}
            </Typography>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-md p-2 text-sm"
              placeholder="Enter comment..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button bgColor="gray-200" onClick={() => setCommentOpen(false)}>
                Cancel
              </Button>

              <Button
                bgColor={getActionStyles(selectedAction!).bgColor}
                variant={getActionStyles(selectedAction!).variant}
                onClick={handleConfirmAction}
                disabled={commentMutation.isPending || !comment.trim()}
              >
                Save & {selectedAction}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApprovalRejectionAdvanceList;
