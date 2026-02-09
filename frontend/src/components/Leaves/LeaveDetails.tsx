import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { useUpdateRejectionReason, useIsRejectionReasonMandatory } from "../../hooks/useLeaves";
import Button from "../shared/atoms/Button";
import DOMPurify from "dompurify";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import FileRenderer from "../shared/molecules/FileRenderer";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";
import { Typography } from "../shared/atoms/Typography";
import formatToIndianDate from "../../utils/formatToIndianDate";
import TeamApprovalActionPill from "../shared/atoms/TeamApprovalActionPill";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import StatusBadge from "../shared/atoms/statusBadge";

export function LeaveDetailView({
  documentName,
  data: propsData,
  onClose,
  onAction,
  label = "Leave Request",
}: {
  documentName?: string;
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
  } = useGetToDoWithReferenceDoc(documentName || "");

  const data = documentName ? fetchedData : propsData;

  const cleanDescription = DOMPurify.sanitize(data?.description || "");
  const getStatus = (status: string) => {
    if (status === "Pending" || status === "Open") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Cancelled") {
      return {
        label: "Cancelled",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };

  const status = getStatus(data?.status);
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

    [data, mutation, onAction, setRefetchAttendance, rejectionComment, rejectionMandatoryData],
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

  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }
  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  return data?.todo_id ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >

        <div className="flex items-center justify-between px-4 py-4   border-b border-gray-200 bg-white sticky top-0 z-20">
          <div className="flex gap-2 justify-center items-center">
            <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-50 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-32 md:pb-6">
          <div className="flex items-center justify-between">
            <div className=" flex flex-col gap-1">
              <Typography variant="bodyMedium">Leave Type</Typography>
              <Typography
                variant="bodySmall"
                color="body2"
              >
                {data?.reference_document?.leave_type}
              </Typography>
            </div>
            <StatusBadge status={data?.reference_document?.status} />
          </div>
          <div className="py-2">
            <div className="flex gap-2 justify-between">
              {data?.reference_document?.from_date && (
                <div className="flex flex-col gap-1">
                  <Typography variant="bodyMedium">From Date</Typography>
                  <Typography
                    variant="bodySmall"
                    color="body2"
                  >
                    {formatToIndianDate(data?.reference_document?.from_date)}
                  </Typography>
                </div>
              )}

              {data?.reference_document?.to_date && (
                <div className="flex flex-col gap-1">
                  <Typography variant="bodyMedium">To Date</Typography>
                  <Typography
                    variant="bodySmall"
                    color="body2"
                  >
                    {formatToIndianDate(data?.reference_document?.to_date)}
                  </Typography>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="py-2 flex flex-col gap-1">
              <Typography variant="bodyMedium">Reason</Typography>

              <Typography
                variant="bodySmall"
                color="body2"
              >
                {data?.reference_document?.custom_reason}
              </Typography>
            </div>
            {data?.date && (
              <div className=" flex flex-col gap-1">
                <Typography variant="bodyMedium">Due Date</Typography>
                <Typography
                  variant="bodySmall"
                  color="body2"
                >
                  {formatToIndianDate(data?.date)}
                </Typography>
              </div>
            )}
          </div>

          <div className="py-2">
            <Typography variant="bodyMedium">Description</Typography>
            <div className="text-sm text-gray-700 bg-primary/10 p-3 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
            </div>
          </div>
          {data?.reference_document?.custom_attachment ? (
            <div className="py-4">
              <Typography variant="bodyMedium">Attachment</Typography>
              <FileRenderer
                filePath={data?.reference_document?.custom_attachment || ""}
              />
            </div>
          ) : null}
        </div>

        {actions?.length > 0 && status?.label === "Pending" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">

            <TeamApprovalActionPill
              actions={actions}
              status={status.label}
              recordId={data.todo_id}
              loadingAction={
                currentAction
                  ? { id: data.todo_id, action: currentAction }
                  : null
              }
              onAction={handleAction}
              isModalAction
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
