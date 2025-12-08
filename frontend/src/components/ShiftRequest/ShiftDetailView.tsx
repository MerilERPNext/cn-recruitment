import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import DOMPurify from "dompurify";
import Badge from "../shared/Badge";
import Button from "../shared/atoms/Button";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import FileRenderer from "../shared/molecules/FileRenderer";
import { formatDate } from "../../utils/qrCodeUtils";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";

export function ShiftDetailView({
  data: propData,
  documentName,
  onClose,
  onAction,
  label = "Shift Request",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  documentName: string;
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

  const data = documentName ? fetchedData : propData;
  const shouldRender = !!documentName || !!data?.todo_id;

  const cleanDescription = DOMPurify.sanitize(data?.description || "");

  const getStatus = (status: string) => {
    if (status === "Draft") {
      return {
        label: "Draft",
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

  // Loading state
  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  // Error state
  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

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
            <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
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
          <div className="py-2">
            <Badge
              label={status?.label as string}
              backgroundColor={status?.statusColor}
            />{" "}
          </div>
          <div className="py-2">
            <div className="flex gap-2 justify-between">
              {/* Display Employee Name */}
              {data?.reference_document?.employee_name && (
                <p className=" flex flex-col gap-1">
                  <span className="card-title">Employee Name</span>
                  <span className="card-subtitle">
                    {data?.reference_document?.employee_name}
                  </span>
                </p>
              )}
              {/* Display From Date */}
              {data?.reference_document?.from_date && (
                <p className=" flex flex-col gap-1">
                  <span className="card-title">From Date</span>
                  <span className="card-subtitle">
                    {formatDate(data?.reference_document?.from_date)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="py-2">
            <div className="flex gap-2 justify-between">
              {/* Display Shift Type */}
              {data?.reference_document?.shift_type && (
                <p className=" flex flex-col gap-1">
                  <span className="card-title">Shift Type</span>
                  <span className="card-subtitle">
                    {data?.reference_document?.shift_type}
                  </span>
                </p>
              )}

              {/* Display To Date */}
              {data?.reference_document?.to_date && (
                <p className=" flex flex-col gap-1">
                  <span className="card-title">To Date</span>
                  <span className="card-subtitle">
                    {formatDate(data?.reference_document?.to_date)}
                  </span>
                </p>
              )}
            </div>
          </div>
          {/* explanation */}
          <div className="py-2 flex flex-col gap-1">
            <p className="card-title">Description</p>
            <div className="text-sm bg-gray-100 p-3 rounded-lg">
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
        {actions?.length > 0 && data?.status === "Draft" && (
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
  );
}
