import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ApprovalStage } from "../../../types/expenseAdvance";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface ApprovalStageTooltipProps {
  stage: ApprovalStage;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "tl" | "tr";
}

const ApprovalStageTooltip: React.FC<ApprovalStageTooltipProps> = ({
  stage,
  children,
  position = "top",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchRef = useRef(false);

  const [actualPosition, setActualPosition] = useState(position);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const PADDING = 8;

    let resolvedPosition = position;

    // Check if it fits above the trigger
    const spaceAbove = triggerRect.top;
    if (
      (resolvedPosition === "top" ||
        resolvedPosition === "tl" ||
        resolvedPosition === "tr") &&
      spaceAbove < tooltipRect.height + PADDING
    ) {
      resolvedPosition = "bottom"; // Fallback to bottom if no space on top
    }

    setActualPosition(resolvedPosition);

    let top = 0;
    let left = 0;

    switch (resolvedPosition) {
      case "bottom":
        top = triggerRect.bottom + scrollY + PADDING;
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
        left = triggerRect.left + scrollX - tooltipRect.width - PADDING;
        break;
      case "right":
        top =
          triggerRect.top +
          scrollY +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
        left = triggerRect.right + scrollX + PADDING;
        break;
      case "tl":
        top = triggerRect.top + scrollY - tooltipRect.height - PADDING;
        left = triggerRect.left + scrollX;
        break;
      case "tr":
        top = triggerRect.top + scrollY - tooltipRect.height - PADDING;
        left =
          triggerRect.right + scrollX - tooltipRect.width + triggerRect.width;
        break;
      case "top":
      default:
        top = triggerRect.top + scrollY - tooltipRect.height - PADDING;
        left =
          triggerRect.left +
          scrollX +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
    }

    // Clamp horizontally to window bounds
    const maxLeft = vw + scrollX - tooltipRect.width - PADDING;
    const minLeft = scrollX + PADDING;
    const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

    // Clamp vertically (just in case)
    const maxTop = vh + scrollY - tooltipRect.height - PADDING;
    const minTop = scrollY + PADDING;
    top = Math.max(minTop, Math.min(top, maxTop));

    // Dynamic arrow positioning
    const triggerCenterX = triggerRect.left + scrollX + triggerRect.width / 2;
    let arrowLeft = triggerCenterX - clampedLeft;
    arrowLeft = Math.max(12, Math.min(arrowLeft, tooltipRect.width - 12));

    setCoords({ top, left: clampedLeft, arrowLeft });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => {
        calculatePosition();
      });

      window.addEventListener("scroll", calculatePosition, true);
      window.addEventListener("resize", calculatePosition);

      return () => {
        window.removeEventListener("scroll", calculatePosition, true);
        window.removeEventListener("resize", calculatePosition);
      };
    }
  }, [isVisible, calculatePosition]);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), 200);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const toggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible((v) => !v);
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isVisible]);

  const getArrowClasses = () => {
    switch (actualPosition) {
      case "bottom":
        return "bottom-full border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-white";
      case "left":
        return "left-full border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-white";
      case "right":
        return "right-full border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-white";
      case "tl":
      case "tr":
      case "top":
      default:
        return "top-full border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white";
    }
  };

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
      <div className="relative bg-white rounded-lg shadow-xl border border-primary-100 min-w-[150px] max-w-[240px]">
        <div className="bg-primary-50 px-2.5 py-1.5 border-b border-primary-100 rounded-t-lg">
          <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-primary-700">
            Stage Details
          </span>
        </div>
        <div className="flex flex-col text-left space-y-1.5 p-2.5 text-gray-800">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-semibold text-gray-500 tracking-wider leading-tight">
              Stage
            </span>
            <span className="font-medium text-xs text-gray-900 leading-tight">
              {stage.stage_name || "—"}
            </span>
          </div>

          {!stage.role && (
            <div className="flex flex-col mt-0.5">
              <span className="text-[9px] uppercase font-semibold text-gray-500 tracking-wider leading-tight">
                User
              </span>
              <span className="font-medium text-xs text-gray-900 leading-tight">
                {stage.user || "—"}
                {stage.employee_id ? (
                  <span className="text-gray-500 text-[10px] ml-1">
                    ({stage.employee_id})
                  </span>
                ) : (
                  ""
                )}
              </span>
            </div>
          )}

          <div className="flex flex-col mt-0.5">
            <span className="text-[9px] uppercase font-semibold text-gray-500 tracking-wider leading-tight">
              Role
            </span>
            <span className="font-medium text-xs text-gray-900 leading-tight">
              {stage?.role || stage?.designation_name || "—"}
            </span>
          </div>

          {stage.status !== "Pending" && (
            <div className="flex flex-col mt-0.5">
              <span className="text-[9px] uppercase font-semibold text-gray-500 tracking-wider leading-tight">
                Status
              </span>
              <span className="font-medium text-xs leading-tight">
                <span
                  className={
                    stage.status === "Approved"
                      ? "text-green-600"
                      : stage.status === "Rejected"
                        ? "text-red-600"
                        : "text-yellow-600"
                  }
                >
                  {stage.status}
                </span>
                <span className="text-gray-500 text-[10px] block mt-0.5">
                  on {formatToIndianDate(stage.approval_time || "—")}
                </span>
              </span>
            </div>
          )}
        </div>
        <div
          className={`absolute w-0 h-0 ${getArrowClasses()}`}
          style={{
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))",
            left:
              actualPosition === "top" ||
              actualPosition === "bottom" ||
              actualPosition === "tl" ||
              actualPosition === "tr"
                ? `${coords.arrowLeft}px`
                : undefined,
            marginLeft:
              actualPosition === "top" ||
              actualPosition === "bottom" ||
              actualPosition === "tl" ||
              actualPosition === "tr"
                ? "-6px"
                : undefined,
            top:
              actualPosition === "left" || actualPosition === "right"
                ? "50%"
                : undefined,
            marginTop:
              actualPosition === "left" || actualPosition === "right"
                ? "-6px"
                : undefined,
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block cursor-pointer"
        onMouseEnter={() => {
          if (!isTouchRef.current) show();
        }}
        onMouseLeave={() => {
          if (!isTouchRef.current) hide();
        }}
        onFocus={show}
        onBlur={hide}
        onTouchStart={() => {
          isTouchRef.current = true;
        }}
        onClick={toggle}
      >
        {children}
      </div>
      {isVisible && createPortal(tooltipEl, document.body)}
    </>
  );
};

export default ApprovalStageTooltip;
