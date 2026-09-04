import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import Modal from "../../../../shared/Modal";
import { Typography } from "../../../../shared/atoms/Typography";

export interface GoalReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmText?: string;
  loadingText?: string;
  confirmBgColor?: "primary" | "error" | "success" | "text" | "warning";
  isLoading?: boolean;
  required?: boolean;
}

export const GoalReasonModal: React.FC<GoalReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = "Enter reason...",
  confirmText = "Confirm",
  loadingText,
  confirmBgColor = "primary",
  isLoading = false,
  required = true,
}) => {
  const [reasonNote, setReasonNote] = useState("");
  const [hasError, setHasError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReasonNote("");
      setHasError(false);
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmed = reasonNote.trim();
    if (required && !trimmed) {
      setHasError(true);
      toast.error("Reason/Note is required");
      return;
    }
    onConfirm(trimmed);
  };

  if (!isOpen) return null;

  const isConfirmDisabled = isLoading || (required && !reasonNote.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-5 space-y-4 bg-card text-text-title">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <Typography variant="h4" className="font-bold">
            {title}
          </Typography>
          <button
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading}
            className="text-text-body2 hover:text-text-title p-1 border border-border rounded-lg disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {description && (
          <Typography variant="caption" color="body2" className="block">
            {description}
          </Typography>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Typography variant="caption" color="body2" className="font-semibold">
              Reason / Note {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
            </Typography>
          </div>
          <textarea
            ref={textareaRef}
            aria-label="Enter reason note"
            value={reasonNote}
            disabled={isLoading}
            onChange={(e) => {
              setReasonNote(e.target.value);
              if (e.target.value.trim()) setHasError(false);
            }}
            placeholder={placeholder}
            rows={3}
            className={`w-full border ${
              hasError ? "border-red-500 ring-1 ring-red-500" : "border-border bg-card text-text-title placeholder-text-body2 focus:border-primary focus:ring-1 focus:ring-primary"
            } rounded-xl p-3 text-sm focus:outline-none shadow-sm resize-none disabled:opacity-50`}
          />
          {hasError && (
            <span className="text-xs text-red-500 font-medium block mt-1">
              Reason/Note is required.
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onClose}
            className="px-4"
          >
            Cancel
          </Button>
          <Button
            variant="contain"
            bgColor={confirmBgColor}
            size="sm"
            disabled={isConfirmDisabled}
            onClick={handleSubmit}
            className="px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? loadingText || `${confirmText}...` : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GoalReasonModal;
