import React from "react";
import Button, { ButtonColor } from "./atoms/Button";

export interface ActionConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmBgColor?: ButtonColor;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  title = "Confirm Approval",
  message = "Are you sure you want to approve this request?",
  confirmLabel = "Approve",
  cancelLabel = "Cancel",
  confirmBgColor = "primary",
  isPending = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            size="sm"
            bgColor="disabled"
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            bgColor={confirmBgColor}
            disabled={isPending}
            loading={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionConfirmationModal;

