/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import toast from "react-hot-toast";
import { useCommentOnBenefitClaim } from "../../../hooks/useBenefit";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { formatCurrency } from "../../../utils/currency";
import { BenefitType } from "../../../types/benefit";
import MyApprovalActionPill from "../../shared/atoms/MyApprovalActionPill";



// Props type
type BenefitRequestItemProps = {
  actionsEnabled: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  data: BenefitType;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  refetch?: () => void;
  loadingAction?: { id: string; action: string } | null;
  isBulkSelectEnabled: boolean;
  isActed?: boolean;
};

const BenefitRequestItem = ({
  actionsEnabled,
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
  isBulkSelectEnabled,
  isActed = false,
}: BenefitRequestItemProps) => {
  const { isDesktop } = useScreenSize();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");

  const CommentBenefitClaim = useCommentOnBenefitClaim();


  const handleCancelComment = () => {
    setShowCommentModal(false);
    setRejectionComment("");
    setSAction("");
  };
  const [sAction, setSAction] = useState<string>("");

  const handlePreSaveAction = (action: string) => {
    setShowCommentModal(() => action === "Reject");
    if (action !== "Reject") {
      onAction(action, data);
    }
    setSAction(action);
  };

  const handleSaveComment = async () => {
    if (!rejectionComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      const res = await CommentBenefitClaim.mutateAsync({
        doc_name: data.reference_document.name,
        comment: rejectionComment,
      });
      console.log("Update Response", res);
      handleCancelComment();
      onAction(sAction, data);
    } catch (error) {
      console.error("Failed to save comment", error);
    }
  };

  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const gridTemplateColumns = isBulkSelectEnabled
    ? "0.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    : "1fr 1fr 1fr 1fr 1fr 1fr 1fr";

  return (
    <div>
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
              <WrapperHoverCard employeeId={data.reference_document.employee}>
                {data.reference_document.employee_name}
              </WrapperHoverCard>
            </Typography>
          </Link>

          <Typography variant="bodySmall" className="font-medium text-center">
            {data.reference_document.earning_component}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatCurrency(data.reference_document.claimed_amount)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatCurrency(data.reference_document.custom_max_amount)}
          </Typography>
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(data.reference_document.claim_date)}
          </Typography>
          <div className="flex items-center justify-center">
            <AllocatedToTooltip
              users={data?.allocated_to}
              roles={data?.allocated_roles}
              allocated_to_user={data?.username}
              RoleAssignedUsers={data?.role_assigned_users || []}
              role={data?.role || ""}
              position="left"
            >
              <StatusBadge
                status={
                  data.todo_status === "Closed" &&
                    data.reference_document.custom_status !== "Rejected"
                    ? "Approved"
                    : data.reference_document.custom_status
                }
              />
            </AllocatedToTooltip>
          </div>
          <div className="flex items-center justify-center">
            {data?.todo_status === "Open" && !isActed ? (
              <div className={isActed ? "pointer-events-none opacity-50" : ""}>
                <MyApprovalActionPill
                  uiPermission={{
                    app: "Benifits",
                    page: "My Requests",
                    actionKeysMap: {
                      edit: "edit",
                      revoke: "revoke",
                      nudge: "nudge"
                    },
                  }}
                  todoId={data?.todo_id}

                />
              </div>
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
          className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-2xl mt-2 w-full"
          onClick={() => onClick?.(data)}
        >
          <div className="p-6 flex items-start gap-3 w-full">
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

                  <Typography variant="mobileCardTitle" className="block mt-1">
                    {data.reference_document.earning_component}
                  </Typography>
                </div>
                <StatusBadge
                  status={
                    data.todo_status === "Closed" &&
                      data.reference_document.custom_status !== "Rejected"
                      ? "Approved"
                      : data.reference_document.custom_status
                  }
                />
              </div>
              <div className="flex justify-between mt-4">
                <div className="flex flex-col justify-start text-start">
                  <Typography variant="mobileCardLabel" className="block mt-1">
                    Employee Name
                  </Typography>
                  <Link
                    to={`/webapp/employee-profile?target_user=${data?.reference_document?.employee}`}
                    target={isDesktop ? "_blank" : "_self"}
                  >
                    <Typography variant="mobileCardValue">
                      {data.reference_document.employee_name}
                    </Typography>
                  </Link>
                </div>
                <div className="flex flex-col justify-start text-end">
                  <Typography variant="mobileCardLabel" className="block mb-1">
                    Claimed amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatCurrency(data.reference_document.claimed_amount)}
                  </Typography>
                </div>
              </div>
              <div className="flex justify-between mt-4">

                <div className="flex flex-col justify-center text-start">
                  <Typography variant="mobileCardLabel" className="block mb-1">
                    Max eligible
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatCurrency(data.reference_document.custom_max_amount)}
                  </Typography>
                </div>
                <div className="flex flex-col justify-end text-right">
                  <Typography variant="mobileCardLabel" className="block mb-1">
                    Claim date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(data.reference_document.claim_date)}
                  </Typography>
                </div>
              </div>

              <div className="mt-4 w-full">
                {data?.todo_status === "Open" && !isActed ? (
                    <div className={isActed ? "pointer-events-none opacity-50" : ""}>
                      <MyApprovalActionPill
                        uiPermission={{
                          app: "Benifits",
                          page: "My Requests",
                          actionKeysMap: {
                            edit: "edit",
                            revoke: "revoke",
                            nudge: "nudge"
                          },
                        }}
                        todoId={data?.todo_id}

                      />
                    </div>
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
        </div>
      )
      }
      {
        showCommentModal &&
        createPortal(
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
                Please add a comment before rejecting this benefit request.
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
                  disabled={
                    !rejectionComment.trim() || CommentBenefitClaim.isPending
                  }
                >
                  {CommentBenefitClaim.isPending ? (
                    <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Save & Continue"
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      }
    </div >
  );
};

export default BenefitRequestItem;
