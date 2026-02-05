/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import toast from "react-hot-toast";
import { useCurrentUser } from "../../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import { Link } from "react-router-dom";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import Tooltip from "../../../shared/Tooltip";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";

export type ApprovalRejectionLoanProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
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

  const getActionStyles = (action: string) => {
    const a = action.toLowerCase();
    if (a === "approve") return { bg: "success-100", text: "success" };
    if (a === "reject") return { bg: "error-50", text: "error" };
    return { bg: "gray-200", text: "gray-600" };
  };

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
            <Tooltip
              content={
                data?.reference_document?.status === "Draft"
                  ? `Allocated to : ${data?.allocated_to}`
                  : ""
              }
            >
              <StatusBadge status={data?.reference_document?.status} />
            </Tooltip>
          </div>

          <div className="flex items-center justify-center">
            <TeamApprovalActionPill
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => onAction(action, data)}
            />
          </div>
        </div>

        {/* COMMENT MODAL */}
        {commentOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
            <div className="bg-white w-full max-w-md rounded-xl p-5">
              <h3 className="font-semibold mb-2">
                {selectedAction === "Reject"
                  ? "Reject Reason"
                  : "Approval Comment"}
              </h3>

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
                  bgColor={getActionStyles(selectedAction!).bg}
                  className={`text-${getActionStyles(selectedAction!).text}`}
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
        className="bg-white rounded-xl border border-gray-200 p-4 mb-3 shadow-sm"
        onClick={() => onClick?.(data)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <Link
              to={`/webapp/employee-profile?target_user=${data?.reference_document?.custom_employee}`}
              target="_blank"
            >
              <p className="font-semibold text-sm">
                {data?.reference_document?.employee_name}
              </p>
            </Link>
            <p className="text-xs text-gray-500">
              {data?.reference_document?.custom_advance_type}
            </p>
          </div>

          {isBulkSelectEnabled && (
            <input
              type="checkbox"
              className="accent-blue-500 mt-1"
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
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
          <div>
            <span className="block text-gray-400">Amount</span>
            <span className="font-medium text-gray-800">
              {data?.reference_document?.advance_amount}
            </span>
          </div>

          <div>
            <span className="block text-gray-400">Status</span>
            <StatusBadge status={data?.reference_document?.status} />
          </div>

          <div>
            <span className="block text-gray-400">Start Date</span>
            {formatToIndianDate(
              data?.reference_document?.custom_repayment_start_date,
            )}
          </div>

          <div>
            <span className="block text-gray-400">Posting Date</span>
            {formatToIndianDate(data?.reference_document?.posting_date)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action: string) => (
            <Button
              key={action}
              onClick={(e) => {
                e.stopPropagation();
                handleActionClick(action);
              }}
              bgColor={getActionStyles(action).bg}
              className={`text-${getActionStyles(action).text}`}
              disabled={
                loadingAction?.id === data?.todo_id &&
                loadingAction?.action === action
              }
            >
              {loadingAction?.id === data?.todo_id &&
              loadingAction?.action === action ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                action
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* COMMENT MODAL */}
      {commentOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-xl p-5">
            <h3 className="font-semibold mb-2">
              {selectedAction === "Reject"
                ? "Reject Reason"
                : "Approval Comment"}
            </h3>

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
                bgColor={getActionStyles(selectedAction!).bg}
                className={`text-${getActionStyles(selectedAction!).text}`}
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
