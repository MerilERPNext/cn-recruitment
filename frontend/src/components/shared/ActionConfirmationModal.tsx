import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
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

const getIconConfig = (color: ButtonColor) => {
  switch (color) {
    case "error":
      return {
        icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
        bg: "bg-red-50",
        border: "border-red-100",
        ring: "ring-red-100",
      };
    case "warning":
      return {
        icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
        bg: "bg-amber-50",
        border: "border-amber-100",
        ring: "ring-amber-100",
      };
    case "success":
      return {
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        ring: "ring-emerald-100",
      };
    default:
      return {
        icon: <Info className="w-6 h-6 text-primary" />,
        bg: "bg-primary-50",
        border: "border-primary-100",
        ring: "ring-primary-100",
      };
  }
};

const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmBgColor = "primary",
  isPending = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const iconConfig = getIconConfig(confirmBgColor);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />

        <div className="p-6">
          {/* Icon + Title row */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconConfig.bg} ring-4 ${iconConfig.ring} border ${iconConfig.border}`}
            >
              {iconConfig.icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-4" />

          {/* Actions */}
          <div className="flex gap-2.5 justify-end">
            <Button
              onClick={onCancel}
              size="sm"
              variant="outline"
              bgColor="text"
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
    </div>
  );
};

export default ActionConfirmationModal;
