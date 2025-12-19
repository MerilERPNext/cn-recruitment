/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import toast from "react-hot-toast";
import { useExpenseCommentUpdate } from "../../../hooks/useExpense";
import { useCommentOnBenefitClaim } from "../../../hooks/useBenefit";
import { createPortal } from "react-dom";

// Props type
type BenefitRequestItemProps = {
  isSelected?: boolean;
  isDisabled?: boolean;
  onToggleSelect?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  onAction: (action: string, data: any) => void;
  onClick?: (data: any) => void;
  refetch?: () => void;
  loadingAction?: { id: string; action: string } | null;
};

const BenefitRequestItem = ({
  isSelected = false,
  isDisabled = false,
  onToggleSelect,
  data,
  onAction,
  onClick,
  loadingAction,
}: BenefitRequestItemProps) => {
  console.log(data)
  const { isDesktop } = useScreenSize();
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [rejectionComment, setRejectionComment] = useState("");

  const CommentBenefitClaim = useCommentOnBenefitClaim();

  const handleCancelComment = () => {
    setShowCommentModal(false);
    setRejectionComment("");
    setSAction("");
  };
  const [sAction, setSAction] = useState<string>("");

  const handlePreSaveAction = (action: string) => {
    setShowCommentModal(() => action === "Reject")
    if (action !== "Reject") {
      onAction(action, data);
    }
    setSAction(action);
  }

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
  }

  const commentMutation = useExpenseCommentUpdate();
  if (!data) return null;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const actionsWithForm = data?.custom_doctype_actions_with_form
    ? JSON.parse(data?.custom_doctype_actions_with_form.replace(/'/g, '"'))
    : [];

  const getActionStyles = (action: string): { bg: string; text: string } => {
    const parsedAction = action.toLowerCase().trim();
    let styles = {
      bg: "gray-100",
      text: "gray-600",
    };
    switch (parsedAction) {
      case "approve":
        styles = {
          bg: "green-100",
          text: "green-600",
        };
        break;
      case "reject":
        styles = {
          bg: "red-100",
          text: "red-600",
        };

        break;
      default:
        styles = {
          bg: "gray-200",
          text: "gray-600",
        };
        break;
    }
    return styles;
  };

  const gridTemplateColumns = "8% 10% 10% 10% 10% 10% 10% 20%";


  return (
    <div>

      {isDesktop ?
        <div
          className="grid items-center gap-4 px-6 h-16 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          <div className="flex items-center">
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
          <div className="truncate text-gray-900 font-medium text-sm text-start">
            {data.reference_document.employee_name}
          </div>
          <div className="flex text-gray-900 text-sm flex-col">
            {data.reference_document.earning_component}
          </div>
          <div className="flex items-center text-gray-900 text-sm">
            {data.reference_document.claimed_amount}
          </div>
          <div className="flex items-center text-gray-900 text-sm">
            {data.reference_document.custom_max_amount}
          </div>
          <div className="flex items-center text-gray-900 text-sm">
            {formatToIndianDate(data.reference_document.claim_date)}
          </div>
          <div className="flex items-center text-sm">
            <StatusBadge status={data?.status} />
          </div>
          <div className="flex w-full justify-start gap-2 whitespace-nowrap">
            {actions?.length &&
              actions.map((action: string) => {
                return (
                  <Button
                    key={action}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePreSaveAction(action);
                    }}
                    bgColor={getActionStyles(action).bg}
                    textColor={getActionStyles(action).text}
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
        :
        <div
          className="flex flex-col gap-4 border rounded-lg p-4 mt-2 border-gray-300  hover:bg-gray-50 transition-colors cursor-pointer"
          style={{ gridTemplateColumns }}
          onClick={() => onClick?.(data)}
        >
          <div className="flex-1  w-full">
            <div className="flex items-baseline">
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
              <div className="pl-4">
                <div className="truncate text-gray-900  font-semibold text-lg text-start">
                  {data.reference_document.employee_name}
                </div>
                <div className="flex text-gray-500 font-meduim text-sm flex-col">
                  {data.reference_document.earning_component}
                </div>
              </div>
              <div className="flex items-center text-sm ml-auto">
                <StatusBadge status={data?.status} />
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex flex-col justify-start text-start  text-gray-900 text-sm">
              <label className="text-sm text-gray-500">claimed amount</label>
              <span className="text-gray-800 font-semibold">{data.reference_document.claimed_amount}</span>
            </div>
            <div className="flex flex-col justify-center text-center  text-gray-900 text-sm">
              <label className="text-sm text-gray-500">max eligible amount</label>
              <span className="text-gray-800 font-semibold">{data.reference_document.custom_max_amount}</span>
            </div>
            <div className="flex flex-col justify-end text-end  text-gray-900 text-sm">
              <label className="text-sm text-gray-500">claim date</label>
              <span className="text-gray-800 font-semibold">{formatToIndianDate(data.reference_document.claim_date)}</span>
            </div>
          </div>
          <div className="flex w-full justify-start gap-2 whitespace-nowrap">
            {actions?.length &&
              actions.map((action: string) => {
                return (
                  <Button
                    className="w-full"
                    key={action}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePreSaveAction(action);
                    }}
                    bgColor={getActionStyles(action).bg}
                    textColor={getActionStyles(action).text}
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
        </div>}
      {showCommentModal && createPortal(
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
                bgColor="gray-100"
                textColor="gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveComment}
                size="sm"
                bgColor="blue-100"
                textColor="blue-600"
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
        </div>,
        document.body
      )}
    </div>
  );
};


const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; borderColor: string }> = {
    Pending: { bg: "bg-yellow-100", text: "text-yellow-800", borderColor: "border-yellow-300" },
    Cancelled: { bg: "bg-gray-100", text: "text-gray-800", borderColor: "border-gray-300" },
    Rejected: { bg: "bg-red-100", text: "text-red-800", borderColor: "border-red-300" },
    Approved: { bg: "bg-green-100", text: "text-green-800", borderColor: "border-green-300" },
  };

  const config = statusConfig[status] || statusConfig.Pending;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-medium border ${config.bg} ${config.text} ${config.borderColor}`}>
      {status}
    </span>
  );
};

export default BenefitRequestItem;
