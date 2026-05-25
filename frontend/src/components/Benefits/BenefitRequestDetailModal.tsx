/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import { useCommentOnBenefitClaim } from "../../hooks/useBenefit";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useScreenSize } from "../../hooks/useScreenSize";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { formatCurrency } from "../../utils/currency";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";
import Button from "../shared/atoms/Button";
import TeamApprovalActionPill from "../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import { AttachmentCard } from "../shared/molecules/AttachmentCard";

export function BenefitRequestDetailModal({
  actionsEnabled,
  documentName,
  referenceName,
  data: propsData,
  onClose,
  onAction,
  label = "Benefit Request",
  maskAmounts = false,
}: {
  actionsEnabled: boolean;
  documentName?: string;
  referenceName?: string;
  data?: any;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
  maskAmounts?: boolean;
}) {
  const mutation = useApprovalListActions();
  const CommentBenefitClaim = useCommentOnBenefitClaim();

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName, referenceName);

  const data = documentName || referenceName ? fetchedData : propsData;
  const { isDesktop } = useScreenSize();

  const [isActed, setIsActed] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: string) => {
      if (action.toLowerCase() === "reject") {
        if (!rejectionComment.trim()) {
          setPendingAction(action);
          setShowCommentModal(true);
          return;
        }
      }
      setCurrentAction(action);

      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync({
          action,
          name: data?.todo_id || "",
        });

        const actionMap: Record<string, string> = {
          Approve: "Approved",
          Reject: "Rejected",
        };
        const finalAction = actionMap[action] ?? `${action}ed`;
        toast.success(`Request ${finalAction} Successfully!`);

        const responseWithSession = response as unknown as { session?: any };
        if (
          (data?.custom_approval_type === "Approval Matrix" &&
            responseWithSession?.session) ||
          (data?.custom_approval_type === "Multi Actions" &&
            data?.custom_open_chatnext_assistant_on_action)
        ) {
          if (window.trigger_chatnext_assistant) {
            window.trigger_chatnext_assistant(true, responseWithSession?.session);
          }
        }

        if (action.toLowerCase() === "reject") {
          setRejectionComment("");
        }
        setCurrentAction(null);
        setIsActed(true);
        document.dispatchEvent(
          new CustomEvent("approval:acted", { detail: { id: data?.todo_id } }),
        );
        if (onAction) onAction();
      } catch (error) {
        setCurrentAction(null);
        toast.error(errorResponseFormater(error));
        console.error("Action failed", error);
      }
    },
    [data, mutation, onAction, rejectionComment],
  );

  const handleSaveComment = async () => {
    if (!rejectionComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      await CommentBenefitClaim.mutateAsync({
        doc_name: data?.reference_document?.name || data?.reference_name || "",
        comment: rejectionComment,
      });

      setShowCommentModal(false);

      if (pendingAction) {
        handleAction(pendingAction);
        setPendingAction(null);
        setRejectionComment("");
      }
    } catch (error) {
      console.error("Failed to save comment", error);
    }
  };

  const handleCancelComment = () => {
    setShowCommentModal(false);
    setPendingAction(null);
  };

  const actions = useMemo(() => {
    try {
      const value = data?.custom_doctype_actions;

      if (typeof value === "string") {
        return JSON.parse(value);
      }

      if (Array.isArray(value)) {
        return value;
      }

      return [];
    } catch (e) {
      console.error("Invalid JSON in custom_doctype_actions", e);
      return [];
    }
  }, [data?.custom_doctype_actions]);

  const refDoc = data?.reference_document;
  const status =
    data?.todo_status === "Closed" && refDoc?.custom_status !== "Rejected"
      ? "Approved"
      : refDoc?.custom_status;
  const isPending = refDoc?.custom_status === "Pending";

  if (isLoading && (documentName || referenceName)) {
    return <LoadingView onClose={onClose} label={label} />;
  }
  if (error && (documentName || referenceName)) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  if (!data?.todo_id && !data?.name && !data?.reference_document?.name) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[85vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography variant="h4" className="font-semibold text-gray-900 leading-tight">
            {label}
          </Typography>
          <Button
            variant="subtle"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32 md:pb-6">
          {/* Employee + Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel" className="text-gray-500">
                {refDoc?.employee_name ? "Employee Name" : "Employee ID"}
              </Typography>
              <Typography variant="mobileCardValue">
                {refDoc?.employee_name || refDoc?.employee}
              </Typography>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Claim Benefit For + Claim Date */}
          <div className="flex justify-between w-full">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Claim Benefit For</Typography>
              <Typography variant="mobileCardValue">
                {refDoc?.earning_component}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Claim Date</Typography>
              <Typography variant="mobileCardValue">
                {formatToIndianDate(refDoc?.claim_date || "")}
              </Typography>
            </div>
          </div>

          {/* Claimed Amount + Max Amount */}
          <div className="flex justify-between w-full">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Claimed Amount</Typography>
              <Typography
                variant="mobileCardValue"
                className={maskAmounts ? "blur-[3px]" : ""}
              >
                {maskAmounts ? "#####" : formatCurrency(refDoc?.claimed_amount ?? 0)}
              </Typography>
            </div>
            {refDoc?.custom_max_amount !== undefined && (
              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Max Eligible</Typography>
                <Typography
                  variant="mobileCardValue"
                  className={maskAmounts ? "blur-[3px]" : ""}
                >
                  {maskAmounts ? "#####" : formatCurrency(refDoc?.custom_max_amount ?? 0)}
                </Typography>
              </div>
            )}
          </div>

          {/* Taxable / Non-Taxable Amounts */}
          {(refDoc?.custom_taxable_amount !== undefined ||
            refDoc?.custom_non_taxable_amount !== undefined) && (
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Taxable Amount</Typography>
                  <Typography
                    variant="mobileCardValue"
                    className={maskAmounts ? "blur-[3px]" : ""}
                  >
                    {maskAmounts
                      ? "#####"
                      : formatCurrency(refDoc?.custom_taxable_amount ?? 0)}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel">Non-Taxable Amount</Typography>
                  <Typography
                    variant="mobileCardValue"
                    className={maskAmounts ? "blur-[3px]" : ""}
                  >
                    {maskAmounts
                      ? "#####"
                      : formatCurrency(refDoc?.custom_non_taxable_amount ?? 0)}
                  </Typography>
                </div>
              </div>
            )}

          {/* Company */}
          {refDoc?.company && (
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Company</Typography>
              <Typography variant="mobileCardValue">{refDoc?.company}</Typography>
            </div>
          )}

          {/* Note by Employee */}
          {refDoc?.custom_note_by_employee && (
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Note by Employee</Typography>
              <Typography variant="mobileCardValue">
                {refDoc?.custom_note_by_employee}
              </Typography>
            </div>
          )}

          {/* Note by Approver */}
          {refDoc?.custom_note_by_approver && (
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Note by Approver</Typography>
              <Typography variant="mobileCardValue">
                {refDoc?.custom_note_by_approver}
              </Typography>
            </div>
          )}

          {/* Attachments */}
          {data?.attachments && data?.attachments?.length > 0 && (
            <div className="flex flex-col gap-2">
              <Typography variant="bodySmall" className="font-bold block">
                Attachments
              </Typography>
              <div className="space-y-2">
                {data.attachments.map((item: any) => (
                  <AttachmentCard key={item.file_url} fileUrl={item.file_url} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        {actions?.length > 0 && isPending && !isActed ? (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <TeamApprovalActionPill
              actionsEnabled={actionsEnabled}
              variant={isDesktop ? "modal" : "buttons"}
              actions={actions}
              status={data?.todo_status === "Closed" && refDoc?.custom_status !== "Rejected"
                ? "Approved"
                : refDoc?.custom_status}
              recordId={data?.todo_id}
              loadingAction={
                currentAction ? { id: data?.todo_id, action: currentAction } : null
              }
              onAction={(action) => handleAction(action)}
            />
          </div>
        ) : (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex items-center justify-center">
              <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 text-xs font-medium w-fit">
                {status === "Approved"
                  ? "Approved"
                  : status === "Rejected"
                    ? "Rejected"
                    : "Action Taken"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Comment Modal */}
      {showCommentModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
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
                onClick={(e) => e.stopPropagation()}
                placeholder="Enter your rejection comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button onClick={handleCancelComment} size="sm" bgColor="disabled">
                Cancel
              </Button>
              <Button
                onClick={handleSaveComment}
                size="sm"
                bgColor="primary"
                disabled={!rejectionComment.trim() || CommentBenefitClaim.isPending}
              >
                {CommentBenefitClaim.isPending ? (
                  <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
