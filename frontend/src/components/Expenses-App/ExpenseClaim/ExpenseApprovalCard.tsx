/* eslint-disable @typescript-eslint/no-explicit-any */
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import { useState } from "react";
import toast from "react-hot-toast";
import { useExpenseCommentUpdate } from "../../../hooks/useExpense";
import useCurrentUser from "../../../hooks/useCurrentUser";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { getActionStyles } from "../../../utils/actionButtonStyles";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { Link } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import Tooltip from "../../shared/Tooltip";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";

type ApprovalCardProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
};

const ExpenseApprovalCard = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled = true,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [pendingActionData, setPendingActionData] = useState<{
    action: string;
    data: any;
  } | null>(null);

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1fr 1fr 1fr";

  const getStatus = (status: string) => {
    if (status === "Pending" || status === "Open" || status === "Draft") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };

  const status = getStatus(data?.status);
  const totalClaimedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(data?.reference_document?.total_claimed_amount ?? 0);

  const handleActionClick = (action: string, actionData: any) => {
    if (action.toLowerCase() === "reject" && !rejectionComment.trim()) {
      setPendingActionData({ action, data: actionData });
      setShowCommentModal(true);
    } else {
      onAction(action, actionData);
      if (action.toLowerCase() === "reject") {
        setRejectionComment("");
      }
    }
  };

  const handleSaveComment = async () => {
    if (!rejectionComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    const referenceDoctype =
      data?.reference_document?.doctype || "Expense Claim";
    const referenceName =
      data?.reference_document?.name || data?.reference_name || "";

    try {
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName,
        content: rejectionComment,
        comment_email: user?.name || "",
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
                {data?.reference_document?.employee_name}
              </WrapperHoverCard>
            </Typography>
          </Link>
          <Typography variant="bodySmall" className="font-medium text-center">
            {data?.reference_document?.custom_expense_category}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {totalClaimedAmount}
          </Typography>

          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
          </Typography>

          <div className="flex items-center justify-center">
            {/* <Badge
              size="sm"
              label={status?.label as string}
              backgroundColor={status?.statusColor}
            /> */}
            <Tooltip
              content={
                status?.label === "Pending"
                  ? `Allocated to : ${data?.allocated_to}`
                  : ""
              }
            >
              <StatusBadge status={data?.status} />
            </Tooltip>
          </div>

          <div className="flex items-center justify-center">
            <TeamApprovalActionPill
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => handleActionClick(action, data)}
            />
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-1 border-gray-200 bg-white rounded-xl"
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
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
                    target="_blank"
                  >
                    <p className="card-title">
                      {data?.reference_document?.employee_name}
                    </p>
                  </Link>
                </div>

                <Badge
                  size="sm"
                  label={data?.status === "Draft" ? "Pending" : data?.status}
                  backgroundColor={status?.statusColor}
                />
              </div>
              <div className="flex flex-col items-start justify-between mt-1 rounded-md p-1">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <p className="card-title">Category</p>
                    <p className="card-subtitle">
                      {data?.reference_document?.custom_expense_category}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <p className="card-title">Claimed Amount</p>
                    <p className="card-subtitle">{totalClaimedAmount}</p>
                  </div>
                </div>

                <div className="flex justify-between w-full mt-2">
                  <div className="flex flex-col gap-1">
                    <p className="card-title">Claim Date</p>
                    <p className="card-subtitle">
                      {formatToIndianDate(
                        data?.reference_document?.expenses[0]?.expense_date,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <p className="card-title">Due Date</p>
                    <p className="card-subtitle">
                      {formatToIndianDate(data?.due_date)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length > 0 &&
                  data?.status !== "Approved" &&
                  data?.status !== "Rejected" &&
                  actions.map((action: string) => {
                    const actionStyle = getActionStyles(action);

                    return (
                      <Button
                        key={action}
                        fullWidth
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleActionClick(action, data);
                        }}
                        bgColor={actionStyle.bgColor}
                        variant={actionStyle.variant}
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
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCommentModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelComment();
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comment Required
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please add a comment before rejecting this expense claim.
            </p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                COMMENT *
              </label>
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Enter your rejection comment..."
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
                disabled={!rejectionComment.trim() || commentMutation.isPending}
              >
                {commentMutation.isPending ? (
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

export default ExpenseApprovalCard;
