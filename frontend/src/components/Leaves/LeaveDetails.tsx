import { X } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import DOMPurify from "dompurify";
import Badge from "../shared/Badge";
import Button from "../shared/atoms/Button";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import FileRenderer from "../shared/molecules/FileRenderer";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";

export function LeaveDetailView({
  documentName,
  data : propsData,
  onClose,
  onAction,
  label = "Attendance Request",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documentName?: string;
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

  console.log("MyOvertimeDetails data:", data);
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

   if (isLoading && documentName) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onMouseDown={onClose}
      >
        <div
          className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading request details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

   // Error state
    if (error && documentName) {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onMouseDown={onClose}
        >
          <div
            className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg
                    className="h-12 w-12 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">Failed to load request details</p>
                <p className="text-gray-500 text-sm mt-2">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
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
            <h2 className="text-lg font-semibold text-gray-800">
              {label} 
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
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
          <div className="py-4">
            <div className="flex gap-2 justify-between">
              {/* Display From Date */}
              {data?.reference_document?.from_date && (
                <p className="text-sm flex flex-col font-bold">
                  <span>From Date</span>
                  <span className="text-gray-500">
                    {formatDate(data?.reference_document?.from_date)}
                  </span>
                </p>
              )}

              {/* Display To Date */}
              {data?.reference_document?.to_date && (
                <p className="text-sm flex flex-col font-bold">
                  <span>To Date</span>
                  <span className="text-gray-500">
                    {formatDate(data?.reference_document?.to_date)}
                  </span>
                </p>
              )}
            </div>
          </div>
          {data?.due_date && (
            <p className="text-sm flex flex-col font-bold">
              <span>Due Date</span>
              <span className="text-gray-500">
                {formatDate(data?.due_date)}
              </span>
            </p>
          )}
          <div className="py-4">
            <p className="text-sm  mb-2 font-bold">Reason</p>

            {data?.reference_document?.reason}
          </div>
          {/* explanation */}
          <div className="py-4">
            <p className="text-sm  mb-2 font-bold">Description</p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
            </div>
          </div>
          {data?.reference_document?.custom_attachment ? (
            <div className="py-4">
              <p className="text-sm  mb-2 font-bold">Attachment</p>
              <FileRenderer
                filePath={data?.reference_document?.custom_attachment || ""}
              />
            </div>
          ) : null}
        </div>

        {/* Actions */}
        {actions?.length > 0 && status?.label === "Pending" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
              {actions?.length &&
                actions?.map((action: string) => {
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
                      bgColor={getActionStyles(action).bg}
                      textColor={getActionStyles(action).text}
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
  ) : null;
}
