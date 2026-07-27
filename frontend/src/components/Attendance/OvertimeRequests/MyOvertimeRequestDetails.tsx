import { X } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import {
  useGetToDoWithReferenceDoc,
  useUpdateOvertimeRejectionReason,
} from "../../../hooks/useAttendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import {
  MyPlannedAttendanceRequest,
  OvertimeDetail,
} from "../../../types/attendance";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import ActionReasonModal from "../../shared/ActionReasonModal";
import Button from "../../shared/atoms/Button";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { AttachmentCard } from "../../shared/molecules/AttachmentCard";

import WrapperHoverCard from "../../shared/WrapperHoverCard";

export function MyOvertimeDetails({
  actionsEnabled = false,
  documentName,
  referenceName,
  data: propData,
  onClose,
  onAction,
  label = "Overtime Request",
  type = "my",
}: {
  actionsEnabled?: boolean;
  documentName?: string;
  referenceName?: string;
  data?: MyPlannedAttendanceRequest;
  onClose: () => void;
  label?: string;
  onAction?: () => void;
  loadingAction?: { id: string; action: string } | null;
  type?: "my" | "team";
}) {
  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName || "", referenceName || "");

  const { setRefetchAttendance } = useGlobalStore();
  const mutation = useApprovalListActions();
  const updateRejectionReasonMutation = useUpdateOvertimeRejectionReason();
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [isActed, setIsActed] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const data = (
    documentName || referenceName ? fetchedData : propData
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
          setRefetchAttendance(true);
        }
        setIsActed(true);
        document.dispatchEvent(
          new CustomEvent("approval:acted", { detail: { id: data?.todo_id } }),
        );
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

  const handleActionClick = (action: string) => {
    if (action.toLowerCase() === "reject") {
      setPendingAction(action);
      setShowCommentModal(true);
      return;
    }
    handleAction(action);
  };

  const handleSaveComment = async (reason: string) => {
    try {
      await updateRejectionReasonMutation.mutateAsync({
        id: data?.reference_document?.name || "",
        reason,
      });
      setShowCommentModal(false);
      if (pendingAction) {
        handleAction(pendingAction);
        setPendingAction(null);
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

  const doc = data?.reference_document;

  // Loading state
  if (isLoading && (documentName || referenceName)) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  // Error state
  if (error && (documentName || referenceName)) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }
  console.log(data.allocated_to, typeof data.allocated_to);
  return data?.todo_id ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
                <Typography variant="mobileCardLabel">
                  {data?.reference_document?.employee_name
                    ? "Employee Name"
                    : "Employee ID"}
                </Typography>

                <Typography
                  variant="mobileCardValue"
                  className="hover:text-primary cursor-pointer"
                >
                  <WrapperHoverCard
                    employeeId={data?.reference_document?.employee}
                  >
                    {data?.reference_document?.employee_name ||
                      data?.reference_document?.employee}
                  </WrapperHoverCard>
                </Typography>
              </div>
            </div>
            <div>
              <StatusBadge
                status={
                  data?.todo_status === "Closed" &&
                    data?.reference_document?.status !== "Rejected"
                    ? "Approved"
                    : data?.reference_document?.status
                }
              />
            </div>
          </div>

          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Created On
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(doc?.creation)}
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
                {data?.description}
              </Typography>
            </div>
          </div>

          {/* Overtime Details */}
          {doc?.overtime_details?.length > 0 && (
            <div>
              <Typography
                variant="bodySmall"
                className="base-title mb-1 font-bold block"
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

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Start Date
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatToIndianDate(item.start_date)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Start Time
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {item.start_time}
                          </Typography>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            End Date
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatToIndianDate(item.end_date)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            End Time
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {item.end_time}
                          </Typography>
                        </div>

                        {item.message && (
                          <div className="flex flex-col gap-1">
                            <Typography
                              variant="mobileCardLabel"
                              className="block"
                            >
                              Message
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {item.message}
                            </Typography>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Attachments */}
          {data?.attachments && data?.attachments?.length > 0 && (
            <div>
              <Typography variant="bodySmall" className="mb-2 font-bold block">
                Attachments
              </Typography>
              <div className="space-y-2">
                {data.attachments.map((item) => (
                  <AttachmentCard key={item.file_url} fileUrl={item.file_url} />
                ))}
              </div>
            </div>
          )}
        </div>
        {actions?.length > 0 &&
          data?.reference_document?.status === "Open" &&
          !isActed ? (
          <div className="w-full bg-white border-t shadow-md p-4 z-20">
            {typeof data?.allocated_to === "string" && type !== "my" && (
              <TeamApprovalActionPill
                actionsEnabled={actionsEnabled}
                variant="modal"
                actions={actions}
                status={data?.reference_document?.status}
                recordId={data?.todo_id}
                loadingAction={
                  currentAction
                    ? { id: data?.todo_id, action: currentAction }
                    : null
                }
                onAction={(action) => handleActionClick(action)}
              />
            )}
          </div>
        ) : (
          <div className="w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex items-center justify-center">
              <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                Action Taken
              </div>
            </div>
          </div>
        )}
      </div>
      <ActionReasonModal
        isOpen={showCommentModal}
        isPending={updateRejectionReasonMutation.isPending}
        type={pendingAction?.toLowerCase() === "approve" ? "approval" : "rejection"}
        description="Please add a comment before rejecting this overtime request."
        todo_id={data?.todo_id}
        onCancel={handleCancelComment}
        onSave={handleSaveComment}
      />
    </div>
  ) : null;
}
