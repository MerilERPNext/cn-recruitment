import { X } from "lucide-react";
import Badge from "../../shared/Badge";
import {
  MyPlannedAttendanceRequest,
  OvertimeDetail,
} from "../../../types/attendance";
import { format, isValid, parse } from "date-fns";
import Button from "../../shared/atoms/Button";
import { useCallback, useState } from "react";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import FileRenderer from "../../shared/molecules/FileRenderer";
import { formatDashedDate } from "../../../utils/formatToIndianDate";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";

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
  const getStatus = (status: string) => {
    if (status === "Open") {
      return {
        label: "Open",
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "--/--";
    const date = parse(dateString, "yyyy-MM-dd", new Date());
    return isValid(date) ? format(date, "dd/MM/yyyy") : "--/--";
  };

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
          <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Allocated To + Status */}
          <div className="flex gap-2 justify-between">
            <div className="flex flex-col gap-1">
              <div className="card-title">Allocated To</div>
              <div className="card-subtitle">
                {data?.username} ({data.allocated_to})
              </div>
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
            <div className="card-title">Created On</div>
            <div className="card-subtitle">
              {new Date(doc?.creation).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="card-title">Due Date</div>
            <div className="card-subtitle">
              {formatDashedDate((data?.due_date || data?.date) as string)}
            </div>
          </div>

          {/* Overtime Details */}
          {doc?.overtime_details?.length > 0 && (
            <div>
              <div className="base-title mb-1">Overtime Details</div>
              <div className="grid grid-cols-1 gap-4 ">
                {doc.overtime_details.map(
                  (item: OvertimeDetail, idx: number) => (
                    <div
                      key={item.name || idx}
                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                    >
                      <div className="mb-3">
                        <h4 className="card-title">Overtime Entry {idx + 1}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600">
                        <div className="flex flex-col gap-1">
                          <span className="card-title">Start Date</span>
                          <span className="card-subtitle">
                            {formatDate(item.start_date)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="card-title">Start Time</span>
                          <span className="card-subtitle">
                            {item.start_time}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="card-title">End Date</span>
                          <span className="card-subtitle">
                            {formatDate(item.end_date)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="card-title">End Time</span>
                          <span className="card-subtitle">{item.end_time}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="card-title">Shift Date</span>
                          <span className="card-subtitle">
                            {formatDate(item.shift_date)}
                          </span>
                        </div>

                        {item.message && (
                          <div className="flex flex-col gap-1">
                            <span className="card-title">Message</span>
                            <span className="card-subtitle">
                              {item.message}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
              {data?.attachments && data?.attachments?.length > 0 ? (
                <div className="py-4">
                  <p className="text-sm  mb-2 font-bold">Attachment</p>
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
                        bgColor={getActionStyles(action).bg}
                        textColor={getActionStyles(action).text}
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
