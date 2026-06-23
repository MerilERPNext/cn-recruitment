import React, { useState } from "react";
import Button, { ButtonVariant } from "../shared/atoms/Button";
import { RotateCcw, X } from "lucide-react";
import { useReinitiateFlow } from "../../hooks/useFlows";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import toast from "react-hot-toast";
import Modal from "../shared/Modal";
import { Typography } from "../shared/atoms/Typography";
import { useTargetUser } from "../../context/ViewedUserContext";

interface RetriggerButtonProps {
  funnelActivityId: string;
  employeeName?: string;
  showRetriggerForText?: boolean;
  className?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  bgColor?: string;
  variant?: ButtonVariant;
  flowName?: string;
}

const RetriggerButton: React.FC<RetriggerButtonProps> = ({
  funnelActivityId,
  employeeName,
  showRetriggerForText = false,
  className = "",
  fullWidth = false,
  size = "md",
  bgColor = "blue-600",
  variant = "contain",
  flowName = "Flow",
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const reinitiateFlowMutation = useReinitiateFlow();
  const { isViewingOtherUser } = useTargetUser();

  const handleRetrigger = () => {
    setShowConfirm(true);
  };

  const handleConfirmRetrigger = () => {
    reinitiateFlowMutation.mutate(
      { funnel_activity: funnelActivityId },
      {
        onSuccess: () => {
          toast.success(`${flowName} reinitiated successfully.`);
          setShowConfirm(false);
        },
        onError: (e) => {
          const formatedError = errorResponseFormater(e, `${flowName} Retrigger Failed`);
          toast.error(formatedError);
          setShowConfirm(false);
        },
      }
    );
  };

  const buttonText = showRetriggerForText && employeeName && isViewingOtherUser
    ? `Retrigger for ${employeeName}`
    : `Retrigger ${flowName}`;

  return (
    <>
      <Button
        variant={variant}
        bgColor={bgColor}
        size={size}
        fullWidth={fullWidth}
        className={`hover:bg-blue-700 text-white flex items-center justify-center gap-2 ${className}`}
        onClick={handleRetrigger}
        disabled={reinitiateFlowMutation.isPending}
      >
        <RotateCcw size={15} className={reinitiateFlowMutation.isPending ? "animate-spin" : ""} />
        {reinitiateFlowMutation.isPending ? "Retriggering..." : buttonText}
      </Button>
      <Modal
        isOpen={showConfirm}
        onClose={() => {
          if (!reinitiateFlowMutation.isPending) {
            setShowConfirm(false);
          }
        }}
        size="sm"
      >
        <div className="p-5 sm:p-6 flex flex-col items-start text-left relative">
          <button
            onClick={() => setShowConfirm(false)}
            disabled={reinitiateFlowMutation.isPending}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          
          <div className="w-12 h-12 bg-blue-50 border-[6px] border-blue-50/50 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <RotateCcw className="w-5 h-5 text-blue-600" />
          </div>
          
          <Typography variant="h4" className="mb-2 text-gray-900 font-semibold">
            Retrigger {flowName}
          </Typography>
          
          <Typography variant="bodyMedium" color="body2" className="mb-6 leading-relaxed">
            Are you sure you want to retrigger the {flowName.toLowerCase()}
            {employeeName && isViewingOtherUser && (
              <>
                {" "}for <span className="font-medium text-gray-800">{employeeName}</span>
              </>
            )}
            ? This will discard the current progress and start over.
          </Typography>

          <div className="flex w-full gap-3 mt-2 sm:justify-end sm:w-auto sm:self-end">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setShowConfirm(false)}
              disabled={reinitiateFlowMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="contain"
              bgColor="blue-600"
              className="flex-1 sm:flex-none text-white hover:bg-blue-700 shadow-sm"
              onClick={handleConfirmRetrigger}
              loading={reinitiateFlowMutation.isPending}
              disabled={reinitiateFlowMutation.isPending}
            >
              Retrigger {flowName}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RetriggerButton;
