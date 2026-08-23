import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import Button from "./atoms/Button";
import { useTodoTypeApprovalConfig } from "../../hooks/useTodo";
import { useAttendanceSettings } from "../../hooks/useAttendance";
import ActionConfirmationModal from "./ActionConfirmationModal";

type ActionReasonModalProps = {
  isOpen: boolean;
  isPending?: boolean;
  type?: "approval" | "rejection" | "act";
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  todo_id?: string;
  onCancel: () => void;
  onSave: (reason: string | null) => void;
  children?: React.ReactNode;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
};

const ActionReasonModal = ({
  isOpen,
  isPending = false,
  title = "Comment Required",
  description = "Please add a comment before rejecting this request.",
  label = "REJECTION REASON *",
  placeholder = "Enter rejection reason...",
  required = true,
  todo_id,
  onCancel,
  onSave,
  type,
  children,
  confirmTitle,
  confirmMessage,
  confirmButtonLabel,
  cancelButtonLabel,
}: ActionReasonModalProps) => {
  const [reason, setReason] = useState("");
  const isApproval = type === "approval";
  const isRejection = type === "rejection";

  const { data: config, isLoading: isConfigLoading } = useTodoTypeApprovalConfig(
    isOpen ? todo_id : undefined
  );
  const { data: attendanceSettings, isLoading: isSettingLoading } =
    useAttendanceSettings({
      enabled: isOpen && (isApproval || isRejection)
    });

  const enableApprovalConfirmModal = Boolean(
    attendanceSettings?.enable_approval_confirm_modal
  );
  const enableRejectionConfirmModal = Boolean(
    attendanceSettings?.enable_rejection_confirm_modal
  );

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const autoSubmitDone = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      autoSubmitDone.current = false;
    }
  }, [isOpen]);

  let minLength = required ? 15 : 0;
  let isActuallyRequired = isApproval ? false : required;

  if (todo_id && config) {
    if (isApproval) {
      isActuallyRequired = config.reason_required_for_approval;
    } else if (isRejection) {
      isActuallyRequired = config.reason_required_for_rejection;
    }

    if (
      config.reason_character_mandatory !== undefined &&
      config.reason_character_mandatory !== null
    ) {
      minLength = config.reason_character_mandatory;
    }
  } else {
    if (isActuallyRequired && minLength === 0) {
      minLength = 15;
    }
  }

  const showReasonModal = isActuallyRequired || Boolean(children);
  const shouldShowConfirmModal =
    !showReasonModal &&
    ((isApproval && Boolean(enableApprovalConfirmModal)) ||
      (isRejection && Boolean(enableRejectionConfirmModal)));

  const isReady =
    isOpen &&
    (!todo_id || (!isConfigLoading && config !== undefined)) &&
    !isSettingLoading;

  useEffect(() => {
    if (isReady && !autoSubmitDone.current) {
      if (!showReasonModal && !shouldShowConfirmModal) {
        autoSubmitDone.current = true;
        onSaveRef.current(null);
      }
    }
  }, [isReady, showReasonModal, shouldShowConfirmModal]);

  if (!isOpen) return null;

  if (
    (todo_id && isConfigLoading) ||
    ((isApproval || isRejection) && isSettingLoading)
  ) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
        <span className="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (shouldShowConfirmModal) {
    return (
      <ActionConfirmationModal
        isOpen={isOpen}
        isPending={isPending}
        title={
          confirmTitle ||
          (isApproval
            ? "Confirm Approval"
            : isRejection
              ? "Confirm Rejection"
              : "Confirm Action")
        }
        message={
          confirmMessage ||
          (isApproval
            ? "Are you sure you want to approve this request?"
            : isRejection
              ? "Are you sure you want to reject this request?"
              : "Are you sure you want to perform this action?")
        }
        confirmLabel={
          confirmButtonLabel ||
          (isApproval ? "Approve" : isRejection ? "Reject" : "Confirm")
        }
        confirmBgColor={isApproval ? "primary" : isRejection ? "error" : "primary"}
        cancelLabel={cancelButtonLabel || "Cancel"}
        onConfirm={() => onSave(null)}
        onCancel={onCancel}
      />
    );
  }

  if (!showReasonModal) {
    return null;
  }


  const displayMinLength =
    isActuallyRequired && minLength === 0 ? 1 : minLength;

  const isValid = isActuallyRequired
    ? reason.trim().length >= displayMinLength
    : true;

  const handleSave = () => {
    if (isActuallyRequired && !isValid) {
      toast.error(
        `Please enter a comment of at least ${displayMinLength} characters`
      );
      return;
    }
    onSave(isActuallyRequired ? reason : null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>

        {isActuallyRequired && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase mb-1 block">
              {label}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              autoFocus
            />
            <div
              className={`text-xs mt-1 text-right ${reason.trim().length >= displayMinLength
                  ? "text-green-600"
                  : "text-gray-500"
                }`}
            >
              {reason.trim().length}/{displayMinLength} characters minimum
            </div>
          </div>
        )}

        {children && (
          <div className={isActuallyRequired ? "" : "mb-4"}>{children}</div>
        )}

        <div className="flex gap-3 justify-end">
          <Button onClick={onCancel} size="sm" bgColor="disabled">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            bgColor="primary"
            disabled={!isValid || isPending || isConfigLoading}
          >
            {isPending ? (
              <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionReasonModal;

