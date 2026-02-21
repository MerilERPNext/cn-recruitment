import React, { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { User, Shield } from "lucide-react";

interface AllocatedToTooltipProps {
    users?: string;
    roles?: string[];
    children: ReactNode;
    position?: "top" | "bottom" | "left" | "right";
}

const AllocatedToTooltip: React.FC<AllocatedToTooltipProps> = ({
    users,
    roles,
    children,
    position = "top",
}) => {
    const usersStr = users != null ? String(users) : "";
    const hasUsers = !!usersStr.trim();
    const hasRoles = roles && roles.length > 0;
    const hasContent = hasUsers || hasRoles;

    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                top = triggerRect.bottom + scrollY + 10;
                left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
                break;
            case "left":
                top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
                left = triggerRect.left + scrollX - tooltipRect.width - 10;
                break;
            case "right":
                top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
                left = triggerRect.right + scrollX + 10;
                break;
            case "top":
            default:
                top = triggerRect.top + scrollY - tooltipRect.height - 10;
                left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
                break;
        }

        setCoords({ top, left });
    }, [position]);

    useEffect(() => {
        if (isVisible) {
            calculatePosition();
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

    const getArrowClasses = () => {
        switch (position) {
            case "bottom":
                return "bottom-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-white";
            case "left":
                return "left-full top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-white";
            case "right":
                return "right-full top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-white";
            case "top":
            default:
                return "top-full left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white";
        }
    };

    if (!hasContent) {
        return <>{children}</>;
    }

    const tooltipEl = isVisible && (
        <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999]"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
            <div
                className="
          bg-white rounded-xl shadow-xl
          border border-primary-100
          min-w-[200px] max-w-[280px]
          overflow-hidden
        "
            >
                {/* Header */}
                <div className="bg-primary-50 px-3.5 py-2 border-b border-primary-100">
                    <span className="text-[11px] font-brand font-semibold uppercase tracking-wider text-primary-700">
                        Allocated To
                    </span>
                </div>

                <div className="flex flex-col gap-2.5 p-3.5">
                    {/* Users Section */}
                    {hasUsers && (
                        <div className="flex items-start gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 shrink-0">
                                <User className="w-3.5 h-3.5 text-primary-600" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-gray-500">
                                    User
                                </span>
                                <span className="text-[13px] font-brand font-medium text-gray-900 leading-snug break-words">
                                    {usersStr}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Divider between sections */}
                    {hasUsers && hasRoles && (
                        <div className="border-t border-gray-10" />
                    )}

                    {/* Roles Section */}
                    {hasRoles && (
                        <div className="flex items-start gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary-50 shrink-0">
                                <Shield className="w-3.5 h-3.5 text-secondary-600" />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-[10px] font-brand font-semibold uppercase tracking-wider text-gray-500">
                                    {roles.length > 1 ? "Roles" : "Role"}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {roles.map((role, idx) => (
                                        <span
                                            key={idx}
                                            className="
                        inline-flex items-center
                        text-[11px] font-brand font-medium
                        text-secondary-700 bg-secondary-50
                        border border-secondary-200
                        px-2 py-0.5 rounded-md
                      "
                                        >
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Arrow */}
            <div
                className={`absolute w-0 h-0 ${getArrowClasses()}`}
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))" }}
            />
        </div>
    );

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-block"
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

export default AllocatedToTooltip;
