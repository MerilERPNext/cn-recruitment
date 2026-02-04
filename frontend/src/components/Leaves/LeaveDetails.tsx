import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import DOMPurify from "dompurify";
import Badge from "../shared/Badge";
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

  const handleAction = useCallback(
    async (action: string) => {
      setCurrentAction(action);

      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync({
          action,
          name: data?.todo_id || "",
        });
        toast.success(`Leave ${action} successfully`);
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
        setCurrentAction(null);
      } catch (error) {
        setCurrentAction(null);
        toast.error(errorResponseFormater(error));
        console.error("Action failed", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  // Loading state
  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  // Error state
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
        {/* Header */}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4   border-b border-gray-200 bg-white sticky top-0 z-20">
          <div className="flex gap-2 justify-center items-center">
            <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-primary/10 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-primary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-32 md:pb-6">
          {/* Employee Info */}
          <div className="py-4">
            <Badge
              label={status?.label as string}
              backgroundColor={status?.statusColor}
            />{" "}
          </div>
          <div className="py-2">
            <div className="flex gap-2 justify-between">
              {/* Display From Date */}
              {data?.reference_document?.from_date && (
                <p className="flex flex-col gap-1">
                  <Typography variant="bodyMedium">From Date</Typography>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-500/80 font-medium"
                  >
                    {formatToIndianDate(data?.reference_document?.from_date)}
                  </Typography>
                </p>
              )}

              {/* Display To Date */}
              {data?.reference_document?.to_date && (
                <p className=" flex flex-col gap-1">
                  <Typography variant="bodyMedium">To Date</Typography>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-500/80 font-medium"
                  >
                    {formatToIndianDate(data?.reference_document?.to_date)}
                  </Typography>
                </p>
              )}
            </div>
          </div>
          {data?.due_date && (
            <p className=" flex flex-col gap-1">
              <Typography variant="bodyMedium">Due Date</Typography>
              <Typography
                variant="bodySmall"
                className="text-gray-500/80 font-medium"
              >
                {formatToIndianDate(data?.due_date)}
              </Typography>
            </p>
          )}
          <div className="py-2 flex flex-col gap-1">
            <Typography variant="bodyMedium">Reason</Typography>

            <Typography
              variant="bodySmall"
              className="text-gray-500/80 font-medium"
            >
              {data?.reference_document?.custom_reason}
            </Typography>
          </div>
          {/* explanation */}
          <div className="py-2">
            <Typography variant="bodyMedium">Description</Typography>
            <div className="text-xs bg-primary/10 p-3 rounded-lg">
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

        {/* Actions */}
        {actions?.length > 0 && status?.label === "Pending" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            {/* <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
              {actions?.length &&
                actions?.map((action: string) => {
                  const actionStyle = getActionStyles(action);

                  const isLoading =
                    currentAction === action && mutation.isPending;
                  return (
                    <Button
                      key={action}
                      fullWidth
                      disabled={isLoading}
                      onClick={() => {
                        handleAction(action);
                      }}
                      size="md"
                      bgColor={actionStyle.bgColor}
                      variant={actionStyle.variant}
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        action
                      )}
                    </Button>
                  );
                })}
            </div> */}
            <TeamApprovalActionPill
              actions={actions}
              status={status.label} // or data?.status if you want raw
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
    </div>
  ) : null;
}
