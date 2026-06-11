import React, { useState } from "react";
import Button, { ButtonVariant } from "../shared/atoms/Button";
import { RotateCcw } from "lucide-react";
import { FrappeAPI } from "../../utils/frappeAPI";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import toast from "react-hot-toast";

interface RetriggerButtonProps {
  retriggerDefinitionName: string;
  retriggerFunnel: string;
  retriggerEmployee: string;
  employeeName?: string;
  showRetriggerForText?: boolean;
  className?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  bgColor?: string;
  variant?: ButtonVariant;
}

const RetriggerButton: React.FC<RetriggerButtonProps> = ({
  retriggerDefinitionName,
  retriggerFunnel,
  retriggerEmployee,
  employeeName,
  showRetriggerForText = false,
  className = "",
  fullWidth = false,
  size = "md",
  bgColor = "blue-600",
  variant = "contain",
}) => {
  const [isRetriggering, setIsRetriggering] = useState(false);

  const handleRetrigger = async () => {
    if (!retriggerDefinitionName) return;
    setIsRetriggering(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await FrappeAPI.callMethod(
        "nextai.funnel.doctype.funnel_task.triggers.chatnext_assistant_trigger.trigger",
        {
          definition_name: retriggerDefinitionName,
          variables: { docname: retriggerEmployee, funnel: retriggerFunnel },
        },
      );
      const session = res?.session;
      if (session) {
        const maxAttempts = 30; // 3 seconds max
        let attempts = 0;
        const checkAndTrigger = () => {
          if (typeof window !== "undefined" && typeof window.trigger_chatnext_assistant === "function") {
            window.trigger_chatnext_assistant(true, session);
            setIsRetriggering(false);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkAndTrigger, 100);
          } else {
            toast.error("Chat assistant is not available. Please refresh the page.");
            setIsRetriggering(false);
          }
        };
        checkAndTrigger();
      } else {
        setIsRetriggering(false);
      }
    } catch (e) {
      const formatedError = errorResponseFormater(e, "Retrigger Failed");
      toast.error(formatedError);
      console.log("Flow Retrigger Error: ", e);
      setIsRetriggering(false);
    }
  };

  const buttonText = showRetriggerForText && employeeName
    ? `Retrigger for ${employeeName}`
    : "Retrigger Flow";

  return (
    <Button
      variant={variant}
      bgColor={bgColor}
      size={size}
      fullWidth={fullWidth}
      className={`hover:bg-blue-700 text-white flex items-center justify-center gap-2 ${className}`}
      onClick={handleRetrigger}
      disabled={isRetriggering}
    >
      <RotateCcw size={15} className={isRetriggering ? "animate-spin" : ""} />
      {isRetriggering ? "Retriggering..." : buttonText}
    </Button>
  );
};

export default RetriggerButton;
