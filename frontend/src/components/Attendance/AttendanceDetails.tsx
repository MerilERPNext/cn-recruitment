import DOMPurify from "dompurify";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import formatToIndianDate from "../../utils/formatToIndianDate";
import Button, { ButtonColor } from "../shared/atoms/Button";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";
import { AttachmentCard } from "../shared/molecules/AttachmentCard";

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
    data?.reference_document?.explanation || "",
  );

  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const loading = useLoadingOverlay();
  const handleAction = useCallback(
    async (action: string) => {
      await loading?.wrap(async () => {
        // ⬇️⬇️ EXISTING CODE (UNCHANGED) ⬇️⬇️

        setCurrentAction(action);

        try {
          if (mutation?.isPending) return;
          const response = await mutation?.mutateAsync({
            action,
            name: data?.todo_id || "",
          });

          console.log("Action response:", response);
          const responseWithSession = response as unknown as { session?: any };
          console.log("Session data:", responseWithSession?.session);
          console.log(
            "Assistant trigger enabled:",
            data?.custom_open_chatnext_assistant_on_action,
          );

          if (
            (data?.custom_approval_type === "Approval Matrix" &&
              responseWithSession?.session) ||
            (data?.custom_approval_type === "Multi Actions" &&
              data?.custom_open_chatnext_assistant_on_action)
          ) {
            console.log(
              "Opening assistant with session:",
              responseWithSession?.session,
            );
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
          const formattedError = errorResponseFormater(error);
          toast.error(formattedError);
          console.error("Action failed", error);
        }

        // ⬆️⬆️ EXISTING CODE (UNCHANGED) ⬆️⬆️
      }, "Processing action...");
    },

    [
      data?.custom_approval_type,
      data?.custom_open_chatnext_assistant_on_action,
      data?.todo_id,
      onAction,
      loading,
      mutation,
      setRefetchAttendance,
    ],
  );

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const getActionStyles = (
    action: string,
  ): { bg: ButtonColor; text: string } => {
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
            <Typography variant="h4" className="font-semibold text-gray-800">
              {label}
            </Typography>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 md:pb-6">
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">
                {data?.reference_document?.employee_name
                  ? "Employee Name"
                  : "Employee ID"}
              </Typography>

              <Typography variant="mobileCardValue">
                {data?.reference_document?.employee_name ||
                  data?.reference_document?.employee}
              </Typography>
            </div>

            <StatusBadge status={data?.status} />
          </div>

          {/* Dates Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Allocated To
                </Typography>
                <Typography variant="mobileCardValue">
                  {data.allocated_to_name}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Allocated To Email
                </Typography>
                <Typography variant="mobileCardValue">
                  {data.allocated_to}
                </Typography>
              </div>
            </div>
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">From Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.from_date)}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">To Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.to_date)}
                </Typography>
              </div>
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Due Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.due_date || data?.date)}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Reason</Typography>
                <Typography variant="mobileCardValue">
                  {label === "Leave Application"
                    ? data?.reference_document?.custom_reason
                    : data?.reference_document?.reason}
                </Typography>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="flex flex-col gap-2">
            <Typography variant="mobileCardLabel">Explanation</Typography>

            <Typography variant="mobileCardValue">
              {cleanExplaination}
            </Typography>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Typography variant="mobileCardLabel">Description</Typography>

            <Typography variant="mobileCardValue">
              {cleanDescription}
            </Typography>
          </div>

          {/* Attachments */}
          {data?.attachments?.length > 0 && (
            <div className="flex flex-col gap-2">
              <Typography variant="mobileCardLabel">Attachments</Typography>

              <div className="space-y-2">
                {data.attachments.map((item: any) => (
                  <AttachmentCard key={item.file_url} fileUrl={item.file_url} />
                ))}
              </div>
            </div>
          )}
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
