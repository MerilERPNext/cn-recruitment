import DOMPurify from "dompurify";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import {
  useIsRejectionReasonMandatory,
  useUpdateRejectionReason,
} from "../../hooks/useLeaves";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";
import Button from "../shared/atoms/Button";
import TeamApprovalActionPill from "../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import { AttachmentCard } from "../shared/molecules/AttachmentCard";

export function LeaveDetailView({
  documentName,
  referenceName,
  data: propsData,
  onClose,
  onAction,
  label = "Leave Request",
}: {
  documentName?: string;
  referenceName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
}) {
  const mutation = useApprovalListActions();
  const updateRejectionReasonMutation = useUpdateRejectionReason();
  const { data: rejectionMandatoryData } = useIsRejectionReasonMandatory();
  const { setRefetchAttendance } = useGlobalStore();

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName, referenceName);

  const data = (documentName || referenceName) ? fetchedData : propsData;
  console.log(data)
  const { isDesktop } = useScreenSize();

  const cleanDescription = DOMPurify.sanitize(data?.reference_document?.description || "");

  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: string) => {
      if (action.toLowerCase() === "reject") {
        const isMandatory = rejectionMandatoryData ?? true;
        if (isMandatory && !rejectionComment.trim()) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseWithSession = response as unknown as { session?: any };

        if (
          (data?.custom_approval_type === "Approval Matrix" &&
            responseWithSession?.session) ||
          (data?.custom_approval_type === "Multi Actions" &&
            data?.custom_open_chatnext_assistant_on_action)
        ) {
          if (window.trigger_chatnext_assistant) {
            window.trigger_chatnext_assistant(
              true,
              responseWithSession?.session,
            );
          }
        } else {
          setTimeout(() => {
            setRefetchAttendance(true);
          }, 2000);
        }
        if (onAction) {
          onAction();
        }
        if (action.toLowerCase() === "reject") {
          setRejectionComment("");
        }
        setCurrentAction(null);
      } catch (error) {
        setCurrentAction(null);
        toast.error(errorResponseFormater(error));
        console.error("Action failed", error);
      }
    },

    [
      data,
      mutation,
      onAction,
      setRefetchAttendance,
      rejectionComment,
      rejectionMandatoryData,
    ],
  );

  const handleSaveComment = async () => {
    if (!rejectionComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      await updateRejectionReasonMutation.mutateAsync({
        id: data?.reference_document?.name || data?.reference_name || "",
        reason: rejectionComment,
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
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  if (isLoading && (documentName || referenceName)) {
    return <LoadingView onClose={onClose} label={label} />;
  }
  if (error && (documentName || referenceName)) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  return (data?.todo_id || data?.name || data?.reference_document?.name) ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="h4"
            className="font-semibold text-gray-900 leading-tight"
          >
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Allocated To + Status */}
          <div className="flex gap-2 justify-between p-1">
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="text-gray-500">
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
            <div>
              <StatusBadge status={data?.reference_document?.status} />
            </div>
          </div>

          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Leave Type
                </Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.leave_type}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Reason
                </Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.custom_reason}
                </Typography>
              </div>
            </div>
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Duration
                </Typography>
                <Typography variant="mobileCardValue">
                  {`${formatToIndianDate(data?.reference_document?.from_date)} to ${formatToIndianDate(data?.reference_document?.to_date)}`}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Due Date
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate((data?.due_date || data?.date) as string)}
                </Typography>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Typography variant="mobileCardLabel">Description</Typography>
              <Typography variant="mobileCardValue">
                {cleanDescription}
              </Typography>
            </div>
            {data?.reference_document?.status === "Rejected" && data?.reference_document?.custom_rejection_reason && (
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel">Reject Reason</Typography>
                <Typography variant="mobileCardValue" className="text-red-500 text-sm whitespace-normal">
                  {data?.reference_document?.custom_rejection_reason}
                </Typography>
              </div>
            )}
          </div>

          {data?.attachments && data?.attachments?.length > 0 ? (
            <div className="py-4">
              <Typography variant="bodySmall" className="mb-2 font-bold block">
                Attachment
              </Typography>

              <div className="space-y-2">
                {data.attachments.map((item: any) => (
                  <AttachmentCard key={item.file_url} fileUrl={item.file_url} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {actions?.length > 0 && data?.status === "Open" && (
          <div className="w-full bg-white border-t shadow-md p-4 z-20">
            <TeamApprovalActionPill
              variant={isDesktop ? "modal" : "buttons"}
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={
                currentAction
                  ? { id: data?.todo_id, action: currentAction }
                  : null
              }
              onAction={(action) => handleAction(action)}
            />
          </div>
        )}
      </div>
      {showCommentModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
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
              Please add a comment before rejecting this leave request.
            </p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase mb-1 block">
                REJECTION REASON *
              </label>
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Enter rejection reason..."
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
                  !rejectionComment.trim() ||
                  updateRejectionReasonMutation.isPending
                }
              >
                {updateRejectionReasonMutation.isPending ? (
                  <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;
}
