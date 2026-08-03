import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "./atoms/Button";
import { useTodoTypeApprovalConfig } from "../../hooks/useTodo";

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
  onSave: (reason: string) => void;
  children?: React.ReactNode;
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
  children
}: ActionReasonModalProps) => {
  const [reason, setReason] = useState("");
  const { data: config, isLoading: isConfigLoading } = useTodoTypeApprovalConfig(isOpen ? todo_id : undefined);

  useEffect(() => {
    if (!isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen) return null;

  let minLength = required ? 15 : 0;
  let isActuallyRequired = type === "approval" ? false : required;

  if (todo_id && config) {
    if (type === "approval") {
      isActuallyRequired = config.reason_required_for_approval;
    } else if (type === "rejection") {
      isActuallyRequired = config.reason_required_for_rejection;
    }
    
    if (config.reason_character_mandatory !== undefined && config.reason_character_mandatory !== null) {
      minLength = config.reason_character_mandatory;
    }
  } else {
     if (isActuallyRequired && minLength === 0) {
        minLength = 15;
     }
  }

  const displayMinLength = isActuallyRequired && minLength === 0 ? 1 : minLength;

  const isValid = isActuallyRequired
    ? reason.trim().length >= displayMinLength
    : true;

  const handleSave = () => {
    if (!isValid) {
      toast.error(`Please enter a comment of at least ${displayMinLength} characters`);
      return;
    }
    onSave(reason);
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
        <div className="mb-4">
          <label className="text-xs text-gray-500 uppercase mb-1 block">
            {isActuallyRequired ? label : label.replace(" *", "")}
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
          {isActuallyRequired && (
            <div className={`text-xs mt-1 text-right ${reason.trim().length >= displayMinLength ? 'text-green-600' : 'text-gray-500'}`}>
              {reason.trim().length}/{displayMinLength} characters minimum
            </div>
          )}
          {children}
        </div>
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
