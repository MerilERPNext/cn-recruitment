import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  type?: "default" | "custom";
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
  triggerClassName = "",
  delay = 200,
  type = "default",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTouchDevice = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      return false;
    }
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  };

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // IMPORTANT:
    // Since tooltip uses position: fixed,
    // getBoundingClientRect coordinates should be used directly.
    let top = 0;
    let left = 0;

    switch (position) {
      case "bottom":
        top = triggerRect.bottom + 8;
        left =
          triggerRect.left +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
        break;

      case "left":
        top =
          triggerRect.top +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;

      case "right":
        top =
          triggerRect.top +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
        left = triggerRect.right + 8;
        break;

      case "tl":
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left;
        break;

      case "tr":
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.right - tooltipRect.width;
        break;

      case "top":
      default:
        top = triggerRect.top - tooltipRect.height - 8;
        left =
          triggerRect.left +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
        break;
    }

    // Prevent viewport overflow
    const padding = 8;

    left = Math.max(
      padding,
      Math.min(
        left,
        window.innerWidth - tooltipRect.width - padding
      )
    );

    // If tooltip goes above screen, move below trigger
    if (top < padding) {
      top = triggerRect.bottom + 8;
    }

    // If tooltip goes below screen
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    setCoords({ top, left });
  }, [position]);

  useLayoutEffect(() => {
    if (!isVisible) return;

    calculatePosition();
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    if (!isVisible) return;

    const handleScroll = () => {
      calculatePosition();
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }

      setIsVisible(false);
    };

    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const show = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };


  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

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

  if (!content) {
    return <>{children}</>;
  }

  const tooltipEl = isVisible && (
    <div
      ref={tooltipRef}
      role="tooltip"
      className={`fixed z-[9999] ${type === "custom" ? "pointer-events-auto" : "pointer-events-none"
        }`}
      style={{
        top: coords.top,
        left: coords.left,
      }}
    >
      {type === "custom" ? (
        <div className={`relative ${className}`}>{content}</div>
      ) : (
        <div
          className={`relative px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal break-words text-center max-w-xs ${className}`}
        >
          {content}

          <div
            className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={triggerClassName || "inline-block"}
        onMouseEnter={() => {
          if (!isTouchDevice()) {
            show();
          }
        }}
        onMouseLeave={() => {
          if (!isTouchDevice()) {
            hide();
          }
        }}
        onFocus={() => {
          if (!isTouchDevice()) {
            show();
          }
        }}
        onBlur={() => {
          if (!isTouchDevice()) {
            hide();
          }
        }}
        onClick={(e) => {
          if (!isTouchDevice()) {
            return;
          }

          e.stopPropagation();

          setIsVisible((prev) => !prev);
        }}
      >
        {children}
      </div>

      {isVisible && createPortal(tooltipEl, document.body)}
    </>
  );
};

export default Tooltip;