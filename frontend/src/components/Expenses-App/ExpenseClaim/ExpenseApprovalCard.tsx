/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate, useUpdateExpenseClaimStatusAPI } from "../../../hooks/useExpense";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import Button from "../../shared/atoms/Button";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { AllowRequestsOnHoldResponse } from "../../../types/expense";

type ApprovalCardProps = {
  actionsEnabled?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  onAction: (action: string, data: any) => void;
  refetch?: () => void;
  onClick?: (data: any) => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled?: boolean;
  activeStatus?: string;
  isActed?: boolean;
  allowHoldData?: AllowRequestsOnHoldResponse;
  onRefetch?: () => void;
};

const ExpenseApprovalCard = ({
  actionsEnabled,
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled = true,
  activeStatus = "Pending",
  isActed = false,
  allowHoldData,
  onRefetch,
}: ApprovalCardProps) => {
  const { isDesktop } = useScreenSize();
  const commentMutation = useExpenseCommentUpdate();
  const updateStatusMutation = useUpdateExpenseClaimStatusAPI();
  const { data: user } = useCurrentUser();

  const showNoticeFlag = allowHoldData?.show_on_notice_flag_in_process_and_pay_reimbursement_page;
  const isOnNotice = data?.reference_document?.custom_employment_status === "On Notice Period";
  const shouldShowNoticeDot = showNoticeFlag && isOnNotice;

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [pendingActionData, setPendingActionData] = useState<{
    action: string;
    data: any;
  } | null>(null);
  const [pendingHoldAction, setPendingHoldAction] = useState<string | null>(null);

  const actions = (() => {
    let parsedActions: string[] = [];
    if (data?.custom_doctype_actions) {
      if (Array.isArray(data.custom_doctype_actions)) {
        parsedActions = data.custom_doctype_actions;
      } else {
        try {
          const parsed = JSON.parse(data.custom_doctype_actions);
          if (Array.isArray(parsed)) {
            parsedActions = parsed;
          }
        } catch (e) {
          console.error("Failed to parse custom_doctype_actions:", e);
        }
      }
    }

    if (allowHoldData) {
      if (!allowHoldData.show_approval_buttons) {
        parsedActions = parsedActions.filter(
          (a) => !["Approve", "Reject", "Send Back"].includes(a)
        );
      }
      if (allowHoldData.allow_requests_to_be_put_on_hold) {
        const currentApprovalStatus = data?.reference_document?.approval_status || data?.approval_status;
        if (currentApprovalStatus === "On Hold") {
          if (!parsedActions.includes("Unhold")) {
            parsedActions.push("Unhold");
          }
        } else {
          if (!parsedActions.includes("Hold")) {
            parsedActions.push("Hold");
          }
        }
      }
    }

    return parsedActions;
  })();
  const actionsWithForm = (() => {
    if (!data?.custom_doctype_actions_with_form) return [];
    try {
      return JSON.parse(data.custom_doctype_actions_with_form.replace(/'/g, '"'));
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions_with_form:", e);
      return [];
    }
  })();

  const gridTemplateColumns = isBulkSelectEnabled
    ? activeStatus === "Approved"
      ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr"
      : "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr"
    : activeStatus === "Approved"
      ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr"
      : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1fr";

  const totalClaimedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(data?.reference_document?.total_claimed_amount ?? 0);

  const handleActionClick = async (action: string, actionData: any) => {
    if (action.toLowerCase() === "hold" || action.toLowerCase() === "unhold") {
      setPendingHoldAction(action);
      return;
    }

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

  const handleConfirmHoldAction = async () => {
    if (!pendingHoldAction) return;
    const docname = data?.reference_document?.name || data?.reference_name;
    if (docname) {
      const newStatus = pendingHoldAction.toLowerCase() === "hold" ? "On Hold" : "Pending";
      try {
        await updateStatusMutation.mutateAsync({ docname, approvalStatus: newStatus });
        toast.success(`Request ${newStatus === "On Hold" ? "put on hold" : "unheld"} successfully`);
        if (onRefetch) {
          onRefetch();
        }
      } catch (e) {
        console.error("Failed to update status", e);
      }
    }
    setPendingHoldAction(null);
  };

  const handleCancelHoldAction = () => {
    setPendingHoldAction(null);
  };

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

          <Tooltip
            content={data?.reference_document?.name || ""}
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {data?.reference_document?.name || "--"}
            </Typography>
          </Tooltip>

          <Link
            to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
            target="_blank"
            className="min-w-0 flex items-center justify-center gap-1.5"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate"
            >
              <WrapperHoverCard employeeId={data?.reference_document?.employee}>
                {data?.reference_document?.employee_name}
              </WrapperHoverCard>
            </Typography>
            {shouldShowNoticeDot && (
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0" title="On Notice Period">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white shadow-sm"></span>
              </span>
            )}
          </Link>

          <Tooltip
            content={
              data?.reference_document?.custom_expense_category_name || ""
            }
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {data?.reference_document?.custom_expense_category_name || "--"}
            </Typography>
          </Tooltip>
          <Tooltip
            content={
              data?.reference_document?.expenses[0]?.custom_claim_type_name ||
              ""
            }
            triggerClassName="w-full truncate min-w-0 block"
          >
            <Typography
              variant="bodySmall"
              className="font-medium text-center truncate block w-full"
            >
              {data?.reference_document?.expenses[0]?.custom_claim_type_name ||
                "--"}
            </Typography>
          </Tooltip>
          <Typography
            variant="bodySmall"
            className="font-medium text-center truncate"
          >
            {formatToIndianDate(
              data?.reference_document?.expenses[0]?.expense_date,
            ) || "--"}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {totalClaimedAmount}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.reference_document?.creation)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data?.due_date)}
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
              <StatusBadge
                status={
                  data?.todo_status === "Closed" &&
                    data?.reference_document?.approval_status !== "Rejected"
                    ? "Approved"
                    : data?.reference_document?.approval_status
                }
              />
            </AllocatedToTooltip>
          </div>
          {activeStatus === "Approved" && (
            <div className="flex items-center justify-center">
              <Typography
                variant="bodySmall"
                className={`font-medium text-center min-w-[70px] ${data?.status === "Paid" ? "text-green-600" : "text-amber-600"}`}
              >
                {data?.status === "Paid" ? "Paid" : "Unpaid"}
              </Typography>
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
            {(!isActed && (activeStatus === "Pending" || activeStatus === "On Hold" || data?.reference_document?.approval_status === "On Hold")) ? (
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
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center text-gray-500"
                >
                  Action taken
                </Typography>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl"
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
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Expense Id</Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.name || "-"}
                  </Typography>
                </div>
                <StatusBadge
                  status={
                    data?.todo_status === "Closed" &&
                      data?.reference_document?.approval_status !== "Rejected"
                      ? "Approved"
                      : data?.reference_document?.approval_status
                  }
                />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    {data?.reference_document?.employee_name
                      ? "Employee Name"
                      : "Employee ID"}
                  </Typography>
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
                    target="_blank"
                    className="flex items-center gap-1.5"
                  >
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.employee_name ||
                        data?.reference_document?.employee}
                    </Typography>
                    {shouldShowNoticeDot && (
                      <span className="text-amber-500 font-semibold text-xs flex-shrink-0">
                        (On notice period)
                      </span>
                    )}
                  </Link>
                </div>
              </div>
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    Expense Category
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.custom_expense_category_name ||
                      "-"}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">
                    Expense Type
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.expenses?.[0]
                      ?.custom_claim_type_name || "-"}
                  </Typography>
                </div>
              </div>
              <div className="flex justify-between w-full mt-2">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    Claimed Amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {totalClaimedAmount}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">
                    Claimed Date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data?.reference_document?.creation)}
                  </Typography>
                </div>
              </div>

              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    Expense Date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(
                      data?.reference_document?.expenses[0]?.expense_date,
                    )}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">Due Date</Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data?.due_date)}
                  </Typography>
                </div>
              </div>

              {/* Allocated To */}
              <MobileAllocatedTo
                users={data?.allocated_to}
                roles={data?.allocated_roles}
                username={data?.username}
                role={data?.role}
                RoleAssignedUsers={data?.role_assigned_users}
              />
              {activeStatus === "Approved" && (
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">
                      Paid Status
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      className={`font-medium w-fit ${data?.status === "Paid" ? "text-green-600" : "text-amber-600"}`}
                    >
                      {data?.status === "Paid" ? "Paid" : "Unpaid"}
                    </Typography>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1 px-1">
                <Typography variant="mobileCardLabel">Sendback Comment</Typography>
                <Typography variant="mobileCardValue" className="text-gray-700">
                  {data?.send_back_comment || "--"}
                </Typography>
              </div>

              {(!isActed && (activeStatus === "Pending" || activeStatus === "On Hold" || data?.reference_document?.approval_status === "On Hold")) ? (
                <TeamApprovalActionPill
                  actionsEnabled={actionsEnabled}
                  variant="buttons"
                  actions={actions}
                  status={data?.status}
                  recordId={data?.todo_id}
                  loadingAction={loadingAction}
                  onAction={(action) => handleActionClick(action, data)}
                />
              ) : (
                <div className="bg-gray-50 px-3 py-1 rounded-md mt-2 w-fit mx-auto">
                  <Typography
                    variant="bodySmall"
                    className="text-center text-gray-100"
                  >
                    Action taken
                  </Typography>
                </div>
              )}
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
              {rejectionComment.trim().length < 15 && (
                <p className="text-[10px] mt-1 text-right text-gray-400">
                  {rejectionComment.trim().length}/15 characters minimum
                </p>
              )}
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
                  rejectionComment.trim().length < 15 ||
                  commentMutation.isPending
                }
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

      {pendingHoldAction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelHoldAction();
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Action
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to {pendingHoldAction.toLowerCase() === "hold" ? "put this request on hold" : "unhold this request"}?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleCancelHoldAction}
                size="sm"
                bgColor="disabled"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmHoldAction}
                size="sm"
                bgColor="primary"
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Confirm"
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
