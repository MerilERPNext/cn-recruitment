import { X } from "lucide-react";
import Badge from "../../shared/Badge";
import {
  MyPlannedAttendanceRequest,
  OvertimeDetail,
} from "../../../types/attendance";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import FileRenderer from "../../shared/molecules/FileRenderer";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import { getActionStyles } from "../../../utils/actionButtonStyles";

export function MyOvertimeDetails({
  documentName,
  data: propData,
  onClose,
  onAction,
  label = "Planned Overtime Request",
}: {
  documentName?: string;
  data?: MyPlannedAttendanceRequest;
  onClose: () => void;
  label?: string;
  onAction?: () => void;
  loadingAction?: { id: string; action: string } | null;
}) {
  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName || "");

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { setRefetchAttendance } = useGlobalStore();
  const mutation = useApprovalListActions();
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const data = (
    documentName ? fetchedData : propData
  ) as MyPlannedAttendanceRequest;
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
          setRefetchAttendance(true);
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

  const getStatus = (status: string) => {
    if (status === "Open") {
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

  const status = getStatus(data?.reference_document?.status);
  const doc = data?.reference_document;

  // Loading state
  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  // Error state
  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  return data?.allocated_to ? (
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
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Allocated To + Status */}
          <div className="flex gap-2 justify-between">
            <div className="flex flex-col gap-1">
              <Typography
                variant="bodySmall"
                color="body2"
                className="card-title"
              >
                Allocated To
              </Typography>
              <Typography variant="bodyMedium" className="card-subtitle">
                {data?.username} ({data.allocated_to})
              </Typography>
            </div>
            <div>
              <Badge
                label={status.label}
                backgroundColor={status.statusColor}
              />
            </div>
          </div>

          {/* Created On */}
          <div className="flex flex-col gap-1">
            <Typography
              variant="bodySmall"
              color="body2"
              className="card-title"
            >
              Created On
            </Typography>
            <Typography variant="bodyMedium" className="card-subtitle">
{formatToIndianDate(doc?.creation)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1">
            <Typography
              variant="bodySmall"
              color="body2"
              className="card-title"
            >
              Due Date
            </Typography>
            <Typography variant="bodyMedium" className="card-subtitle">
              {formatToIndianDate((data?.due_date || data?.date) as string)}
            </Typography>
          </div>

          {/* Overtime Details */}
          {doc?.overtime_details?.length > 0 && (
            <div>
              <Typography
                variant="bodyMedium"
                className="base-title mb-1 block font-semibold"
              >
                Overtime Details
              </Typography>
              <div className="grid grid-cols-1 gap-4 ">
                {doc.overtime_details.map(
                  (item: OvertimeDetail, idx: number) => (
                    <div
                      key={item.name || idx}
                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                    >
                      <div className="mb-3">
                        <Typography variant="label" className="card-title">
                          Overtime Entry {idx + 1}
                        </Typography>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600">
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="bodySmall"
                            color="body2"
                            className="card-title"
                          >
                            Start Date
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="card-subtitle"
                          >
                            {formatToIndianDate(item.start_date)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="bodySmall"
                            color="body2"
                            className="card-title"
                          >
                            Start Time
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="card-subtitle"
                          >
                            {item.start_time}
                          </Typography>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="bodySmall"
                            color="body2"
                            className="card-title"
                          >
                            End Date
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="card-subtitle"
                          >
                            {formatToIndianDate(item.end_date)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="bodySmall"
                            color="body2"
                            className="card-title"
                          >
                            End Time
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="card-subtitle"
                          >
                            {item.end_time}
                          </Typography>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="bodySmall"
                            color="body2"
                            className="card-title"
                          >
                            Shift Date
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="card-subtitle"
                          >
                            {formatToIndianDate(item.shift_date)}
                          </Typography>
                        </div>

                        {item.message && (
                          <div className="flex flex-col gap-1">
                            <Typography
                              variant="bodySmall"
                              color="body2"
                              className="card-title"
                            >
                              Message
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="card-subtitle"
                            >
                              {item.message}
                            </Typography>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
              {data?.attachments && data?.attachments?.length > 0 ? (
                <div className="py-4">
                  <Typography
                    variant="bodySmall"
                    className="mb-2 font-bold block"
                  >
                    Attachment
                  </Typography>
                  {data?.attachments?.map((item) => (
                    <FileRenderer filePath={item?.file_url || ""} />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {/* Actions */}
        {actions?.length > 0 &&
          data?.status === "Open" &&
          data?.allocated_to === currentEmployee?.user_id && (
            <div className=" w-full bg-white border-t shadow-md p-4 z-20">
              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {actions?.length &&
                  actions?.map((action: string) => {
                    const actionStyle = getActionStyles(action);
                    const isLoading =
                      currentAction === action && mutation.isPending;
                    return (
                      <Button
                        key={action}
                        disabled={isLoading}
                        onClick={() => {
                          handleAction(action);
                        }}
                        size="md"
                        bgColor={actionStyle.bgColor}
                        variant={actionStyle.variant}
                        className="w-full"
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
