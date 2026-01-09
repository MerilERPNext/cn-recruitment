import { X } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import DOMPurify from "dompurify";
import Badge from "../shared/Badge";
import Button, { ButtonColor } from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import FileRenderer from "../shared/molecules/FileRenderer";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";

export function AttendanceDetailView({
  data: propData,
  documentName,
  onClose,
  onAction,
  label = "Attendance Request",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  documentName?: string;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
}) {
  // Fetch data if documentName is provided
  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName || "");

  // Use fetched data if documentName is provided, otherwise use prop data
  const data = documentName ? fetchedData : propData;
  const mutation = useApprovalListActions();
  const { setRefetchAttendance } = useGlobalStore();

  // Don't render anything if neither documentName nor data is provided
  // When documentName is provided, we should render even if data isn't loaded yet
  const shouldRender = !!documentName || !!data?.todo_id;

  const cleanDescription = DOMPurify.sanitize(data?.description || "");
  const cleanExplaination = DOMPurify.sanitize(
    data?.reference_document?.explanation || ""
  );
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

        console.log("Action response:", response);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseWithSession = response as unknown as { session?: any };
        console.log("Session data:", responseWithSession?.session);
        console.log(
          "Assistant trigger enabled:",
          data?.custom_open_chatnext_assistant_on_action
        );

        if (
          (data?.custom_approval_type === "Approval Matrix" &&
            responseWithSession?.session) ||
          (data?.custom_approval_type === "Multi Actions" &&
            data?.custom_open_chatnext_assistant_on_action)
        ) {
          console.log(
            "Opening assistant with session:",
            responseWithSession?.session
          );
          if (window.trigger_chatnext_assistant) {
            window.trigger_chatnext_assistant(
              true,
              responseWithSession?.session
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

        console.error("Action failed", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const getActionStyles = (action: string): { bg: ButtonColor; text: string } => {
    const parsedAction = action.toLowerCase().trim();
    let styles = {
      bg: "disabled" as ButtonColor,
      text: "gray-600",
    };
    switch (parsedAction) {
      case "approve":
        styles = {
          bg: "success" as ButtonColor,
          text: "green-600",
        };
        break;
      case "reject":
        styles = {
          bg: "error" as ButtonColor,
          text: "red-600",
        };

        break;
      default:
        styles = {
          bg: "disabled" as ButtonColor,
          text: "gray-600",
        };
        break;
    }
    return styles;
  };

  const formatDate = (date: string): string => {
    if (!date) return "--/--/----";

    const possibleFormats = ["dd-MM-yyyy", "yyyy-MM-dd"];

    for (const dateFormat of possibleFormats) {
      const parsedDate = parse(date, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd/MM/yyyy");
      }
    }

    return "--/--/----";
  };

  // Loading state
  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  // Error state
  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  // Only render if we have documentName or data
  if (!shouldRender) return null;
  return (
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
            <Typography variant="h4" className="font-semibold text-gray-800">{label}</Typography>
          </div>
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
                <div className="flex flex-col gap-1">
                  <Typography variant="label" color="body2" className="card-title">From Date</Typography>
                  <Typography variant="bodySmall" className="card-subtitle">
                    {formatDate(data?.reference_document?.from_date)}
                  </Typography>
                </div>
              )}

              {/* Display To Date */}
              {data?.reference_document?.to_date && (
                <div className=" flex flex-col gap-1">
                  <Typography variant="label" color="body2" className="card-title">To Date</Typography>
                  <Typography variant="bodySmall" className="card-subtitle">
                    {formatDate(data?.reference_document?.to_date)}
                  </Typography>
                </div>
              )}
            </div>
          </div>
          {data?.due_date && (
            <div className=" flex flex-col gap-1">
              <Typography variant="label" color="body2" className="card-title">Due Date</Typography>
              <Typography variant="bodySmall" className="card-subtitle">
                {formatDate(data?.due_date)}
              </Typography>
            </div>
          )}
          <div className="py-2 flex flex-col gap-1">
            <Typography variant="label" color="body2" className="card-title">Reason</Typography>
            <Typography variant="bodySmall" className="card-subtitle">
              {label === "Leave Application"
                ? data?.reference_document?.custom_reason
                : data?.reference_document?.reason}
            </Typography>
          </div>
          {/* description */}
          <div className="py-2">
            <Typography variant="label" color="body2" className="card-title mb-2 block">Description</Typography>
            <div className="text-sm bg-gray-100 p-3 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
            </div>
          </div>
          {/* explanation */}
          <div className="py-2">
            <Typography variant="label" color="body2" className="card-title mb-2 block">Explanation</Typography>
            <div className="text-sm bg-gray-100 p-3 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: cleanExplaination }} />
            </div>
          </div>
          {data?.attachments && data?.attachments?.length > 0 ? (
            <div className="py-2">
              <Typography variant="label" color="body2" className="card-title mb-2 block">Attachment</Typography>
              {data?.attachments?.map((item: { file_url: string }) => (
                <FileRenderer filePath={item?.file_url || ""} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        {actions?.length > 0 &&
          (data?.status === "Pending" || data?.status === "Open") && (
            <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length &&
                  actions?.map((action: string) => {
                    const isLoading =
                      currentAction === action && mutation.isPending;
                    return (
                      <Button
                        key={action}
                        variant="soft"
                        fullWidth
                        disabled={isLoading}
                        onClick={() => {
                          handleAction(action);
                        }}
                        size="md"
                        bgColor={getActionStyles(action).bg}
                      >
                        {isLoading ? (
                          <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          action
                        )}
                      </Button>
                    );
                  })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
