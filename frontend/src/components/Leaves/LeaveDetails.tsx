import DOMPurify from "dompurify";
import { X } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useGetToDoWithReferenceDoc } from "../../hooks/useAttendance";
import { useCreateApprovalComment } from "../../hooks/useCreateApprovalComment";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import {
  useIsRejectionReasonMandatory,
} from "../../hooks/useLeaves";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  ErrorView,
  LoadingView,
} from "../shared/DetailViewErrorLoadingWrapper";
import Button from "../shared/atoms/Button";
import TeamApprovalActionPill from "../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import { AttachmentCard } from "../shared/molecules/AttachmentCard";
import ActionReasonModal from "../shared/ActionReasonModal";
import MobileAllocatedTo from "../shared/MobileAllocatedTo";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import type { MyLeaveRequestType } from "../../types/leaves";
import type { allocatedToType } from "../../types/allocatedToTooltip";

type LeaveAttachment = {
  file_url: string;
};

const hasValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== "";
};

const normalizeAllocatedUsers = (value: unknown): allocatedToType[] => {
  const values = Array.isArray(value) ? value : [value];

  return values.flatMap((item): allocatedToType[] => {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) return [];

      if (trimmed.startsWith("[")) {
        try {
          return normalizeAllocatedUsers(JSON.parse(trimmed) as unknown);
        } catch {
          // Treat malformed JSON as a plain user value.
        }
      }

      return [{ name: trimmed, designation_name: null, employee: null }];
    }

    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!name) return [];

      return [{
        name,
        designation_name:
          typeof record.designation_name === "string"
            ? record.designation_name
            : null,
        employee: typeof record.employee === "string" ? record.employee : null,
      }];
    }

    return [];
  });
};

