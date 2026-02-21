/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import toast from "react-hot-toast";
import { useCurrentUser } from "../../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import { Link } from "react-router-dom";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
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

const ApprovalRejectionLoanList = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
}: ApprovalRejectionLoanProps) => {
  const { isMobile } = useScreenSize();
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
      data?.reference_document?.doctype || "Loan Application";
    const referenceName =
      data?.reference_document?.name || data?.reference_name;

    try {
      // Save comment
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName,
        content: comment,
        comment_email: user?.name || "",
      });

      // Trigger the parent action callback
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
    ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

  /* ===================== MOBILE UI ===================== */
  if (isMobile) {
    return (
      <>
        <div
          className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm"
          onClick={() => onClick?.(data)}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <Link
                to={`/webapp/employee-profile?target_user=${data?.reference_document?.custom_employee}`}
                target="_blank"
              >
                <p className="text-sm font-semibold">
                  {data?.reference_document?.applicant_name ||
                    data?.reference_document?.applicant}
                </p>
              </Link>
              <p className="text-xs text-gray-500">
                {data?.reference_document?.loan_product}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <StatusBadge status={data?.reference_document?.status} />
              {isBulkSelectEnabled && (
                <input
                  type="checkbox"
                  className="accent-primary mt-1"
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
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
            <div>
              <span className="block text-gray-400">Amount</span>
              <span className="font-medium text-gray-800">
                {data?.reference_document?.loan_amount}
              </span>
            </div>

            <div>
              <span className="block text-gray-400">Interest</span>
              <span className="font-medium text-gray-800">
                {data?.reference_document?.rate_of_interest}%
              </span>
            </div>

            <div>
              <span className="block text-gray-400">Start Date</span>
              {formatToIndianDate(
                data?.reference_document?.custom_repayment_start_date,
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {actions.map((action: string) => (
              <Button
                key={action}
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(action);
                }}
                bgColor={getActionStyles(action).bg}
                disabled={
                  loadingAction?.id === data?.todo_id &&
                  loadingAction?.action === action
                }
                className="flex-1"
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
                <Button
                  bgColor="gray-200"
                  onClick={() => setCommentOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  bgColor={getActionStyles(selectedAction!).bg}
                  onClick={handleConfirmAction}
                  disabled={commentMutation.isPending}
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

  /* ===================== DESKTOP UI ===================== */
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

        <div className="flex items-center justify-center">
          <Link
            to={`/webapp/employee-profile?target_user=${data?.reference_document?.custom_employee}`}
            target="_blank"
          >
            <WrapperHoverCard
              employeeId={data?.reference_document?.custom_employee}
            >
              <Typography
                variant="bodySmall"
                className="font-medium text-center truncate"
              >
                {data?.reference_document?.applicant_name ||
                  data?.reference_document?.custom_employee}
              </Typography>
            </WrapperHoverCard>
          </Link>
        </div>

        <Typography variant="bodySmall" className="font-medium text-center">
          {data?.reference_document?.loan_product}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {data?.reference_document?.loan_amount}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {data?.reference_document?.rate_of_interest}%
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {data?.reference_document?.total_payable_interest}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(
            data?.reference_document?.custom_repayment_start_date,
          )}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(data?.reference_document?.posting_date)}
        </Typography>

        <div className="flex items-center justify-center">
          <AllocatedToTooltip
            users={data?.reference_document?.status === "Open" ? data?.allocated_to : undefined}
            roles={data?.reference_document?.status === "Open" ? data?.allocated_roles : undefined}
            position="left"
          >
            <StatusBadge status={data?.reference_document?.status} />
          </AllocatedToTooltip>
        </div>

        <div className="flex items-center justify-center">
          <TeamApprovalActionPill
            actions={actions}
            status={data?.reference_document?.status}
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

export default ApprovalRejectionLoanList;
