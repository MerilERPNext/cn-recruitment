import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "tl" | "tr";
  className?: string;
  triggerClassName?: string;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
  triggerClassName = "",
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Position Calculation
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (position) {
      case "bottom":
        top = triggerRect.bottom + scrollY + 8;
        left =
          triggerRect.left +
          scrollX +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
        break;

      case "left":
        top =
          triggerRect.top +
          scrollY +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;

      case "right":
        top =
          triggerRect.top +
          scrollY +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
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

      case "top":
      default:
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left =
          triggerRect.left +
          scrollX +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
    }

    setCoords({ top, left });
  }, [position]);

  // ✅ Visibility effect
  useEffect(() => {
    if (!isVisible) return;

    requestAnimationFrame(() => {
      calculatePosition();
    });

    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);

    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const getArrowClasses = () => {
    switch (position) {
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-0";

      case "left":
        return "left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-0";

      case "right":
        return "right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-0";

      case "tl":
        return "top-full left-[15%] border-t-gray-900 border-l-transparent border-r-transparent";

      case "tr":
        return "top-full right-[10%] border-t-gray-900 border-l-transparent border-r-transparent";

      case "top":
      default:
        return "top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent";
    }
  };

  if (!content) return <>{children}</>;

  const tooltipEl = isVisible && (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: coords.top,
        left: coords.left,
      }}
    >
      <div
        className={`relative px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal break-words text-center max-w-xs ${className}`}
      >
        {content}

        {/* ✅ Arrow */}
        <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} />
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={triggerClassName || "inline-block"}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {isVisible && createPortal(tooltipEl, document.body)}
    </>
  );
};

export default Tooltip;
