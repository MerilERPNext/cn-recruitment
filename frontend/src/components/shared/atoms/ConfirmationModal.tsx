import { X } from "lucide-react";
import Button from "./Button";

interface ConfirmationModalProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModal = ({
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) => {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="subtle" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant="soft"
            size="sm"
            bgColor="error"
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