export function LeaveDetailView({
  actionsEnabled,
  documentName,
  referenceName,
  data: propsData,
  onClose,
  onAction,
  label = "Leave Request",
  reasonName,
  sendBackComment,
  customActions,
}: {
  actionsEnabled?: boolean;
  documentName?: string;
  referenceName?: string;
  data?: MyLeaveRequestType;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
  reasonName?: string;
  sendBackComment?: string;
  customActions?: ReactNode;
}) {
  const mutation = useApprovalListActions();
  const approvalCommentMutation = useCreateApprovalComment();
  const { data: user } = useCurrentUser();
  const { data: rejectionMandatoryData } = useIsRejectionReasonMandatory();
  const { setRefetchAttendance } = useGlobalStore();

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName, referenceName);

  const data = documentName || referenceName ? fetchedData : propsData;
  console.log(data);
  const { isDesktop } = useScreenSize();

  const cleanDescription = DOMPurify.sanitize(
    data?.reference_document?.description || "",
  );
  const leaveReason =
    reasonName ||
    data?.reference_document?.reason_name ||
    data?.reference_document?.custom_reason ||
    data?.reference_document?.reason;
  const leaveType =
    data?.reference_document?.custom_leave_type_name ||
    data?.reference_document?.leave_type;
  const assignedUsers = normalizeAllocatedUsers(data?.allocated_to);
  const displayStatus =
    data?.custom_allow_revoke &&
    data?.reference_document?.docstatus === 2 &&
    data?.todo_status?.toLowerCase() === "cancelled"
      ? "Revoked"
      : data?.reference_document?.status;
  const hasAssignedTo = [
    assignedUsers,
    data?.username,
    data?.role,
    data?.allocated_roles,
    data?.role_assigned_users,
  ].some(hasValue);
  const sendbackCommentValue = sendBackComment || data?.send_back_comment;

  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [isActed, setIsActed] = useState(false);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: string) => {
      if (["approve", "reject"].includes(action.toLowerCase())) {
        const isMandatory = rejectionMandatoryData ?? true;
        if (action.toLowerCase() === "approve" || isMandatory) {
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
        const responseWithSession = response as unknown as {
          session?: string;
        };

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
        setIsActed(true);
        document.dispatchEvent(
          new CustomEvent("approval:acted", {
            detail: { id: data?.todo_id },
          }),
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

    [
      data,
      mutation,
      onAction,
      setRefetchAttendance,
      rejectionMandatoryData,
    ],
  );

  const handleSaveComment = async (reason: string | null) => {
    try {
      if (pendingAction) {
        if (reason !== null) {
          await approvalCommentMutation.mutateAsync({
            comment_type:
              pendingAction.toLowerCase() === "approve"
                ? "Submitted"
                : "Cancelled",
            reference_doctype: "Leave Application",
            reference_name:
              data?.reference_document?.name || data?.reference_name || "",
            comment_email: user?.name || "",
            comment_by: user?.name || "",
            content: reason,
            subject: pendingAction.toLowerCase() === "approve" ? "Request Approved" : "Request Rejected",
          });
        }

        setShowCommentModal(false);
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

  if (isLoading && (documentName || referenceName)) {
    return <LoadingView onClose={onClose} label={label} />;
  }
  if (error && (documentName || referenceName)) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  return data?.todo_id || data?.name || data?.reference_document?.name ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight"
          >
            {label}: {data?.reference_document?.name}
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
          {/* Status */}
          <div className="flex justify-end p-1">
            <div>
              <AllocatedToTooltip
                title="Assigned To"
                users={assignedUsers}
                allocated_to_user={data?.username}
                roles={data?.allocated_roles}
                role={data?.role}
                RoleAssignedUsers={data?.role_assigned_users}
                position="top"
              >
                <span>
                  <StatusBadge status={displayStatus} />
                </span>
              </AllocatedToTooltip>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              {hasValue(leaveType) && <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Leave Type
                </Typography>
                <Typography variant="mobileCardValue">
                  {leaveType}
                </Typography>
              </div>}
              {typeof data?.reference_document?.total_leave_days === "number" && <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Leave Days
                </Typography>
                <Typography variant="mobileCardValue">
                  {data?.reference_document?.total_leave_days > 1
                    ? `${data.reference_document.total_leave_days} Days`
                    : `${data?.reference_document?.total_leave_days ?? 0} Day`}
                </Typography>
              </div>}
            </div>
            <div className="flex justify-between w-full">
              {hasAssignedTo && <MobileAllocatedTo
                users={assignedUsers}
                allocated_to_user={data?.username}
                roles={data?.allocated_roles}
                role={data?.role}
                RoleAssignedUsers={data?.role_assigned_users}
                align="left"
                label="Assigned To"
              />}
              {hasValue(leaveReason) && <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Reason
                </Typography>
                <Typography variant="mobileCardValue">
                  {leaveReason}
                </Typography>
              </div>}
            </div>
            <div className="flex justify-between w-full">
              {hasValue(data?.reference_document?.from_date) && hasValue(data?.reference_document?.to_date) && <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Duration
                </Typography>
                <Typography variant="mobileCardValue">
                  {`${formatToIndianDate(data?.reference_document?.from_date)} to ${formatToIndianDate(data?.reference_document?.to_date)}`}
                </Typography>
              </div>}
              {hasValue(data?.reference_document?.posting_date) && <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Posting Date
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.posting_date)}
                </Typography>
              </div>}
            </div>
            <div className="flex justify-between w-full">
              {hasValue(data?.reference_document?.creation) && <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Initiation Date
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(data?.reference_document?.creation)}
                </Typography>
              </div>}
              {data?.reference_document?.custom_optional_holiday && (
                <div className="flex flex-col gap-2 text-right">
                  <Typography variant="mobileCardLabel" className="block">
                    Holiday Name
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {data?.reference_document?.custom_optional_holiday}
                  </Typography>
                </div>
              )}
            </div>
            {hasValue(cleanDescription) && <div className="flex flex-col gap-2">
              <Typography variant="mobileCardLabel">Description</Typography>
              <Typography variant="mobileCardValue">
                {cleanDescription}
              </Typography>
            </div>}
            {data?.reference_document?.status === "Rejected" &&
              data?.reference_document?.custom_rejection_reason && (
                <div className="flex flex-col gap-2">
                  <Typography variant="mobileCardLabel">
                    Reject Reason
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-red-500 text-sm whitespace-normal"
                  >
                    {data?.reference_document?.custom_rejection_reason}
                  </Typography>
                </div>
              )}
            {hasValue(sendbackCommentValue) && <div className="flex flex-col gap-2">
              <Typography variant="mobileCardLabel">
                Sendback Comment
              </Typography>
              <Typography
                variant="mobileCardValue"
                className="text-gray-700 whitespace-pre-wrap"
              >
                {sendbackCommentValue}
              </Typography>
            </div>}
          </div>

          {data?.attachments && data?.attachments?.length > 0 ? (
            <div className="py-4">
              <Typography variant="bodySmall" className="mb-2 font-bold block">
                Attachment
              </Typography>

              <div className="space-y-2">
                {data.attachments.map((item: LeaveAttachment) => (
                  <AttachmentCard key={item.file_url} fileUrl={item.file_url} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {customActions ? (
          <div className="w-full bg-white border-t shadow-md p-4 z-20">
            {customActions}
          </div>
        ) : actionsEnabled &&
          actions?.length > 0 &&
          data?.status === "Open" &&
          !isActed ? (
          <div className="w-full bg-white border-t shadow-md p-4 z-20">
            <TeamApprovalActionPill
              actionsEnabled={actionsEnabled}
              variant={isDesktop ? "modal" : "buttons"}
              actions={actions}
              status={data?.status}
              recordId={data?.todo_id}
              loadingAction={
                currentAction
                  ? { id: data?.todo_id, action: currentAction }
                  : null
              }
              onAction={(action) => handleAction(action)}
            />
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
        isPending={approvalCommentMutation.isPending}
        type={pendingAction?.toLowerCase() === "approve" ? "approval" : "rejection"}
        title="Comment Required"
        description={`Please add a comment before ${pendingAction?.toLowerCase() === "approve" ? "approving" : "rejecting"} this leave request.`}
        label={`${pendingAction?.toLowerCase() === "approve" ? "APPROVAL" : "REJECTION"} COMMENT *`}
        placeholder={`Enter your ${pendingAction?.toLowerCase() === "approve" ? "approval" : "rejection"} comment...`}
        todo_id={data?.todo_id}
        onCancel={handleCancelComment}
        onSave={handleSaveComment}
      />
    </div>
  ) : null;
}
