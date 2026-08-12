/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import { useLoanApplicationUpdate } from "../../../../hooks/useLoan";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import FrappeAPI from "../../../../utils/frappeAPI";
import ActionReasonModal from "../../../shared/ActionReasonModal";

export type ApprovalRejectionLoanProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: any;
  isActed?: boolean;
  actionsEnabled?: boolean;
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
  isActed = false,
  actionsEnabled = true,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
}: ApprovalRejectionLoanProps) => {
  const { isMobile } = useScreenSize();
  const { data: user } = useCurrentUser();
  const commentMutation = useExpenseCommentUpdate();
  const loanFormUpdate = useLoanApplicationUpdate();

  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customRepaymentStartDate, setCustomRepaymentStartDate] = useState("");

  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setCustomRepaymentStartDate(data?.reference_document?.custom_repayment_start_date || "");
    setCommentOpen(true);
  };

  const handleConfirmAction = async (reason: string | null) => {
    if (!selectedAction) return;

    if (reason !== null && !reason.trim()) {
      toast.error("Comment is required");
      return;
    }

    const referenceDoctype =
      data?.reference_document?.doctype || "Loan Application";
    const referenceName =
      data?.reference_document?.name || data?.reference_name;

    try {
      // 1. Update the document via Resource API (matching detail view behavior)
      if (selectedAction === "Approve" && customRepaymentStartDate) {
        await loanFormUpdate.mutateAsync({
          docname: referenceName,
          data: {
            custom_repayment_start_date: customRepaymentStartDate,
          },
        });
      }

      // 2. Save comment
      if (reason !== null) {
        await FrappeAPI.callMethod("frappe.desk.form.utils.add_comment", {
          reference_doctype: referenceDoctype,
          reference_name: referenceName,
          content: reason,
          comment_email: user?.name || "",
          comment_by: "",
        });
      }

      // Trigger the parent action callback
      onAction(selectedAction, data);

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
          className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl"
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

            <div className="w-full flex flex-col gap-3">
              {/* Header — Employee Name + Status */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    Employee Name
                  </Typography>
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.custom_employee}`}
                    target="_blank"
                  >
                    <Typography variant="mobileCardValue">
                      {data?.reference_document?.applicant_name ||
                        data?.reference_document?.applicant}
                    </Typography>
                  </Link>
                </div>
                <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.approval_status !== "Rejected" ? "Approved" : data?.reference_document?.approval_status} />
              </div>

              {/* Amount & Loan Product */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Amount</Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.loan_amount}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">Loan Type</Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.loan_product}
                  </Typography>
                </div>
              </div>

              {/* Interest & Start Date */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Interest</Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.rate_of_interest}%
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">Start Date</Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(
                      data?.reference_document?.custom_repayment_start_date,
                    )}
                  </Typography>
                </div>
              </div>

              {/* Allocated To */}
              <MobileAllocatedTo
                users={data?.allocated_to}
                roles={data?.allocated_roles}
                role={data?.role}
                username={data?.username}
                RoleAssignedUsers={data?.role_assigned_users}
              />

              {actionsEnabled && data?.todo_status === "Open" && !isActed ? (
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
        <ActionReasonModal
          isOpen={commentOpen}
          isPending={loanFormUpdate.isPending || commentMutation.isPending}
          type={selectedAction === "Reject" ? "rejection" : "approval"}
          title={selectedAction === "Reject" ? "Reject Reason" : "Approval Comment"}
          description={`Please add a comment before ${selectedAction === "Reject" ? "rejecting" : "approving"} this request.`}
          label={`${selectedAction === "Reject" ? "REJECTION" : "APPROVAL"} COMMENT *`}
          placeholder="Enter comment..."
          todo_id={data?.todo_id}
          onCancel={() => setCommentOpen(false)}
          onSave={handleConfirmAction}
        >
          {selectedAction === "Approve" && (
            <div className="mt-3 text-left">
              <Typography variant="bodySmall" className="mb-1 block font-medium">
                Repayment Start Date
              </Typography>
              <input
                type="date"
                value={customRepaymentStartDate}
                onChange={(e) => setCustomRepaymentStartDate(e.target.value)}
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </ActionReasonModal>
      </>
    );
  }

  /* ===================== DESKTOP UI ===================== */
  return (
    <>
      <div
        className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer"
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
            users={data?.allocated_to}
            RoleAssignedUsers={data?.role_assigned_users}
            roles={data?.allocated_roles}
            allocated_to_user={data?.username}
            role={data?.role}
            position="left"
          >
            <StatusBadge status={data?.todo_status === "Closed" && data?.reference_document?.approval_status !== "Rejected" ? "Approved" : data?.reference_document?.status} />

          </AllocatedToTooltip>
        </div>

        <div className="flex items-center justify-center">
          {actionsEnabled && data?.todo_status === "Open" && !isActed ? (
            <TeamApprovalActionPill
              actions={actions}
              status={data?.reference_document?.status}
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
      <ActionReasonModal
        isOpen={commentOpen}
        isPending={loanFormUpdate.isPending}
        type={selectedAction === "Reject" ? "rejection" : "approval"}
        title={selectedAction === "Reject" ? "Reject Reason" : "Approval Comment"}
        description={`Please add a comment before ${selectedAction === "Reject" ? "rejecting" : "approving"} this request.`}
        label={`${selectedAction === "Reject" ? "REJECTION" : "APPROVAL"} COMMENT *`}
        placeholder="Enter comment..."
        todo_id={data?.todo_id}
        onCancel={() => setCommentOpen(false)}
        onSave={handleConfirmAction}
      >
        {selectedAction === "Approve" && (
          <div className="mt-3 text-left">
            <Typography variant="bodySmall" className="mb-1 block font-medium">
              Repayment Start Date
            </Typography>
            <input
              type="date"
              value={customRepaymentStartDate}
              onChange={(e) => setCustomRepaymentStartDate(e.target.value)}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </ActionReasonModal>
    </>
  );
};

export default ApprovalRejectionLoanList;
