import DOMPurify from "dompurify";
import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { getActionStyles } from "../../utils/actionButtonStyles";
import formatToIndianDate from "../../utils/formatToIndianDate";
import Button from "../shared/atoms/Button";
import StatusBadge from "../shared/atoms/statusBadge";
import { Typography } from "../shared/atoms/Typography";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";
import { AttachmentCard } from "../shared/molecules/AttachmentCard";

export function ShiftDetailView({
  data: propData,
  documentName,
  referenceName,
  onClose,
  onAction,
  label = "Team Shift Request",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  documentName: string;
  referenceName?: string;
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
  } = useGetToDoWithReferenceDoc(documentName || "", referenceName);

  const data = documentName ? fetchedData : propData;
  const shouldRender = !!documentName || !!data?.todo_id;

  const cleanDescription = DOMPurify.sanitize(data?.description || "");

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
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography variant="h4" className="font-semibold text-gray-800">
            {label}
          </Typography>

          <Button
            variant="subtle"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 md:pb-6">
          {/* Employee + Status */}
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

          {/* Dates + Shift Info */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Shift Type</Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.shift_type || "--"}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">From Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.from_date)}
                </Typography>
              </div>
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">To Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.to_date)}
                </Typography>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <Typography variant="mobileCardLabel">Due Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.due_date || data?.date)}
                </Typography>
              </div>
            </div>
          </div>

          {/* Description */}
          {cleanDescription && (
            <div className="flex flex-col gap-2">
              <Typography variant="mobileCardLabel">Description</Typography>
              <div
                className="text-sm sm:text-base font-brand font-normal text-gray-900"
                dangerouslySetInnerHTML={{ __html: cleanDescription }}
              />
            </div>
          )}

          {/* Attachment */}
          {data?.reference_document?.custom_attachment && (
            <div className="flex flex-col gap-2">
              <Typography variant="mobileCardLabel">Attachment</Typography>

              <AttachmentCard
                fileUrl={data?.reference_document?.custom_attachment}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        {actions?.length > 0 && data?.status === "Draft" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex gap-2">
              {actions.map((action: string) => {
                const actionStyle = getActionStyles(action);
                const isLoading =
                  currentAction === action && mutation.isPending;

                return (
                  <Button
                    key={action}
                    fullWidth
                    size="md"
                    variant="soft"
                    bgColor={actionStyle.bgColor}
                    disabled={isLoading}
                    onClick={() => handleAction(action)}
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
