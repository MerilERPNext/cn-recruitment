import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "./atoms/Button";

type RejectionReasonModalProps = {
  isOpen: boolean;
  isPending?: boolean;
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  onCancel: () => void;
  onSave: (reason: string) => void;
};

const RejectionReasonModal = ({
  isOpen,
  isPending = false,
  title = "Comment Required",
  description = "Please add a comment before rejecting this request.",
  label = "REJECTION REASON *",
  placeholder = "Enter rejection reason...",
  required = true,
  onCancel,
  onSave,
}: RejectionReasonModalProps) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen) return null;

  const isValid = required
    ? reason.trim().length >= 15
    : true;

  const handleSave = () => {
    if (!isValid) {
      toast.error("Please enter a comment of at least 15 characters");
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
          {(required || reason.trim().length > 0) && (
            <div className={`text-xs mt-1 text-right ${reason.trim().length >= 15 ? 'text-green-600' : 'text-gray-500'}`}>
              {reason.trim().length}/15 characters minimum
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <Button onClick={onCancel} size="sm" bgColor="disabled">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            bgColor="primary"
            disabled={!isValid || isPending}
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

export default RejectionReasonModal;
