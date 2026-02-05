import React, { useState, ReactNode, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "tl" | "tr";
  className?: string;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case "right":
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + scrollX + 8;
        break;
      case "tl":
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX;
        break;
      case "tr":
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.right + scrollX - tooltipRect.width;
        break;
      default:
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      // Recalculate on scroll and resize
      window.addEventListener("scroll", calculatePosition, true);
      window.addEventListener("resize", calculatePosition);

      return () => {
        window.removeEventListener("scroll", calculatePosition, true);
        window.removeEventListener("resize", calculatePosition);
      };
    }
  }, [isVisible, position]);

  const showTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const getArrowClasses = () => {
    switch (position) {
      case "top":
        return "top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-gray-900";
      case "bottom":
        return "bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-gray-900";
      case "left":
        return "left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-gray-900";
      case "right":
        return "right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-gray-900";
      case "tl":
        return "top-full left-[15%] transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-gray-900";
      case "tr":
        return "top-full right-[5%] transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-gray-900";
      default:
        return "top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-gray-900";
    }
  };

  const tooltipContent = isVisible && content && (
    <div
      ref={tooltipRef}
      className={`fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal break-words text-center max-w-xs ${className}`}
      role="tooltip"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
      }}
    >
      {content}
      <div
        className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
        style={{ borderWidth: "4px" }}
      />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {isVisible && content && createPortal(tooltipContent, document.body)}
    </>
  );
};

export default Tooltip;
